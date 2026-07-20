import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  const { userQuestionId, question, answer, mentorName, subject, country } =
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

  for (const u of matchedUsers) {
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
      sendResults.push({ email: u.email, success: true });
    } catch (err) {
      sendResults.push({ email: u.email, success: false, error: err.message });
    }
  }

  return Response.json({ success: true, notified: sendResults.length, results: sendResults });
}