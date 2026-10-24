import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { renderEmail, paragraph, quoteBox, escapeHtml } from "@/lib/emailShell";
import { calcAge } from "@/lib/parentalConsent";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

// Set to false if you want only students aged 18+ to be able to message mentors.
const MINORS_CAN_MESSAGE = true;
const MAX_LENGTH = 1000; // characters per message
const MAX_PER_DAY = 30; // messages one student can send to one mentor per day
const EMAIL_EVERY_MINUTES = 30; // don't email the mentor again if they were emailed this recently

async function getStudent(request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return { error: Response.json({ error: "Please sign in to send a message.", code: "signin" }, { status: 401 }) };
  }
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return { error: Response.json({ error: "Please sign in to send a message.", code: "signin" }, { status: 401 }) };
  }
  return { user: data.user };
}

// Students must have confirmed their age, and under-18s need their parent's approval.
async function checkStudentAllowed(userId) {
  const { data: profile } = await supabaseAdmin
    .from("student_profiles")
    .select("date_of_birth, consent_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile) {
    return Response.json(
      { error: "Please confirm your age before sending a message.", code: "needs_age" },
      { status: 403 }
    );
  }

  const age = calcAge(profile.date_of_birth);
  if (age === null || age < 18) {
    if (!MINORS_CAN_MESSAGE) {
      return Response.json({ error: "Messaging is only available to students aged 18 and over." }, { status: 403 });
    }
    if (profile.consent_status !== "approved") {
      return Response.json(
        { error: "A parent or guardian needs to approve your account before you can send messages." },
        { status: 403 }
      );
    }
  }
  return null;
}

// Load the conversation between the signed-in student and one mentor.
export async function GET(request) {
  const { error: authError, user } = await getStudent(request);
  if (authError) return authError;

  const mentorId = new URL(request.url).searchParams.get("mentorId");
  if (!mentorId) return Response.json({ error: "Missing mentor" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("mentor_messages")
    .select("id, sender, body, created_at")
    .eq("mentor_id", String(mentorId))
    .eq("student_id", user.id)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return Response.json({ error: "Couldn't load your messages." }, { status: 500 });
  return Response.json({ messages: data || [] });
}

// Student sends a message to a mentor.
export async function POST(request) {
  const { error: authError, user } = await getStudent(request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const mentorId = body.mentorId;
  const text = String(body.message || "").trim();

  if (!mentorId) return Response.json({ error: "Missing mentor" }, { status: 400 });
  if (!text) return Response.json({ error: "Please write a message first." }, { status: 400 });
  if (text.length > MAX_LENGTH) {
    return Response.json({ error: `Please keep messages under ${MAX_LENGTH} characters.` }, { status: 400 });
  }

  const blocked = await checkStudentAllowed(user.id);
  if (blocked) return blocked;

  const { data: mentor } = await supabaseAdmin
    .from("mentorss")
    .select("name, user_id, available, activated")
    .eq("id", mentorId)
    .maybeSingle();

  if (!mentor || mentor.activated === false) {
    return Response.json({ error: "Mentor not found" }, { status: 404 });
  }
  if (!mentor.available) {
    return Response.json({ error: "This mentor isn't taking messages right now." }, { status: 400 });
  }
  if (mentor.user_id === user.id) {
    return Response.json({ error: "You can't message yourself." }, { status: 400 });
  }

  // Blocked users (blocked site-wide by PeerVia, or blocked by this mentor) can't send messages
  const { data: blockRows } = await supabaseAdmin
    .from("message_blocks")
    .select("mentor_id")
    .eq("user_id", user.id);
  const isBlocked = (blockRows || []).some((b) => b.mentor_id === null || b.mentor_id === String(mentorId));
  if (isBlocked) {
    return Response.json({ error: "You can't send messages to this mentor right now." }, { status: 403 });
  }

  // Daily limit, so nobody can flood a mentor
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: sentToday } = await supabaseAdmin
    .from("mentor_messages")
    .select("id", { count: "exact", head: true })
    .eq("mentor_id", String(mentorId))
    .eq("student_id", user.id)
    .eq("sender", "student")
    .gte("created_at", since);
  if ((sentToday || 0) >= MAX_PER_DAY) {
    return Response.json({ error: "You've sent a lot of messages today. Please try again tomorrow." }, { status: 429 });
  }

  // Was the mentor already notified recently? (avoids an email for every single message)
  const { data: lastMessage } = await supabaseAdmin
    .from("mentor_messages")
    .select("sender, created_at")
    .eq("mentor_id", String(mentorId))
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const studentFirstName = (user.user_metadata?.name || "").split(" ")[0] || null;

  const { data: saved, error: insertError } = await supabaseAdmin
    .from("mentor_messages")
    .insert({
      mentor_id: String(mentorId),
      student_id: user.id,
      sender: "student",
      body: text,
      student_name: studentFirstName,
    })
    .select("id, sender, body, created_at")
    .single();

  if (insertError) {
    return Response.json({ error: "Couldn't send your message. Please try again." }, { status: 500 });
  }

  const recentlyNotified =
    lastMessage &&
    lastMessage.sender === "student" &&
    Date.now() - new Date(lastMessage.created_at).getTime() < EMAIL_EVERY_MINUTES * 60 * 1000;

  if (!recentlyNotified) {
    try {
      const { data: mentorUser } = await supabaseAdmin.auth.admin.getUserById(mentor.user_id);
      const mentorEmail = mentorUser?.user?.email;
      if (mentorEmail) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
        const first = escapeHtml(mentor.name.split(" ")[0]);
        await resend.emails.send({
          from: "PeerVia <info@peervia.org>",
          to: [mentorEmail],
          // No replyTo on purpose: replies happen on PeerVia, so students' emails stay private.
          subject: `New message from ${studentFirstName || "a student"} on PeerVia`,
          html: renderEmail({
            siteUrl,
            preheader: text.slice(0, 110),
            heading: `${first}, you have a new message.`,
            greeting: `Hi ${first},`,
            bodyHtml:
              paragraph(`${escapeHtml(studentFirstName || "A student")} sent you a quick message on your PeerVia profile. You can answer from your mentor dashboard.`) +
              quoteBox("Their message", escapeHtml(text).replace(/\r?\n/g, "<br />")),
            ctaLabel: "Reply on your dashboard →",
            ctaUrl: `${siteUrl}/mentor-account/dashboard#messages`,
            footerNote: "You're receiving this because a student messaged you through your PeerVia profile.",
          }),
        });
      }
    } catch {
      // The message is saved either way; a failed email shouldn't block the student.
    }
  }

  return Response.json({ success: true, message: saved });
}