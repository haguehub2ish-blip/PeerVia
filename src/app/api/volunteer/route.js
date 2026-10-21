import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/adminAuth";
import { renderEmail, paragraph, quoteBox, escapeHtml } from "@/lib/emailShell";

const resend = new Resend(process.env.RESEND_API_KEY);

// Keep in sync with the ROLES list in src/app/volunteer/page.js
const ROLE_LABELS = {
  spokesperson: "Spokesperson",
  "course-guides": "Course Guide Contributor",
  "mentor-recruiting": "Mentor Recruiter",
  "social-content": "Content & Social Media",
  "school-outreach": "School Outreach",
  events: "Events",
  "design-tech": "Design, Tech & Translation",
  other: "Something else",
};

const STAGES = ["High school student", "University student", "Recent graduate"];

const clean = (v, max) => String(v ?? "").trim().slice(0, max);

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  // Honest visitors never see this field. Bots fill it in, so we pretend it worked.
  if (body.website) return Response.json({ success: true });

  const firstName = clean(body.firstName, 80);
  const lastName = clean(body.lastName, 80);
  const email = clean(body.email, 200).toLowerCase();
  const stage = clean(body.stage, 40);
  const school = clean(body.school, 160);
  const hours = clean(body.hours, 60);
  const motivation = clean(body.motivation, 2000);
  const experience = clean(body.experience, 2000);
  const link = clean(body.link, 300);
  const additionalComments = clean(body.additionalComments, 2000);
  const roles = (Array.isArray(body.roles) ? body.roles : [])
    .filter((r) => ROLE_LABELS[r])
    .slice(0, 8);

  if (!firstName || !lastName) {
    return Response.json({ error: "Please enter your first and last name." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!STAGES.includes(stage)) {
    return Response.json({ error: "Please choose what you currently study." }, { status: 400 });
  }
  if (roles.length === 0) {
    return Response.json({ error: "Please pick at least one way you'd like to help." }, { status: 400 });
  }
  if (motivation.length < 20) {
    return Response.json({ error: "Please tell us a little more about why you want to help." }, { status: 400 });
  }

  // Don't let the same person sign up twice in a row.
  const { data: existing } = await supabaseAdmin
    .from("volunteer_applications")
    .select("id")
    .eq("email", email)
    .in("status", ["new", "contacted"])
    .limit(1);
  if (existing && existing.length > 0) {
    return Response.json({ error: "We already have your sign-up and will be in touch soon." }, { status: 409 });
  }

  const { error: insertError } = await supabaseAdmin.from("volunteer_applications").insert([
    {
      first_name: firstName,
      last_name: lastName,
      email,
      stage,
      school: school || null,
      roles,
      hours: hours || null,
      motivation,
      experience: experience || null,
      link: link || null,
    },
  ]);

  if (insertError) {
    return Response.json({ error: "Something went wrong saving your sign-up. Please try again." }, { status: 500 });
  }

  // Emails are a bonus: the sign-up is already saved, so never fail the request because of them.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const roleList = roles.map((r) => ROLE_LABELS[r]).join(", ");

  try {
    await resend.emails.send({
      from: "PeerVia <info@peervia.org>",
      to: "info.peervia@gmail.com",
      replyTo: email,
      subject: `New volunteer: ${firstName} ${lastName}`,
      html: renderEmail({
        siteUrl,
        preheader: `${firstName} ${lastName} wants to help as: ${roleList}`,
        heading: `${escapeHtml(firstName)} ${escapeHtml(lastName)} wants to volunteer`,
        bodyHtml:
          paragraph(`<strong>${escapeHtml(stage)}</strong>${school ? ` · ${escapeHtml(school)}` : ""}<br />${escapeHtml(email)}`) +
          paragraph(`<strong>Interested in:</strong> ${escapeHtml(roleList)}${hours ? `<br /><strong>Time:</strong> ${escapeHtml(hours)}` : ""}`) +
          quoteBox("Why they want to help", escapeHtml(motivation).replace(/\r?\n/g, "<br />")) +
          (additionalComments
            ? quoteBox("Additional comments", escapeHtml(additionalComments).replace(/\r?\n/g, "<br />"))
            : ""),
        ctaLabel: "Open volunteer list",
        ctaUrl: `${siteUrl}/admin/volunteers`,
        footerNote: "Sent automatically when someone signs up on the PeerVia volunteer page.",
      }),
    });
  } catch (err) {
    console.error("Volunteer admin email failed:", err);
  }

  try {
    await resend.emails.send({
      from: "PeerVia <info@peervia.org>",
      to: email,
      subject: "Thanks for offering to help PeerVia",
      html: renderEmail({
        siteUrl,
        preheader: "We got your sign-up and will be in touch soon.",
        heading: "Thank you for stepping up.",
        greeting: `Hi ${escapeHtml(firstName)},`,
        bodyHtml:
          paragraph(`We've received your volunteer sign-up for: ${escapeHtml(roleList)}.`) +
          paragraph("Someone from the team will read it and get back to you by email soon. In the meantime, there is nothing you need to do."),
        headerButtonLabel: "Visit PeerVia",
        headerButtonUrl: siteUrl,
        footerNote: "You're receiving this because you signed up to volunteer on PeerVia.",
      }),
    });
  } catch (err) {
    console.error("Volunteer confirmation email failed:", err);
  }

  return Response.json({ success: true });
}