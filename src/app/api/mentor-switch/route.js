import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// If someone logs in with an approved mentor's backup email, this hands back a
// one-time token that signs them into the real mentor account instead.
export async function POST(request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return Response.json({ error: "Invalid session" }, { status: 401 });
  }

  const user = userData.user;
  const email = (user.email || "").trim().toLowerCase();

  // Already a mentor, or the email isn't verified: nothing to switch.
  if (!email || !user.email_confirmed_at) {
  return Response.json({ switch: false });
}
  // Self-heal: has a mentor profile but the role is missing from the login account.
  const { data: ownMentorRow } = await supabaseAdmin
    .from("mentorss")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (ownMentorRow) {
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, role: "mentor" },
    });
    const { data: selfLink } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: user.email,
    });
    if (selfLink?.properties?.hashed_token) {
      return Response.json({
        switch: true,
        token_hash: selfLink.properties.hashed_token,
        type: selfLink.properties.verification_type || "magiclink",
      });
    }
    return Response.json({ switch: false });
  }

  const { data: apps, error: appError } = await supabaseAdmin
    .from("mentor_applications")
    .select("email, backup_email, status")
    .eq("status", "approved")
    .ilike("backup_email", email);

  if (appError) {
    return Response.json({ error: appError.message }, { status: 500 });
  }

  let mentorEmail = (apps || []).find(
    (a) => (a.backup_email || "").trim().toLowerCase() === email
  )?.email;

  // Fallback: the mentor changed their personal email in the dashboard.
  if (!mentorEmail) {
    // Only look at accounts that have a real mentor profile (a user can edit
    // their own metadata, so the "role" label alone can't be trusted).
    const { data: mentorRows } = await supabaseAdmin.from("mentorss").select("user_id");
    const mentorUsers = await Promise.all(
      (mentorRows || [])
        .filter((row) => row.user_id)
        .map(async (row) => {
          const { data } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
          return data?.user || null;
        })
    );
    const mentorUser = mentorUsers.find(
      (u) => u && (u.user_metadata?.personal_email || "").trim().toLowerCase() === email
    );
    mentorEmail = mentorUser?.email;
  }

  if (!mentorEmail) {
    return Response.json({ switch: false });
  }

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: mentorEmail,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    return Response.json({ error: linkError?.message || "Could not switch account." }, { status: 500 });
  }

  return Response.json({
    switch: true,
    token_hash: linkData.properties.hashed_token,
    type: linkData.properties.verification_type || "magiclink",
  });
}