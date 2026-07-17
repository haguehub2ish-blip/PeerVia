import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  const { userId } = await request.json();

  if (!userId) {
    return Response.json({ error: "Missing user ID" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}