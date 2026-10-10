// Shared layout for every email PeerVia sends.
// Layout: logo + "Log in" pill on top, big headline, plain greeting, short text, one button.
// Colours match the website (ink #241A12, primary #BC6C25, cream #F1E7CC).

const INK = "#241A12";
const MUTED = "#7A6952";
const PRIMARY = "#BC6C25";
const PRIMARY_DARK = "#8A4E1B";
const BORDER = "#E3D2AE";
const PAGE_BG = "#F1E7CC";
const CARD_BG = "#FFFDF8";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Helvetica, Arial, sans-serif";

export function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// A normal paragraph of body text.
export function paragraph(html) {
  return `<p style="margin:0 0 16px 0; font-size:15px; line-height:1.65; color:${INK}; font-family:${SANS};">${html}</p>`;
}

// A soft rounded box for quoting a question, message or answer.
export function quoteBox(label, html) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0; border:1px solid ${BORDER}; border-radius:12px;">
    <tr>
      <td style="padding:16px 18px;">
        <p style="margin:0 0 6px 0; font-size:12px; font-weight:700; color:${PRIMARY_DARK}; font-family:${SANS};">${label}</p>
        <p style="margin:0; font-size:15px; line-height:1.65; color:${INK}; font-family:${SANS};">${html}</p>
      </td>
    </tr>
  </table>`;
}

export function renderEmail({
  siteUrl,
  preheader = "",
  heading,
  greeting = "",
  bodyHtml = "",
  ctaLabel = "",
  ctaUrl = "",
  headerButtonLabel = "Log in",
  headerButtonUrl,
  footerNote = "",
}) {
  const logoUrl = `${siteUrl}/email/logo-email.png`;
  const topButtonUrl = headerButtonUrl || `${siteUrl}/login`;
  const year = new Date().getFullYear();

  const cta = ctaLabel && ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 28px 0;">
        <tr>
          <td style="border-radius:999px; background-color:${PRIMARY};">
            <a href="${ctaUrl}" style="display:inline-block; padding:13px 28px; font-size:14px; font-weight:700; color:#FFFFFF; text-decoration:none; border-radius:999px; font-family:${SANS};">${ctaLabel}</a>
          </td>
        </tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>PeerVia</title>
</head>
<body style="margin:0; padding:0; background-color:${PAGE_BG};">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAGE_BG};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:${CARD_BG}; border-radius:12px;">
          <tr>
            <td style="padding:32px 32px 0 32px;">

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <a href="${siteUrl}" style="text-decoration:none;">
                      <img src="${logoUrl}" width="40" height="40" alt="PeerVia" style="display:inline-block; vertical-align:middle; border:0;" />
                      <span style="display:inline-block; vertical-align:middle; padding-left:10px; font-size:22px; font-weight:700; color:${INK}; font-family:${SERIF};">PeerVia</span>
                    </a>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <a href="${topButtonUrl}" style="display:inline-block; padding:10px 22px; font-size:12px; font-weight:700; color:#FFFFFF; background-color:${INK}; text-decoration:none; border-radius:999px; font-family:${SANS};">${headerButtonLabel}</a>
                  </td>
                </tr>
              </table>

              <h1 style="margin:44px 0 24px 0; font-size:30px; line-height:1.2; font-weight:700; letter-spacing:-0.01em; color:${INK}; font-family:${SERIF};">${heading}</h1>

              ${greeting ? paragraph(greeting) : ""}
              ${bodyHtml}
              ${cta}

              ${paragraph("Thanks,<br />The PeerVia team")}

            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px 32px;">
              <div style="border-top:1px solid ${BORDER}; padding-top:20px;">
                ${footerNote ? `<p style="margin:0 0 10px 0; font-size:12px; line-height:1.6; color:${MUTED}; font-family:${SANS};">${footerNote}</p>` : ""}
                <p style="margin:0; font-size:12px; color:${MUTED}; font-family:${SANS};">© ${year} PeerVia · By students, for students.</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}