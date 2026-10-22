import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Called when a mentor opens their dashboard while signed in.
// Makes their profile visible on the public site.
export async function POST(request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return Response.json({ error: "Invalid session" }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from("mentorss")
    .update({ activated: true })
    .eq("user_id", userData.user.id)
    .eq("activated", false);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ success: true });
}