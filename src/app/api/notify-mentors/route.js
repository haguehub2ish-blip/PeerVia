import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { renderEmail, paragraph, quoteBox, escapeHtml } from "@/lib/emailShell";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

// If the student doesn't pick a field, email every mentor? Set to false to email nobody.
const EMAIL_ALL_MENTORS_WHEN_NO_FIELD = false;

export async function POST(request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return Response.json({ error: "Invalid session" }, { status: 401 });
  }

  const { questionId } = await request.json();
  if (!questionId) {
    return Response.json({ error: "Missing questionId" }, { status: 400 });
  }

  const { data: q, error: qError } = await supabaseAdmin
    .from("user_questions")
    .select("id, user_id, question, subject")
    .eq("id", questionId)
    .single();

  if (qError || !q) {
    return Response.json({ error: "Question not found" }, { status: 404 });
  }
  if (q.user_id !== userData.user.id) {
    return Response.json({ error: "Not your question" }, { status: 403 });
  }

  // Claim the question so these emails can only ever go out once
  const { data: claimed } = await supabaseAdmin
    .from("user_questions")
    .update({ mentors_notified_at: new Date().toISOString() })
    .eq("id", q.id)
    .is("mentors_notified_at", null)
    .select("id");

  if (!claimed?.length) {
    return Response.json({ success: true, notified: 0, note: "Already sent" });
  }

  const questionSubjects = (q.subject || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (questionSubjects.length === 0 && !EMAIL_ALL_MENTORS_WHEN_NO_FIELD) {
    return Response.json({ success: true, notified: 0 });
  }

  const { data: mentors } = await supabaseAdmin
    .from("mentorss")
    .select("user_id, name, subject");

  const matched = (mentors || []).filter(
    (m) =>
      m.user_id &&
      m.user_id !== q.user_id &&
      (questionSubjects.length === 0 ||
        questionSubjects.includes((m.subject || "").trim().toLowerCase()))
  );

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const fieldLabel = q.subject ? q.subject.split(",").map((s) => s.trim()).join(", ") : "";
  const shortQuestion = q.question.length > 600 ? q.question.slice(0, 600) + "…" : q.question;
  const nl = (t) => escapeHtml(t).replace(/\n/g, "<br />");

  let notified = 0;

  for (const m of matched) {
    try {
      const { data: mentorUser } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
      const mentorAccount = mentorUser?.user;
      if (!mentorAccount?.email) continue;

      // On by default: only skipped if the mentor switched it off in their dashboard
      if (mentorAccount.user_metadata?.mentorEmailNotifications === false) continue;

      const firstName = (m.name || "").split(" ")[0] || "there";

      await resend.emails.send({
        from: "PeerVia <info@peervia.org>",
        replyTo: "info.peervia@gmail.com",
        to: mentorAccount.email,
        subject: fieldLabel
          ? `New ${fieldLabel} question on PeerVia`
          : "New question on PeerVia",
        html: renderEmail({
          siteUrl,
          preheader: "A student just asked a question on the PeerVia community.",
          heading: fieldLabel ? `A new ${escapeHtml(fieldLabel)} question` : "A new community question",
          greeting: `Hi ${escapeHtml(firstName)},`,
          bodyHtml:
            paragraph("A student just posted a question on the PeerVia community that matches your field.") +
            quoteBox("The question", nl(shortQuestion)),
          ctaLabel: "Answer in your dashboard →",
          ctaUrl: `${siteUrl}/mentor-account/dashboard`,
          footerNote: `You're receiving this because you're a mentor on PeerVia. You can turn these emails off any time in your <a href="${siteUrl}/mentor-account/dashboard" style="color:#BC6C25;">mentor dashboard</a>, under Community.`,
        }),
      });
      notified += 1;
    } catch (err) {
      console.error("Mentor email failed:", err);
    }
  }

  return Response.json({ success: true, notified });
}