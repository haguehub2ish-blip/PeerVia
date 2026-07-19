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

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      application.email,
      {
        data: { name: fullName, role: "mentor" },
        redirectTo: `${siteUrl}/mentor-account/set-password`,
      }
    );

    if (inviteError) {
      return Response.json({ error: inviteError.message }, { status: 500 });
    }

    const newUserId = inviteData.user.id;

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
  }

  return Response.json({ success: true });
}