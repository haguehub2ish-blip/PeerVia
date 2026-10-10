import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { renderEmail, paragraph, escapeHtml } from "@/lib/emailShell";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

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
  if (event.type !== "email.bounced") {
    return Response.json({ ok: true, ignored: event.type });
  }

  const recipients = Array.isArray(event.data?.to) ? event.data.to : [event.data?.to];
  const subject = event.data?.subject || "(no subject)";
  const reason = event.data?.bounce?.message || "No reason given";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

    for (const address of recipients) {
    if (!address || address.toLowerCase() === ADMIN_EMAIL) continue; // avoid loops

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
        const { data: original, error: getError } = await resend.emails.get(event.data.email_id);
        if (getError || !original?.html) {
          throw new Error(getError?.message || "Original email has no content");
        }
        const replyTo = original.reply_to || original.replyTo;
        const { error: sendError } = await resend.emails.send({
          from: "PeerVia <info@peervia.org>",
          to: fallback,
          ...(replyTo ? { replyTo } : {}),
          subject: `(Resent) ${original.subject || subject}`,
          html: original.html,
        });
        if (sendError) throw new Error(sendError.message);
        resentTo = fallback;
      } catch (err) {
        console.error("Fallback resend failed:", err);
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
            paragraph(`${who} ${resendNote}`),
          footerNote: "This alert is sent automatically when Resend reports a bounce.",
        }),
      });
    } catch (err) {
      console.error("Bounce alert failed:", err);
    }
  }

  return Response.json({ ok: true });
}