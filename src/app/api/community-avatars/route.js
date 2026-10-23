import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const UUID = /^[0-9a-f-]{36}$/i;

// Returns { avatars: { [userId]: photoUrl } } for the people shown on the Community page.
// Mentors use their mentor profile photo; everyone else uses the photo from their settings
// (or their Google/OAuth profile picture).
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const ids = [
    ...new Set(
      (Array.isArray(body?.userIds) ? body.userIds : []).filter(
        (id) => typeof id === "string" && UUID.test(id)
      )
    ),
  ].slice(0, 200);

  if (ids.length === 0) return Response.json({ avatars: {} });

  const avatars = {};

  const { data: mentorRows } = await supabaseAdmin
    .from("mentorss")
    .select("user_id, photo_url")
    .in("user_id", ids);
  for (const r of mentorRows || []) {
    if (r.photo_url) avatars[r.user_id] = r.photo_url;
  }

  const rest = ids.filter((id) => !avatars[id]);
  await Promise.all(
    rest.map(async (id) => {
      try {
        const { data } = await supabaseAdmin.auth.admin.getUserById(id);
        const meta = data?.user?.user_metadata || {};
        const url = meta.avatar_url || meta.picture;
        if (url) avatars[id] = url;
      } catch (err) {
        console.error("Avatar lookup failed:", err);
      }
    })
  );

  return Response.json({ avatars });
}