import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  const { userQuestionId, question, answer, mentorName, subject, country, askerUserId } =
    await request.json();

  if (!userQuestionId || !question || !answer) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

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
          from: "PeerVia <onboarding@resend.dev>",
          to: askerData.user.email,
          subject: "A Mentor Answered Your Question On PeerVia",
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #166534;">Your Question Was Answered</h2>
              <p style="color: #374151;"><strong>Your Question:</strong> ${question}</p>
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="color: #1f2937; margin: 0 0 8px 0;">${answer}</p>
                <p style="color: #166534; font-weight: 600; margin: 0; font-size: 14px;">— ${mentorName}, Verified Mentor</p>
              </div>
              <a href="${siteUrl}/community#${userQuestionId}" style="display: inline-block; background: #16a34a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                View On PeerVia
              </a>
            </div>
          `,
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
        from: "PeerVia <onboarding@resend.dev>",
        to: u.email,
        subject: `A Mentor Just Answered A ${subject} Question On PeerVia`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #166534;">New Answer On PeerVia</h2>
            <p style="color: #374151;"><strong>Question:</strong> ${question}</p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="color: #1f2937; margin: 0 0 8px 0;">${answer}</p>
              <p style="color: #166534; font-weight: 600; margin: 0; font-size: 14px;">— ${mentorName}, Verified Mentor</p>
            </div>
            <a href="${siteUrl}/community#${userQuestionId}" style="display: inline-block; background: #16a34a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              View On PeerVia
            </a>
          </div>
        `,
      });
      sendResults.push({ email: u.email, success: true, type: "preference" });
    } catch (err) {
      sendResults.push({ email: u.email, success: false, error: err.message, type: "preference" });
    }
  }

  return Response.json({ success: true, notified: sendResults.length, results: sendResults });
}