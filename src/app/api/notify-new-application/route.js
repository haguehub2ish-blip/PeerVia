import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Same shell/tokens as the other Resend emails — primary #BC6C25, ink #241A12,
// surface #F8EFD9, badge #2B1B10. Serif/mono roles approximated with system
// fallbacks since custom @font-face is unreliable in inboxes.
function renderNewApplicationEmail({ firstName, lastName, email, university, field, country, ctaUrl }) {
  const rows = [
    { label: "Name", value: `${firstName} ${lastName}` },
    { label: "Email", value: email },
    { label: "University", value: university },
    { label: "Field", value: field },
    { label: "Country", value: country },
  ];

  const rowsHtml = rows
    .map(
      (row, i) => `
                <tr>
                  <td style="padding:${i === 0 ? "14px" : "12px"} 18px ${i === rows.length - 1 ? "14px" : "12px"} 18px; ${i > 0 ? "border-top:1px solid #E3D2AE;" : ""}">
                    <p style="margin:0 0 4px 0; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#7A6952; font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;">${row.label}</p>
                    <p style="margin:0; font-size:15px; line-height:1.5; color:#241A12;">${row.value}</p>
                  </td>
                </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>PeerVia</title>
</head>
<body style="margin:0; padding:0; background-color:#F1E7CC; font-family: Helvetica, Arial, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${firstName} ${lastName} just applied to become a PeerVia mentor.</div>
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
              <span style="display:inline-block; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#F8EFD9; background-color:#2B1B10; padding:5px 10px; border-radius:4px; font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;">New mentor application</span>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 32px 0 32px;">
              <h1 style="margin:0; font-size:24px; line-height:1.28; color:#241A12; font-weight:700; letter-spacing:-0.01em; font-family: Georgia, 'Times New Roman', serif;">${firstName} ${lastName} wants to mentor</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:10px 32px 0 32px;">
              <p style="margin:0; font-size:15px; line-height:1.6; color:#7A6952;">A new mentor application just came in on PeerVia. Review it and approve or decline from the admin dashboard.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1E7CC; border:1px solid #E3D2AE; border-radius:6px;">
                ${rowsHtml}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 6px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:6px; background-color:#BC6C25;">
                    <a href="${ctaUrl}" style="display:inline-block; padding:12px 22px; font-size:14px; font-weight:700; color:#F8EFD9; text-decoration:none; border-radius:6px; font-family: Helvetica, Arial, sans-serif;">Review application →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 32px 28px 32px; border-top:1px solid #E3D2AE;">
              <p style="margin:0; font-size:12px; line-height:1.6; color:#9C8B72;">
                Sent automatically whenever someone submits the mentor application form on PeerVia.
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
  const { firstName, lastName, email, university, field, country } = await request.json();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  try {
    await resend.emails.send({
      from: "PeerVia <info@peervia.org>",
      to: "info.peervia@gmail.com",
      subject: `New Mentor Application: ${firstName} ${lastName}`,
      html: renderNewApplicationEmail({
        firstName,
        lastName,
        email,
        university,
        field,
        country,
        ctaUrl: `${siteUrl}/admin/applications`,
      }),
    });
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}