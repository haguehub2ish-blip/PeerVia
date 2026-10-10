import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { renderEmail, paragraph, quoteBox, escapeHtml } from "@/lib/emailShell";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_EMAIL = "info.peervia@gmail.com";

export async function POST(request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return Response.json({ error: "Invalid session" }, { status: 401 });
  }

  const user = userData.user;
  if (user.user_metadata?.role !== "mentor") {
    return Response.json({ error: "Only mentors can send messages from here." }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const kind = body.kind === "Feedback" ? "Feedback" : "Question";
  const message = String(body.message || "").trim();

  if (!message) {
    return Response.json({ error: "Please write a message first." }, { status: 400 });
  }
  if (message.length > 5000) {
    return Response.json({ error: "That message is too long." }, { status: 400 });
  }

  const { data: mentor } = await supabaseAdmin
    .from("mentorss")
    .select("name, school")
    .eq("user_id", user.id)
    .maybeSingle();

  const name = mentor?.name || user.user_metadata?.name || "A mentor";
  const personalEmail = user.user_metadata?.personal_email || "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const subjectName = name.replace(/[\r\n]+/g, " ").slice(0, 80);

  const details = [
    `<strong>Email:</strong> ${escapeHtml(user.email)}`,
    personalEmail ? `<strong>Personal email:</strong> ${escapeHtml(personalEmail)}` : "",
    mentor?.school ? `<strong>University:</strong> ${escapeHtml(mentor.school)}` : "",
  ]
    .filter(Boolean)
    .join("<br />");

  const { error: sendError } = await resend.emails.send({
    from: "PeerVia <info@peervia.org>",
    to: ADMIN_EMAIL,
    replyTo: user.email,
    subject: `Mentor ${kind.toLowerCase()} from ${subjectName}`,
    html: renderEmail({
      siteUrl,
      preheader: `${name}: ${message}`.slice(0, 110),
      heading: `A mentor sent you ${kind === "Feedback" ? "feedback" : "a question"}.`,
      greeting: "Hi Guru,",
      bodyHtml:
        paragraph(`<strong>${escapeHtml(name)}</strong> wrote this from their mentor dashboard. Reply to this email to answer them.`) +
        quoteBox(kind, escapeHtml(message).replace(/\r?\n/g, "<br />")) +
        paragraph(details),
      footerNote: "Sent automatically from the mentor dashboard on PeerVia.",
    }),
  });

  if (sendError) {
    return Response.json({ error: "Couldn't send your message. Please try again." }, { status: 500 });
  }

  return Response.json({ success: true });
}