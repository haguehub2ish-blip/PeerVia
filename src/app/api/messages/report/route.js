import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/adminAuth";
import { renderEmail, paragraph, quoteBox, escapeHtml } from "@/lib/emailShell";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = "info.peervia@gmail.com";

// A student or a mentor reports a conversation. The PeerVia team gets an email with the recent messages.
export async function POST(request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return Response.json({ error: "Please sign in." }, { status: 401 });

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) return Response.json({ error: "Invalid session" }, { status: 401 });
  const user = userData.user;

  const body = await request.json().catch(() => ({}));
  const reason = String(body.reason || "").trim().slice(0, 500);

  // Work out who is reporting: a mentor (reporting a student) or a student (reporting a mentor)
  const { data: ownMentor } = await supabaseAdmin
    .from("mentorss")
    .select("id, name")
    .eq("user_id", user.id)
    .maybeSingle();

  const reportedBy = ownMentor ? "mentor" : "student";
  const mentorId = ownMentor ? String(ownMentor.id) : String(body.mentorId || "");
  const studentId = ownMentor ? body.studentId : user.id;

  if (ownMentor && !studentId) {
    return Response.json(
      { error: "Mentors can report a student from the Messages inbox on their dashboard." },
      { status: 400 }
    );
  }
  if (!mentorId || !studentId) return Response.json({ error: "Missing conversation" }, { status: 400 });

  // The conversation must exist, and we grab the latest messages for the team to read
  const { data: recent } = await supabaseAdmin
    .from("mentor_messages")
    .select("sender, body, student_name, created_at")
    .eq("mentor_id", mentorId)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(20);

  const hasMessages = recent && recent.length > 0;
  if (!hasMessages) {
    // Students can still report a mentor they haven't messaged, as long as they explain why
    if (reportedBy !== "student") {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }
    if (reason.length < 3) {
      return Response.json({ error: "Please tell us what the problem is." }, { status: 400 });
    }
  }

  // Don't create duplicate reports within the same hour
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabaseAdmin
    .from("message_reports")
    .select("id")
    .eq("mentor_id", mentorId)
    .eq("student_id", studentId)
    .eq("reported_by", reportedBy)
    .gte("created_at", hourAgo)
    .limit(1);
  if (existing && existing.length > 0) return Response.json({ success: true });

  const { error: insertError } = await supabaseAdmin.from("message_reports").insert({
    mentor_id: mentorId,
    student_id: studentId,
    reported_by: reportedBy,
    reason: reason || null,
  });
  if (insertError) return Response.json({ error: "Couldn't send your report. Please try again." }, { status: 500 });

  // Email the team
  try {
    const { data: mentorRow } = await supabaseAdmin
      .from("mentorss")
      .select("name")
      .eq("id", mentorId)
      .maybeSingle();
    const studentName =
      recent.find((m) => m.student_name)?.student_name ||
      (reportedBy === "student" ? user.user_metadata?.name : null) ||
      "A student";
    const mentorName = mentorRow?.name || "A mentor";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

    const transcript = [...recent]
      .reverse()
      .map((m) => {
        const who = m.sender === "mentor" ? mentorName : studentName;
        const time = new Date(m.created_at).toISOString().replace("T", " ").slice(0, 16);
        return `<strong>${escapeHtml(who)}</strong> (${time} UTC): ${escapeHtml(m.body).replace(/\r?\n/g, "<br />")}`;
      })
      .join("<br /><br />");

    await resend.emails.send({
      from: "PeerVia <info@peervia.org>",
      to: ADMIN_EMAIL,
      subject: `Message report: ${reportedBy === "student" ? studentName + " reported " + mentorName : mentorName + " reported " + studentName}`,
      html: renderEmail({
        siteUrl,
        preheader: `A ${reportedBy} reported a conversation.`,
        heading: "A conversation was reported.",
        greeting: "Hi Team,",
        bodyHtml:
          paragraph(`The <strong>${reportedBy}</strong> reported this conversation between <strong>${escapeHtml(mentorName)}</strong> (mentor id ${escapeHtml(mentorId)}) and <strong>${escapeHtml(studentName)}</strong> (student id ${escapeHtml(String(studentId))}).`) +
          quoteBox("Reason given", reason ? escapeHtml(reason).replace(/\r?\n/g, "<br />") : "<em>No reason given</em>") +
          quoteBox("Last messages (oldest first)", transcript || "<em>No messages have been exchanged.</em>"),
        ctaLabel: "Review and block in admin →",
        ctaUrl: `${siteUrl}/admin/messages`,
        footerNote: "Sent automatically when someone reports a message conversation on PeerVia.",
      }),
    });
  } catch {
    // The report is saved in the database either way.
  }

  return Response.json({ success: true });
}