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
  if (user.user_metadata?.role === "mentor" || !email || !user.email_confirmed_at) {
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

  const match = (apps || []).find(
    (a) => (a.backup_email || "").trim().toLowerCase() === email
  );
  if (!match?.email) {
    return Response.json({ switch: false });
  }

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: match.email,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    return Response.json({ error: linkError?.message || "Could not switch account." }, { status: 500 });
  }

  return Response.json({ switch: true, token_hash: linkData.properties.hashed_token });
}