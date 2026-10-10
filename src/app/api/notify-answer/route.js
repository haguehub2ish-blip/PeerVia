import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { renderEmail, paragraph, quoteBox, escapeHtml } from "@/lib/emailShell";
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

function renderAnswerEmail({ siteUrl, heading, intro, question, answer, mentorName, ctaUrl, ctaLabel, preheader }) {
  const nl = (t) => escapeHtml(t).replace(/\n/g, "<br />");
  return renderEmail({
    siteUrl,
    preheader,
    heading,
    greeting: "Hi,",
    bodyHtml:
      paragraph(intro) +
      quoteBox("The question", nl(question)) +
      quoteBox(`${escapeHtml(mentorName)}'s answer`, nl(answer)),
    ctaLabel,
    ctaUrl,
    footerNote: `You're receiving this because you have an account on PeerVia. You can change what you get emailed in your <a href="${siteUrl}/settings" style="color:#BC6C25;">notification settings</a>.`,
  });
}
// Shared, on-brand HTML shell for every "mentor answered" email.
// Colors/typography mirror the app's tokens (primary #BC6C25, ink #241A12,
// surface #F8EFD9, badge #2B1B10). Fraunces/Plex Mono are approximated with
// system serif/mono fallbacks since custom @font-face is unreliable in inboxes.
function renderAnswerEmailOld({ siteUrl, eyebrow, heading, intro, question, answer, mentorName, ctaUrl, ctaLabel, preheader }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>PeerVia</title>
</head>
<body style="margin:0; padding:0; background-color:#F1E7CC; font-family: Helvetica, Arial, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1E7CC; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#F8EFD9; border-radius:6px; overflow:hidden; border:1px solid #E3D2AE;">

          <tr>
            <td style="height:4px; background-color:#BC6C25; font-size:0; line-height:0;">&nbsp;</td>
          </tr>

          <tr>
            <td style="padding:30px 32px 0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:30px; height:30px; background-color:#2B1B10; border-radius:4px; text-align:center;">
                    <span style="color:#F8EFD9; font-size:15px; font-weight:800; line-height:30px; font-family: Georgia, 'Times New Roman', serif;">P</span>
                  </td>
                  <td style="padding-left:10px; font-size:16px; font-weight:700; color:#241A12; font-family: Georgia, 'Times New Roman', serif;">PeerVia</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px 0 32px;">
              <span style="display:inline-block; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#F8EFD9; background-color:#2B1B10; padding:5px 10px; border-radius:4px; font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;">${eyebrow}</span>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 32px 0 32px;">
              <h1 style="margin:0; font-size:24px; line-height:1.28; color:#241A12; font-weight:700; letter-spacing:-0.01em; font-family: Georgia, 'Times New Roman', serif;">${heading}</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:10px 32px 0 32px;">
              <p style="margin:0; font-size:15px; line-height:1.6; color:#7A6952;">${intro}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1E7CC; border:1px solid #E3D2AE; border-radius:6px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 6px 0; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#7A6952; font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;">Question</p>
                    <p style="margin:0; font-size:15px; line-height:1.55; color:#241A12;">${question}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3E4D3; border-radius:6px;">
                <tr>
                  <td style="width:3px; background-color:#BC6C25; font-size:0; line-height:0;">&nbsp;</td>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 8px 0; font-size:15px; line-height:1.6; color:#241A12;">${answer}</p>
                    <p style="margin:0; font-size:13px; font-weight:700; color:#8A4E1B;">— ${mentorName}, Verified Mentor</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 6px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:6px; background-color:#BC6C25;">
                    <a href="${ctaUrl}" style="display:inline-block; padding:12px 22px; font-size:14px; font-weight:700; color:#F8EFD9; text-decoration:none; border-radius:6px; font-family: Helvetica, Arial, sans-serif;">${ctaLabel}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 32px 28px 32px; border-top:1px solid #E3D2AE;">
              <p style="margin:0; font-size:12px; line-height:1.6; color:#9C8B72;">
                You're receiving this email because you have an active account on PeerVia. You can manage what you get notified about anytime in your
                <a href="${siteUrl}/settings" style="color:#BC6C25; text-decoration:underline;">notification settings</a>.
              </p>
              <p style="margin:12px 0 0 0; font-size:12px; color:#B7A98B;">© ${new Date().getFullYear()} PeerVia · By students, for students.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request) {
  const { userQuestionId, question, answer, mentorName, subject, country, askerUserId } =
    await request.json();

  if (!userQuestionId || !question || !answer) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const ctaUrl = `${siteUrl}/community#${userQuestionId}`;

  // Get all users from Supabase Auth
  const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

  if (usersError) {
    return Response.json({ error: usersError.message }, { status: 500 });
  }

  // Find users whose saved preferences match this question's subject/country
  const matchedUsers = usersData.users.filter((u) => {
    const prefs = u.user_metadata?.emailPreferences;
    if (!prefs) return false;

    const matchesField = prefs.fields?.includes(subject);
    const matchesCountry = prefs.countries?.includes(country);

    return matchesField || matchesCountry;
  });

  const sendResults = [];
  const notifiedEmails = new Set();

  // Notify the original asker, unless they've turned this off in Settings
  if (askerUserId) {
    const { data: askerData, error: askerError } = await supabaseAdmin.auth.admin.getUserById(askerUserId);
    const notifyOwnQuestions = askerData?.user?.user_metadata?.emailPreferences?.notifyOwnQuestions ?? true;

    if (!askerError && askerData?.user?.email && notifyOwnQuestions) {
      try {
        await resend.emails.send({
          from: "PeerVia <info@peervia.org>",
          replyTo: "info.peervia@gmail.com",
          to: askerData.user.email,
          subject: "A Mentor Answered Your Question On PeerVia",
          html: renderAnswerEmail({
            siteUrl,
            eyebrow: "Your question was answered",
            heading: "A mentor just replied",
            intro: "A verified mentor answered the question you asked on PeerVia.",
            question,
            answer,
            mentorName,
            ctaUrl,
            ctaLabel: "View on PeerVia →",
            preheader: `${mentorName} just answered your question on PeerVia.`,
          }),
        });
        notifiedEmails.add(askerData.user.email.toLowerCase());
        sendResults.push({ email: askerData.user.email, success: true, type: "asker" });
      } catch (err) {
        sendResults.push({ email: askerData.user.email, success: false, error: err.message, type: "asker" });
      }
    }
  }

  for (const u of matchedUsers) {
    if (notifiedEmails.has(u.email?.toLowerCase())) continue; // don't double-email the asker
    try {
      await resend.emails.send({
        from: "PeerVia <info@peervia.org>",
        replyTo: "info.peervia@gmail.com",
        to: u.email,
        subject: `A Mentor Just Answered A ${subject} Question On PeerVia`,
        html: renderAnswerEmail({
          siteUrl,
          eyebrow: "New answer on PeerVia",
          heading: `A new ${subject} question was answered`,
          intro: "A verified mentor just answered a question that matches your notification preferences.",
          question,
          answer,
          mentorName,
          ctaUrl,
          ctaLabel: "View on PeerVia →",
          preheader: `A verified mentor just answered a ${subject} question on PeerVia.`,
        }),
      });
      sendResults.push({ email: u.email, success: true, type: "preference" });
    } catch (err) {
      sendResults.push({ email: u.email, success: false, error: err.message, type: "preference" });
    }
  }

  return Response.json({ success: true, notified: sendResults.length, results: sendResults });
}