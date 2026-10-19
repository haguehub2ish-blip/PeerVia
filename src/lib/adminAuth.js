import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Checks the caller is a signed-in admin (email listed in ADMIN_EMAILS).
// Returns { error: Response } to send back, or { user } when allowed.
export async function requireAdmin(request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return { error: Response.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return { error: Response.json({ error: "Invalid session" }, { status: 401 }) };
  }

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!adminEmails.includes((data.user.email || "").toLowerCase())) {
    return { error: Response.json({ error: "Not authorized" }, { status: 403 }) };
  }

  return { user: data.user };
}