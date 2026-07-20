import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

  if (userData.user.email !== process.env.ADMIN_EMAIL) {
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
        data: { name: fullName, role: "mentor" },
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
        school: application.university,
        year: application.year,
        verified: true,
        subject: application.field,
        country: countryMap[application.country] || application.country,
        languages: applicantLanguages,
        bio: application.why,
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
          from: "PeerVia <onboarding@resend.dev>",
          to: application.email,
          subject: "You've Been Approved As A PeerVia Mentor 🎉",
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #166534;">Congratulations, ${application.first_name}!</h2>
              <p style="color: #374151;">Your application to become a PeerVia mentor has been approved. Since you already have an account, just log in as usual to access your new Mentor Dashboard.</p>
              <a href="${siteUrl}/login" style="display: inline-block; background: #16a34a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 12px;">
                Log In To PeerVia
              </a>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Failed to send existing-user approval email:", emailErr);
      }
    }
  }

  return Response.json({ success: true });
}