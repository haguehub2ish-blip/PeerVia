import { Resend } from "resend";
import { requireAdmin, supabaseAdmin } from "@/lib/adminAuth";
import { renderEmail, paragraph, escapeHtml } from "@/lib/emailShell";

const resend = new Resend(process.env.RESEND_API_KEY);

function messageToHtml(text) {
  return String(text)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => paragraph(escapeHtml(block).replace(/\n/g, "<br />")))
    .join("");
}

// Every login that is a student: not a mentor, email confirmed, and (for under-18s) parent approved.
async function loadStudents() {
  // All logins (1000 per page)
  const users = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    users.push(...(data?.users || []));
    if (!data?.users || data.users.length < 1000) break;
  }

  // Anyone linked to a mentor profile is a mentor, so they are left out
  const { data: mentorRows } = await supabaseAdmin.from("mentorss").select("user_id");
  const mentorIds = new Set((mentorRows || []).map((m) => m.user_id).filter(Boolean));

  const { data: profiles } = await supabaseAdmin
    .from("student_profiles")
    .select("user_id, is_minor, consent_status");
  const profileOf = new Map((profiles || []).map((p) => [p.user_id, p]));

  const asList = (v) => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);

  return users
    .filter((u) => {
      if (!u.email || !u.email_confirmed_at) return false;
      if (mentorIds.has(u.id) || u.user_metadata?.role === "mentor") return false;
      if (u.banned_until && new Date(u.banned_until) > new Date()) return false;
      if (u.user_metadata?.emailPreferences?.announcements === false) return false;
      const p = profileOf.get(u.id);
      // Under-18s are only emailed once a parent has approved the account
      if (p?.is_minor && p.consent_status !== "approved") return false;
      return true;
    })
    .map((u) => {
      const prefs = u.user_metadata?.emailPreferences || {};
      const p = profileOf.get(u.id);
      return {
        id: u.id,
        email: u.email,
        name: u.user_metadata?.name || "",
        firstName: u.user_metadata?.firstName || (u.user_metadata?.name || "").split(" ")[0] || "",
        created_at: u.created_at,
        is_minor: !!p?.is_minor,
        fields: asList(prefs.fields),
        countries: asList(prefs.countries),
        schools: asList(prefs.schools),
        languages: asList(prefs.languages),
      };
    })
    .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
}

export async function GET(request) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;
    const students = await loadStudents();
    return Response.json({ data: students });
  } catch (err) {
    console.error("Student list failed:", err);
    return Response.json({ error: `Server error: ${err?.message || err}` }, { status: 500 });
  }
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
  const studentIds = Array.isArray(body.studentIds) ? body.studentIds.map(String) : [];

  if (!subject) return Response.json({ error: "Please write a subject." }, { status: 400 });
  if (!message) return Response.json({ error: "Please write a message." }, { status: 400 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

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
      footerNote: `You're receiving this because you have a PeerVia account. <a href="${siteUrl}/unsubscribe" style="color:#BC6C25;">Unsubscribe from these emails</a> (you'll need to log in).`,
    }),
  });

  if (testOnly) {
    if (!user.email) return Response.json({ error: "Your account has no email address." }, { status: 400 });
    const { error } = await resend.emails.send(buildEmail(user.email, "there"));
    if (error) return Response.json({ error: error.message || "Could not send the test email." }, { status: 500 });
    return Response.json({ success: true, sent: 1, test: true, to: user.email });
  }

  if (studentIds.length === 0) {
    return Response.json({ error: "No recipients selected." }, { status: 400 });
  }

  // Re-check on the server who is allowed to get the email (the browser list is never trusted)
  const allowed = new Map((await loadStudents()).map((s) => [s.id, s]));
  const recipients = studentIds.map((id) => allowed.get(id)).filter(Boolean);

  const seen = new Set();
  const unique = recipients.filter((r) => {
    const key = r.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length === 0) {
    return Response.json({ error: "None of the selected people can be emailed." }, { status: 400 });
  }

  // Resend takes up to 100 emails per batch. Everyone gets their own email.
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    try {
      const { error } = await resend.batch.send(chunk.map((r) => buildEmail(r.email, r.firstName)));
      if (error) {
        console.error("Student email batch failed:", error);
        failed += chunk.length;
      } else {
        sent += chunk.length;
      }
    } catch (err) {
      console.error("Student email batch failed:", err);
      failed += chunk.length;
    }
  }

  return Response.json({ success: failed === 0, sent, failed, skipped: studentIds.length - unique.length });
}

export async function POST(request) {
  try {
    return await handlePost(request);
  } catch (err) {
    console.error("Student email route crashed:", err);
    return Response.json({ error: `Server error: ${err?.message || err}` }, { status: 500 });
  }
}