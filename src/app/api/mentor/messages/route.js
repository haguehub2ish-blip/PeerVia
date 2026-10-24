import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/adminAuth";
import { renderEmail, paragraph, quoteBox, escapeHtml } from "@/lib/emailShell";

const resend = new Resend(process.env.RESEND_API_KEY);

const MAX_LENGTH = 1000;
const EMAIL_EVERY_MINUTES = 30; // don't email the student again if they were emailed this recently

async function getMentor(request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return { error: Response.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return { error: Response.json({ error: "Invalid session" }, { status: 401 }) };
  }
  const { data: mentor } = await supabaseAdmin
    .from("mentorss")
    .select("id, name, user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!mentor) {
    return { error: Response.json({ error: "No mentor profile found" }, { status: 403 }) };
  }
  return { mentor };
}

// List this mentor's conversations (one per student), newest activity first.
export async function GET(request) {
  const { error: authError, mentor } = await getMentor(request);
  if (authError) return authError;

  const { data, error } = await supabaseAdmin
    .from("mentor_messages")
    .select("id, student_id, student_name, sender, body, created_at")
    .eq("mentor_id", String(mentor.id))
    .order("created_at", { ascending: true })
    .limit(1000);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const byStudent = new Map();
  for (const m of data || []) {
    if (!byStudent.has(m.student_id)) {
      byStudent.set(m.student_id, { student_id: m.student_id, student_name: null, messages: [] });
    }
    const convo = byStudent.get(m.student_id);
    if (m.student_name) convo.student_name = m.student_name;
    convo.messages.push({ id: m.id, sender: m.sender, body: m.body, created_at: m.created_at });
  }

  // Which of these students has this mentor blocked?
  const { data: blockRows } = await supabaseAdmin
    .from("message_blocks")
    .select("user_id")
    .eq("mentor_id", String(mentor.id));
  const blockedIds = new Set((blockRows || []).map((b) => b.user_id));

  const conversations = [...byStudent.values()]
    .map((c) => {
      const last = c.messages[c.messages.length - 1];
      return {
        ...c,
        student_name: c.student_name || "A student",
        needs_reply: last?.sender === "student" && !blockedIds.has(c.student_id),
        blocked: blockedIds.has(c.student_id),
        last_at: last?.created_at,
      };
    })
    .sort((a, b) => new Date(b.last_at) - new Date(a.last_at));

  return Response.json({ conversations });
}

// Mentor replies to a student.
export async function POST(request) {
  const { error: authError, mentor } = await getMentor(request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const studentId = body.studentId;
  const text = String(body.message || "").trim();

  if (!studentId) return Response.json({ error: "Missing student" }, { status: 400 });
  if (!text) return Response.json({ error: "Please write a message first." }, { status: 400 });
  if (text.length > MAX_LENGTH) {
    return Response.json({ error: `Please keep messages under ${MAX_LENGTH} characters.` }, { status: 400 });
  }

  // Mentors blocked site-wide by PeerVia can't reply
  const { data: ownBlocks } = await supabaseAdmin
    .from("message_blocks")
    .select("id")
    .eq("user_id", mentor.user_id)
    .is("mentor_id", null)
    .limit(1);
  if (ownBlocks && ownBlocks.length > 0) {
    return Response.json({ error: "You can't send messages right now." }, { status: 403 });
  }

  // Mentors can only reply to students who messaged them first
  const { data: lastMessage } = await supabaseAdmin
    .from("mentor_messages")
    .select("sender, created_at")
    .eq("mentor_id", String(mentor.id))
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastMessage) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  const { data: saved, error: insertError } = await supabaseAdmin
    .from("mentor_messages")
    .insert({
      mentor_id: String(mentor.id),
      student_id: studentId,
      sender: "mentor",
      body: text,
    })
    .select("id, sender, body, created_at")
    .single();

  if (insertError) {
    return Response.json({ error: "Couldn't send your reply. Please try again." }, { status: 500 });
  }

  const recentlyNotified =
    lastMessage.sender === "mentor" &&
    Date.now() - new Date(lastMessage.created_at).getTime() < EMAIL_EVERY_MINUTES * 60 * 1000;

  if (!recentlyNotified) {
    try {
      const { data: studentUser } = await supabaseAdmin.auth.admin.getUserById(studentId);
      const studentEmail = studentUser?.user?.email;
      if (studentEmail) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
        const mentorFirst = escapeHtml(mentor.name.split(" ")[0]);
        await resend.emails.send({
          from: "PeerVia <info@peervia.org>",
          to: [studentEmail],
          subject: `${mentor.name.split(" ")[0]} replied to your message on PeerVia`,
          html: renderEmail({
            siteUrl,
            preheader: text.slice(0, 110),
            heading: `${mentorFirst} replied to you.`,
            greeting: "Hi,",
            bodyHtml:
              paragraph(`${mentorFirst} answered your message on PeerVia.`) +
              quoteBox(`${mentorFirst}'s reply`, escapeHtml(text).replace(/\r?\n/g, "<br />")),
            ctaLabel: "Open the conversation →",
            ctaUrl: `${siteUrl}/mentors/${mentor.id}`,
            footerNote: "You're receiving this because you messaged a mentor on PeerVia.",
          }),
        });
      }
    } catch {
      // The reply is saved either way.
    }
  }

  return Response.json({ success: true, message: saved });
}