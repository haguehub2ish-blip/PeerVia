import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { renderEmail, paragraph, quoteBox, escapeHtml } from "@/lib/emailShell";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "PeerVia <info@peervia.org>";

export const MIN_AGE = 13; // youngest age allowed to sign up
export const ADULT_AGE = 18; // under this age a parent must approve

// ---------- helpers ----------

export function calcAge(dob) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob || "")) return null;
  const birth = new Date(dob + "T00:00:00Z");
  if (Number.isNaN(birth.getTime())) return null;
  if (birth.getUTCFullYear() < 1930) return null; // earliest year allowed
  if (birth.toISOString().slice(0, 10) !== dob) return null; // rejects dates like 31 February
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const m = now.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age--;
  if (age < 0 || age > 120) return null;
  return age;
}

function looksLikeEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || "");
}

// Checks date of birth (and parent email for under-18s). Returns { error } or { age, minor, dateOfBirth }.
export function validateAge({ dateOfBirth, email, parentEmail }) {
  const age = calcAge(dateOfBirth);
  if (age === null) return { error: "Please enter a valid date of birth." };
  if (age < MIN_AGE) return { error: `PeerVia is for students aged ${MIN_AGE} and over.` };

  const minor = age < ADULT_AGE;
  if (minor) {
    if (!looksLikeEmail(parentEmail)) {
      return { error: "Please enter your parent or guardian's email address." };
    }
    if (String(parentEmail).trim().toLowerCase() === String(email || "").trim().toLowerCase()) {
      return { error: "Your parent or guardian's email must be different from your own." };
    }
  }
  return { age, minor, dateOfBirth };
}

// Saves the student's profile and, for under-18s, emails the parent for approval.
export async function saveStudentProfile({ userId, email, name, check, parentEmail, siteUrl }) {
  const { error } = await supabaseAdmin.from("student_profiles").upsert({
    user_id: userId,
    date_of_birth: check.dateOfBirth,
    is_minor: check.minor,
    parent_email: check.minor ? parentEmail.trim() : null,
    consent_status: check.minor ? "pending" : "approved",
  });
  if (error) throw new Error(error.message);

  if (check.minor) {
    await createParentRequest({
      kind: "signup",
      studentId: userId,
      studentEmail: email,
      studentName: name,
      parentEmail: parentEmail.trim(),
      siteUrl,
    });
  }
}

async function send({ to, subject, html, replyTo }) {
  const payload = { from: FROM, to, subject, html };
  if (replyTo) payload.replyTo = replyTo;
  const { error } = await resend.emails.send(payload);
  if (error) throw new Error(error.message || "Email failed to send");
}

function nl(text) {
  return escapeHtml(text).replace(/\n/g, "<br />");
}

// ---------- emails to the parent ----------

export async function createParentRequest({
  kind,
  studentId,
  studentEmail,
  studentName,
  parentEmail,
  mentorId = null,
  mentorName = null,
  message = null,
  siteUrl,
}) {
  const token = crypto.randomBytes(32).toString("hex");

  const { error } = await supabaseAdmin.from("parental_requests").insert({
    token,
    kind,
    student_id: studentId,
    student_email: studentEmail,
    student_name: studentName,
    parent_email: parentEmail,
    mentor_id: mentorId ? String(mentorId) : null,
    mentor_name: mentorName,
    message,
  });
  if (error) throw new Error(error.message);

  const link = `${siteUrl}/parent/approve?token=${token}`;
  const fullName = escapeHtml(studentName || "Your child");
  const first = escapeHtml((studentName || "Your child").split(" ")[0]);

  if (kind === "signup") {
    await send({
      to: parentEmail,
      subject: `${(studentName || "A student").split(" ")[0]} would like to join PeerVia`,
      html: renderEmail({
        siteUrl,
        preheader: `${first} needs your approval to use PeerVia.`,
        heading: `${first} wants to join PeerVia.`,
        greeting: "Hello,",
        bodyHtml:
          paragraph(`${fullName} signed up for PeerVia and gave us your email address as their parent or guardian. Because they're under 18, their account can only be used once you approve it.`) +
          paragraph("PeerVia is a free, non-profit platform where high school students ask university students about courses, universities and careers. Mentors answer public questions and offer short online calls.") +
          paragraph(`<strong>You are required to be with ${first} during any call.</strong> Whenever ${first} asks for a call with a mentor, we will email you first, and nothing is sent to the mentor unless you approve it.`) +
          paragraph(`<strong>Messages:</strong> once you approve the account, ${first} can also send short written messages to mentors through PeerVia. Messages stay on PeerVia, and mentors never see ${first}'s email address. To keep everyone safe, messages may be reviewed by the PeerVia team. If you'd prefer ${first} not to use messaging, contact us and we'll turn it off for their account.`),
        ctaLabel: "Review and approve",
        ctaUrl: link,
        headerButtonLabel: "peervia.org",
        headerButtonUrl: siteUrl,
        footerNote: "If you don't know who this is, ignore this email. Nothing happens unless you approve.",
      }),
    });
  } else {
    await send({
      to: parentEmail,
      subject: `${(studentName || "Your child").split(" ")[0]} would like to book a call on PeerVia`,
      html: renderEmail({
        siteUrl,
        preheader: `${first} asked for a call with ${mentorName}. Your approval is needed.`,
        heading: `${first} would like to book a call.`,
        greeting: "Hello,",
        bodyHtml:
          paragraph(`${fullName} asked for a call with <strong>${escapeHtml(mentorName)}</strong>, a university student who volunteers as a mentor on PeerVia, and wrote:`) +
          quoteBox("Their message", nl(message)) +
          paragraph(`<strong>You are required to be with ${first} for the whole call.</strong> Calls take place online, by video or voice. The mentor only sees this request if you approve it.`),
        ctaLabel: "Review this request",
        ctaUrl: link,
        headerButtonLabel: "peervia.org",
        headerButtonUrl: siteUrl,
        footerNote: "If you weren't expecting this, you can ignore this email. Nothing is sent to the mentor unless you approve.",
      }),
    });
  }
}

