import { supabaseAdmin } from "@/lib/adminAuth";

// Deletes the account of whoever is signed in. The user id is read from their
// login token, never from the request body, so nobody can delete someone else.
export async function POST(request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !data?.user) {
    return Response.json({ error: "Invalid session" }, { status: 401 });
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user.id);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}