import { createClient } from "@supabase/supabase-js";
import { renderEmail, paragraph, escapeHtml } from "@/lib/emailShell";
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


function renderApprovedEmail({ siteUrl, firstName, university, field, ctaUrl }) {
  return renderEmail({
    siteUrl,
    preheader: "Your PeerVia mentor application has been approved.",
    heading: "You're now a PeerVia mentor.",
    greeting: `Hi ${escapeHtml(firstName)},`,
    bodyHtml:
      paragraph(`Your application as a ${escapeHtml(field)} mentor from ${escapeHtml(university)} has been approved. You already have a PeerVia account, so there's nothing to set up. Log in as usual and your mentor dashboard will be there.`) +
      paragraph(`Before your first call, please read the <a href="${siteUrl}/documents/PeerVia-Ambassador-Guide.pdf" style="color:#BC6C25;">Ambassador Guide</a> and the <a href="${siteUrl}/documents/PeerVia-Ambassador-Privacy-Policy.pdf" style="color:#BC6C25;">Privacy Policy</a>.`),
    ctaLabel: "Log in to PeerVia",
    ctaUrl,
    footerNote: "You're receiving this because you applied to become a mentor on PeerVia.",
  });
}
// Same shell/tokens as notify-answer's renderAnswerEmail — primary #BC6C25,
// ink #241A12, surface #F8EFD9, badge #2B1B10. Serif/mono roles approximated
// with system fallbacks since custom @font-face is unreliable in inboxes.
function renderApprovedEmailOld({ siteUrl, firstName, university, field, ctaUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>PeerVia</title>
</head>
<body style="margin:0; padding:0; background-color:#F1E7CC; font-family: Helvetica, Arial, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">You're officially a verified PeerVia mentor — log in to see your dashboard.</div>
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
              <span style="display:inline-block; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#F8EFD9; background-color:#2B1B10; padding:5px 10px; border-radius:4px; font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;">Mentor application approved</span>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 32px 0 32px;">
              <h1 style="margin:0; font-size:24px; line-height:1.28; color:#241A12; font-weight:700; letter-spacing:-0.01em; font-family: Georgia, 'Times New Roman', serif;">Congratulations, ${firstName}!</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:10px 32px 0 32px;">
              <p style="margin:0; font-size:15px; line-height:1.6; color:#7A6952;">Your application to become a PeerVia mentor has been approved. Since you already have an account, just log in as usual to reach your new Mentor Dashboard.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1E7CC; border:1px solid #E3D2AE; border-radius:6px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0 0 4px 0; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#7A6952; font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;">University</p>
                    <p style="margin:0; font-size:15px; line-height:1.5; color:#241A12;">${university}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 18px 14px 18px; border-top:1px solid #E3D2AE; padding-top:12px;">
                    <p style="margin:0 0 4px 0; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#7A6952; font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;">Field</p>
                    <p style="margin:0; font-size:15px; line-height:1.5; color:#241A12;">${field}</p>
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
                    <a href="${ctaUrl}" style="display:inline-block; padding:12px 22px; font-size:14px; font-weight:700; color:#F8EFD9; text-decoration:none; border-radius:6px; font-family: Helvetica, Arial, sans-serif;">Log in to PeerVia →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <tr>
            <td style="padding:22px 32px 0 32px;">
              <p style="margin:0 0 8px 0; font-size:13px; line-height:1.6; color:#7A6952;">Please keep these two documents handy:</p>
              <p style="margin:0; font-size:14px; line-height:1.9;">
                <a href="${siteUrl}/documents/PeerVia-Ambassador-Guide.pdf" style="color:#BC6C25;">Ambassador Guide and Rules</a><br />
                <a href="${siteUrl}/documents/PeerVia-Ambassador-Privacy-Policy.pdf" style="color:#BC6C25;">Privacy Policy and Liability Disclaimer</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 32px 28px 32px; border-top:1px solid #E3D2AE;">
              <p style="margin:0; font-size:12px; line-height:1.6; color:#9C8B72;">
                You're receiving this email because you applied to become a mentor on PeerVia.
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

  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim());
  if (!adminEmails.includes(userData.user.email)) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const { id, status, application } = await request.json();

  if (!id || !status) {
    return Response.json({ error: "Missing id or status" }, { status: 400 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("mentor_applications")
    .update({ status })
    .eq("id", id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  // If approved, create a real login account and add them as a mentor
  if (status === "approved" && application) {
    const countryMap = { Netherlands: "NL", "United Kingdom": "UK" };
    const initials = `${application.first_name?.[0] || ""}${application.last_name?.[0] || ""}`.toUpperCase();
    const fullName = `${application.first_name} ${application.last_name}`;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

    let newUserId;
    let isExistingUser = false;

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      application.email,
      {
        data: { name: fullName, role: "mentor", personal_email: application.backup_email || "" },
        redirectTo: `${siteUrl}/mentor-account/set-password`,
      }
    );

    if (inviteError) {
      // If the email is already registered, upgrade their existing account instead
      if (inviteError.message?.toLowerCase().includes("already been registered") || inviteError.message?.toLowerCase().includes("already registered")) {
        const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          perPage: 1000,
        });

        if (listError) {
          return Response.json({ error: listError.message }, { status: 500 });
        }

        const existingUser = usersList.users.find(
          (u) => u.email?.toLowerCase() === application.email.toLowerCase()
        );

        if (!existingUser) {
          return Response.json({ error: "Email marked as registered but user not found." }, { status: 500 });
        }

        const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          {
            user_metadata: {
  ...existingUser.user_metadata,
  name: fullName,
  role: "mentor",
  personal_email: application.backup_email || "",
},
          }
        );

        if (updateError) {
          return Response.json({ error: updateError.message }, { status: 500 });
        }

        newUserId = existingUser.id;
        isExistingUser = true;
      } else {
        return Response.json({ error: inviteError.message }, { status: 500 });
      }
    } else {
      newUserId = inviteData.user.id;
    }

    const applicantLanguages = application.languages
      ? application.languages.split(",")
      : ["English"];

     const { error: insertError } = await supabaseAdmin.from("mentorss").insert([
      {
        user_id: newUserId,
        name: fullName,
        initials,
        photo_url: application.photo_url || null,
        school: application.university,
        year: application.year,
        verified: true,
        subject: application.field,
        country: countryMap[application.country] || application.country,
        languages: applicantLanguages,
        bio: application.why,
        extracurriculars: application.extracurriculars || null,
                final_grade: application.final_grade || null,
        support_guidance: application.support_guidance || null,
        sessions: 0,
        answers: 0,
        rating: 0,
        available: true,
      },
    ]);

   if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 });
    }

    if (isExistingUser) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "PeerVia <info@peervia.org>",
          replyTo: "info.peervia@gmail.com",
          to: application.email,
          subject: "You've Been Approved As A PeerVia Mentor 🎉",
          html: renderApprovedEmail({
            siteUrl,
            firstName: application.first_name,
            university: application.university,
            field: application.field,
            ctaUrl: `${siteUrl}/login`,
          }),
        });
      } catch (emailErr) {
        console.error("Failed to send existing-user approval email:", emailErr);
      }
    }
  }

  return Response.json({ success: true });
}