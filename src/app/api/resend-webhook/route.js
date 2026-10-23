import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { renderEmail, paragraph, escapeHtml } from "@/lib/emailShell";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);
// Full-access key, used ONLY to read the original bounced email
const resendAdmin = new Resend(process.env.RESEND_FULL_ACCESS_KEY);

const ADMIN_EMAIL = "info.peervia@gmail.com";

// Checks that the request really comes from Resend (signed with your webhook secret).
function verifySignature(payload, headers, secret) {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatureHeader = headers.get("svix-signature");
  if (!secret || !id || !timestamp || !signatureHeader) return false;

  // reject requests older than 5 minutes
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto
    .createHmac("sha256", key)
    .update(`${id}.${timestamp}.${payload}`)
    .digest("base64");

  return signatureHeader.split(" ").some((part) => {
    const sig = part.split(",")[1];
    if (!sig) return false;
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

// Finds a personal email to fall back on for a bounced address.
// The email a mentor set on their dashboard wins, then the application's backup email.
async function findFallbackEmail(address, app) {
  const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const mentorUser = usersList?.users?.find(
    (u) => u.email?.toLowerCase() === address.toLowerCase() && u.user_metadata?.role === "mentor"
  );
  const meta = mentorUser?.user_metadata;
  if (meta && "personal_email" in meta) return meta.personal_email || null;
  return app?.backup_email || null;
}

export async function POST(request) {
  const payload = await request.text();

  if (!verifySignature(payload, request.headers, process.env.RESEND_WEBHOOK_SECRET)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(payload);

  // Only care about bounces
  if (event.type !== "email.bounced" && event.type !== "email.suppressed") {
    return Response.json({ ok: true, ignored: event.type });
  }

  const recipients = Array.isArray(event.data?.to) ? event.data.to : [event.data?.to];
  const subject = event.data?.subject || "(no subject)";
  const reason = event.data?.bounce?.message || event.data?.suppressed?.message || "No reason given";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

    for (const address of recipients) {
    if (!address || address.toLowerCase() === ADMIN_EMAIL || subject.startsWith("Action needed: ")) continue; // avoid loops

    // Is this address a mentor applicant? If so, we may have a backup email.
    const { data: app } = await supabaseAdmin
      .from("mentor_applications")
      .select("first_name, last_name, backup_email")
      .eq("email", address)
      .limit(1)
      .maybeSingle();

    // Try to resend the original email to their personal address.
    // The "(Resent)" subject prefix stops this from ever looping.
    let resentTo = null;
    const alreadyResent = subject.startsWith("(Resent) ");
    const fallback = alreadyResent ? null : await findFallbackEmail(address, app);

    if (fallback && fallback.toLowerCase() !== address.toLowerCase() && event.data?.email_id) {
           try {
        let html = null;
        let replyTo = null;
        let fallbackSubject = subject;

        // 1) Try to copy the original email
        try {
          const { data: original, error: getError } = await resendAdmin.emails.get(event.data.email_id);
          if (!getError && original?.html) {
            html = original.html;
            replyTo = original.reply_to || original.replyTo;
            fallbackSubject = original.subject || subject;
          } else {
            console.error("Could not copy original email:", getError?.message || "no html");
          }
        } catch (e) {
          console.error("Could not copy original email:", e);
        }

        // 2) If copying failed (e.g. email was sent by Supabase Auth), build a fresh set-up link
        if (!html) {
          const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email: address,
            options: { redirectTo: `${siteUrl}/mentor-account/set-password` },
          });
          const link = linkData?.properties?.action_link;
          if (linkError || !link) {
            throw new Error(linkError?.message || "Could not generate a set-up link");
          }
          fallbackSubject = "Set up your PeerVia mentor account";
          html = renderEmail({
            siteUrl,
            preheader: "Set up your PeerVia mentor account.",
            heading: "Set up your mentor account.",
            greeting: `Hi ${escapeHtml(app?.first_name || "there")},`,
            bodyHtml: paragraph(
              "Your PeerVia mentor application was approved. Click the button below to choose a password and activate your account."
            ),
            ctaLabel: "Set my password",
            ctaUrl: link,
          });
        }

        const { error: sendError } = await resend.emails.send({
          from: "PeerVia <info@peervia.org>",
          to: fallback,
          ...(replyTo ? { replyTo } : {}),
          subject: `(Resent) ${fallbackSubject}`,
          html,
        });
        if (sendError) throw new Error(sendError.message);
        resentTo = fallback;
      } catch (err) {
        console.error("Fallback resend failed:", err);
      }
    }

    // If the address was suppressed, tell the applicant their university email isn't valid.
    // It goes to their backup email, since the university address can't receive mail.
    let noticeNote = "";
    if (
      (event.type === "email.suppressed" ||
        (event.type === "email.bounced" && event.data?.bounce?.type !== "Transient")) &&
      app &&
      fallback &&
      fallback.toLowerCase() !== address.toLowerCase()
    ) {
      const listStyle = "margin:0 0 16px 20px; padding:0; font-size:15px; line-height:1.65; color:#241A12; font-family:Helvetica, Arial, sans-serif;";
      try {
        const { error: noticeError } = await resend.emails.send({
          from: "PeerVia <info@peervia.org>",
          to: fallback,
          subject: "Action needed: your university email isn't working",
          html: renderEmail({
            siteUrl,
            preheader: "We couldn't reach your university email address.",
            heading: "Your university email isn't working.",
            greeting: `Hi ${escapeHtml(app.first_name || "there")},`,
            bodyHtml:
              paragraph(
                `We tried to email you at <strong>${escapeHtml(address)}</strong>, but that address can't receive our emails, so it looks like it isn't valid. Here is what usually fixes this:`
              ) +
              `<ul style="${listStyle}">
                <li><strong>Check for typos.</strong> The order of the domain matters, for example @student.eur.nl rather than @eur.student.nl.</li>
                <li><strong>Check your mailbox is active.</strong> Some universities only activate student email after enrolment or a first login, and a full mailbox can also reject mail.</li>
                <li><strong>Test it.</strong> Send an email to that address from your personal account. If it bounces, the address is the problem.</li>
                <li><strong>Ask your IT helpdesk</strong> to allow emails from info@peervia.org if your university blocks outside senders.</li>
                <li><strong>Send us the right address.</strong> Reply to this email or write to info@peervia.org with your correct university email and we will update your application.</li>
              </ul>` +
              (resentTo
                ? paragraph("We have also sent you the original email at this address so you don't miss anything.")
                : ""),
            ctaLabel: "Contact PeerVia",
            ctaUrl: "mailto:info@peervia.org",
          }),
        });
        if (noticeError) throw new Error(noticeError.message);
        noticeNote = ` We also told the applicant their university email isn't valid (sent to ${escapeHtml(fallback)}).`;
      } catch (err) {
        console.error("Invalid-email notice failed:", err);
        noticeNote = " We tried to tell the applicant their university email isn't valid, but that failed. Check the logs.";
      }
    }

    const who = app
      ? `${escapeHtml(app.first_name)} ${escapeHtml(app.last_name)} applied to be a mentor.`
      : "This address doesn't match a mentor application.";

    const resendNote = resentTo
      ? `We automatically resent it to their personal email, ${escapeHtml(resentTo)}.`
      : fallback
      ? `We tried to resend it to their personal email (${escapeHtml(fallback)}) but that failed. Check the logs.`
      : "No personal email on file, so it was not resent.";

    try {
      await resend.emails.send({
        from: "PeerVia <info@peervia.org>",
        to: ADMIN_EMAIL,
        subject: `Email bounced: ${address}`,
        html: renderEmail({
          siteUrl,
          preheader: `An email to ${address} bounced.`,
          heading: "An email didn't get through.",
          greeting: "Hi,",
          bodyHtml:
            paragraph(`An email to <strong>${escapeHtml(address)}</strong> bounced.`) +
            paragraph(`Subject: ${escapeHtml(subject)}<br />Reason: ${escapeHtml(reason)}`) +
            paragraph(`${who} ${resendNote}${noticeNote}`),
          footerNote: "This alert is sent automatically when Resend reports a bounce.",
        }),
      });
    } catch (err) {
      console.error("Bounce alert failed:", err);
    }
  }

  return Response.json({ ok: true });
}