// ---------- email to the mentor (after a parent approves a call) ----------

export async function sendBookingToMentor({ request, siteUrl }) {
  const { data: mentor, error: mentorError } = await supabaseAdmin
    .from("mentorss")
    .select("name, user_id")
    .eq("id", request.mentor_id)
    .single();
  if (mentorError || !mentor) throw new Error("Mentor not found");

  const { data: mentorUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(mentor.user_id);
  if (userError || !mentorUser?.user?.email) throw new Error("Could not find the mentor's email");

  const mentorFirst = escapeHtml((mentor.name || "").split(" ")[0]);

  await send({
    to: mentorUser.user.email,
    replyTo: [request.student_email, request.parent_email],
    subject: `New call request from ${request.student_email} (under 18)`,
    html: renderEmail({
      siteUrl,
      preheader: "A student under 18 asked for a call. Their parent has approved it.",
      heading: `${mentorFirst}, a student wants to talk to you.`,
      greeting: `Hi ${mentorFirst},`,
      bodyHtml:
        paragraph("A student found your profile on PeerVia and asked for a call. They are under 18, and their parent or guardian has approved this request.") +
        quoteBox("What they want to talk about", nl(request.message)) +
        paragraph("<strong>A parent or guardian must be present for the whole call.</strong> Please check that an adult is with them when the call starts, and don't go ahead if there isn't one.") +
        paragraph(`If you reply to this email, your reply goes to the student (${escapeHtml(request.student_email)}) and to their parent.`),
      ctaLabel: "View on your dashboard →",
      ctaUrl: `${siteUrl}/mentor-account/dashboard#call-requests`,
      footerNote: "You're receiving this because you're a mentor on PeerVia and this student found you through your profile.",
    }),
  });
}

// ---------- email to the student (after the parent decides) ----------

export async function notifyStudent({ request, decision, siteUrl }) {
  const approved = decision === "approved";
  const first = escapeHtml((request.student_name || "there").split(" ")[0]);
  let heading;
  let body;
  let ctaLabel = "";
  let ctaUrl = "";

  if (request.kind === "signup") {
    heading = approved ? "Your account is approved." : "Your account wasn't approved.";
    body = approved
      ? "Your parent or guardian approved your PeerVia account. You can log in now."
      : "Your parent or guardian didn't approve your PeerVia account, so it can't be used.";
    if (approved) {
      ctaLabel = "Log in";
      ctaUrl = `${siteUrl}/login`;
    }
  } else {
    const mentor = escapeHtml(request.mentor_name || "the mentor");
    heading = approved ? "Your call request was sent." : "Your call request wasn't approved.";
    body = approved
      ? `Your parent or guardian approved your request, and we sent it to ${mentor}. They will reply to you and your parent by email. Remember that your parent or guardian must be with you during the call.`
      : `Your parent or guardian didn't approve your request to speak with ${mentor}, so we didn't send it.`;
  }

  await send({
    to: request.student_email,
    subject: heading,
    html: renderEmail({
      siteUrl,
      preheader: heading,
      heading,
      greeting: `Hi ${first},`,
      bodyHtml: paragraph(body),
      ctaLabel,
      ctaUrl,
    }),
  });
}