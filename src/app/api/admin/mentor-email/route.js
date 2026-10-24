import { Resend } from "resend";
import { requireAdmin, supabaseAdmin } from "@/lib/adminAuth";
import { renderEmail, paragraph, escapeHtml } from "@/lib/emailShell";

const resend = new Resend(process.env.RESEND_API_KEY);

// Turns the admin's plain text into paragraphs (blank line = new paragraph, single line break = <br />).
function messageToHtml(text) {
  return String(text)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => paragraph(escapeHtml(block).replace(/\n/g, "<br />")))
    .join("");
}

async function handlePost(request) {
  const { error: authError, user } = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  const subject = String(body.subject || "").trim().slice(0, 150);
  const heading = String(body.heading || "").trim().slice(0, 120) || subject;
  const message = String(body.message || "").trim().slice(0, 8000);
  const ctaLabel = String(body.ctaLabel || "").trim().slice(0, 60);
  const rawCtaUrl = String(body.ctaUrl || "").trim();
  const testOnly = Boolean(body.testOnly);
  const mentorIds = Array.isArray(body.mentorIds) ? body.mentorIds : [];

  if (!subject) return Response.json({ error: "Please write a subject." }, { status: 400 });
  if (!message) return Response.json({ error: "Please write a message." }, { status: 400 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  // Button link: either a path on the site (/mentor-account/dashboard) or a full https:// link
  let ctaUrl = "";
  if (rawCtaUrl) {
    if (rawCtaUrl.startsWith("/")) ctaUrl = siteUrl + rawCtaUrl;
    else if (/^https?:\/\//i.test(rawCtaUrl)) ctaUrl = rawCtaUrl;
    else return Response.json({ error: "The button link must start with / or https://" }, { status: 400 });
  }
  if ((ctaLabel && !ctaUrl) || (!ctaLabel && ctaUrl)) {
    return Response.json({ error: "A button needs both a label and a link (or leave both empty)." }, { status: 400 });
  }

  const buildEmail = (to, firstName) => ({
    from: "PeerVia <info@peervia.org>",
    replyTo: "info@peervia.org",
    to,
    subject,
    html: renderEmail({
      siteUrl,
      preheader: subject,
      heading: escapeHtml(heading),
      greeting: `Hi ${escapeHtml(firstName || "there")},`,
      bodyHtml: messageToHtml(message),
      ctaLabel: ctaLabel ? escapeHtml(ctaLabel) : "",
      ctaUrl: ctaUrl ? escapeHtml(ctaUrl) : "",
      headerButtonLabel: "Dashboard",
      headerButtonUrl: `${siteUrl}/mentor-account/dashboard`,
      footerNote: `You're receiving this because you're a mentor on PeerVia. <a href="${siteUrl}/unsubscribe" style="color:#BC6C25;">Unsubscribe from these emails</a> (you'll need to log in).`,
    }),
  });

  // Test mode: only send one copy to the admin who is logged in
  if (testOnly) {
    if (!user.email) return Response.json({ error: "Your account has no email address." }, { status: 400 });
    const { error } = await resend.emails.send(buildEmail(user.email, "there"));
    if (error) return Response.json({ error: error.message || "Could not send the test email." }, { status: 500 });
    return Response.json({ success: true, sent: 1, test: true, to: user.email });
  }

  if (mentorIds.length === 0) {
    return Response.json({ error: "No recipients selected." }, { status: 400 });
  }

  const { data: mentors, error: mentorError } = await supabaseAdmin
    .from("mentorss")
    .select("*")
    .in("id", mentorIds);
  if (mentorError) return Response.json({ error: mentorError.message }, { status: 500 });

  // Only real, activated mentors with a login (never the hidden test mentor)
  const eligible = (mentors || []).filter((m) => m.user_id && m.activated && !m.admin_only);

  // Look up each mentor's login email (a few at a time)
  const recipients = [];
  for (let i = 0; i < eligible.length; i += 10) {
    const chunk = eligible.slice(i, i + 10);
    const found = await Promise.all(
      chunk.map(async (m) => {
        try {
          const { data } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
          if (data?.user?.user_metadata?.emailPreferences?.announcements === false) return null;
          const email = data?.user?.email;
          return email ? { email, firstName: (m.name || "").split(" ")[0] } : null;
        } catch {
          return null;
        }
      })
    );
    recipients.push(...found.filter(Boolean));
  }

  // Never send the same address twice
  const seen = new Set();
  const unique = recipients.filter((r) => {
    const key = r.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length === 0) {
    return Response.json({ error: "None of the selected mentors have an email address on file." }, { status: 400 });
  }

  // Resend accepts up to 100 emails per batch. Each mentor gets their own email (nobody sees other addresses).
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    try {
      const { error } = await resend.batch.send(chunk.map((r) => buildEmail(r.email, r.firstName)));
      if (error) {
        console.error("Mentor email batch failed:", error);
        failed += chunk.length;
      } else {
        sent += chunk.length;
      }
    } catch (err) {
      console.error("Mentor email batch failed:", err);
      failed += chunk.length;
    }
  }

  return Response.json({ success: failed === 0, sent, failed, skipped: mentorIds.length - unique.length });
}

export async function POST(request) {
  try {
    return await handlePost(request);
  } catch (err) {
    console.error("Mentor email route crashed:", err);
    return Response.json({ error: `Server error: ${err?.message || err}` }, { status: 500 });
  }
}