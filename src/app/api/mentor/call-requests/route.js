import { supabaseAdmin } from "@/lib/adminAuth";

// Finds the signed-in mentor from the request's session token.
async function getMentor(request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return { error: Response.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return { error: Response.json({ error: "Invalid session" }, { status: 401 }) };
  }

  const { data: mentor } = await supabaseAdmin
    .from("mentorss")
    .select("id, name")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!mentor) {
    return { error: Response.json({ error: "No mentor profile found" }, { status: 403 }) };
  }
  return { mentor };
}

// List this mentor's call requests (newest first).
export async function GET(request) {
  const { error: authError, mentor } = await getMentor(request);
  if (authError) return authError;

  const { data, error } = await supabaseAdmin
    .from("call_requests")
    .select("*")
    .eq("mentor_id", String(mentor.id))
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    requests: (data || []).map((r) => ({
      id: r.id,
      student_name: r.student_name || null,
      student_email: r.student_email || null,
      message: r.message || null,
      status: r.status === "done" ? "done" : "new",
      source: r.source,
      created_at: r.created_at,
    })),
  });
}

// Mark a request as handled, or reopen it.
export async function PATCH(request) {
  const { error: authError, mentor } = await getMentor(request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  if (!body.id || !["new", "done"].includes(body.status)) {
    return Response.json({ error: "Missing id or status" }, { status: 400 });
  }

  // Only this mentor's own requests can be changed
  const { data, error } = await supabaseAdmin
    .from("call_requests")
    .update({ status: body.status })
    .eq("id", body.id)
    .eq("mentor_id", String(mentor.id))
    .select("id")
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Request not found" }, { status: 404 });

  return Response.json({ success: true });
}