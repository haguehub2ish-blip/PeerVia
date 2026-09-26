import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

// Same shell/tokens as the other Resend emails — primary #BC6C25, ink #241A12,
// surface #F8EFD9, badge #2B1B10. Serif/mono roles approximated with system
// fallbacks since custom @font-face is unreliable in inboxes.
function renderBookingRequestEmail({ mentorName, studentEmail, message, ctaUrl, ctaLabel }) {
  const messageHtml = message.replace(/\n/g, "<br/>");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>PeerVia</title>
</head>
<body style="margin:0; padding:0; background-color:#F1E7CC; font-family: Helvetica, Arial, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${studentEmail} wants to book a call with you on PeerVia.</div>
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
              <span style="display:inline-block; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#F8EFD9; background-color:#2B1B10; padding:5px 10px; border-radius:4px; font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;">New booking request</span>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 32px 0 32px;">
              <h1 style="margin:0; font-size:24px; line-height:1.28; color:#241A12; font-weight:700; letter-spacing:-0.01em; font-family: Georgia, 'Times New Roman', serif;">Someone wants to book a call, ${mentorName.split(" ")[0]}</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:10px 32px 0 32px;">
              <p style="margin:0; font-size:15px; line-height:1.6; color:#7A6952;">A student found you on PeerVia and would like to book time with you.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1E7CC; border:1px solid #E3D2AE; border-radius:6px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0 0 4px 0; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#7A6952; font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;">From</p>
                    <p style="margin:0; font-size:15px; line-height:1.5; color:#241A12;">${studentEmail}</p>
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
                    <p style="margin:0 0 4px 0; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#8A4E1B; font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;">Reason</p>
                    <p style="margin:0; font-size:15px; line-height:1.6; color:#241A12;">${messageHtml}</p>
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
                You're receiving this email because you're a verified mentor on PeerVia and this student found you through your profile. Replying directly to this email reaches ${studentEmail} as well.
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
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return Response.json({ error: "Invalid session" }, { status: 401 });
  }

  const { mentorId, email, message } = await request.json();
  if (!mentorId || !email || !message) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: mentor, error: mentorError } = await supabaseAdmin
    .from("mentorss")
    .select("name, user_id, available")
    .eq("id", mentorId)
    .single();

  if (mentorError || !mentor) {
    return Response.json({ error: "Mentor not found" }, { status: 404 });
  }
  if (!mentor.available) {
    return Response.json({ error: "This mentor isn't open for bookings right now." }, { status: 400 });
  }

  const { data: mentorUser, error: mentorUserError } = await supabaseAdmin.auth.admin.getUserById(mentor.user_id);
  if (mentorUserError || !mentorUser?.user?.email) {
    return Response.json({ error: "Could not find mentor's contact email" }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  const html = renderBookingRequestEmail({
    mentorName: mentor.name,
    studentEmail: email,
    message,
    ctaUrl: `${siteUrl}/mentor-account/dashboard`,
    ctaLabel: "View on your dashboard →",
  });

  try {
    await resend.emails.send({
      from: "PeerVia <info@peervia.org>",
      replyTo: "info.peervia@gmail.com",
      to: [mentorUser.user.email], // change once domain to peervia 1
      replyTo: email,
      subject: `New call request from ${email}`,
      html,
    });
  } catch (err) {
    return Response.json({ error: "Failed to send email: " + err.message }, { status: 500 });
  }

  return Response.json({ success: true });
}