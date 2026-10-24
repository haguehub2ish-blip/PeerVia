import { supabaseAdmin } from "@/lib/adminAuth";

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

// A mentor blocks (or unblocks) a student from messaging them.
export async function POST(request) {
  const { error: authError, mentor } = await getMentor(request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const studentId = body.studentId;
  const blocked = body.blocked !== false;

  if (!studentId) return Response.json({ error: "Missing student" }, { status: 400 });

  // The student must have actually messaged this mentor
  const { data: anyMessage } = await supabaseAdmin
    .from("mentor_messages")
    .select("id")
    .eq("mentor_id", String(mentor.id))
    .eq("student_id", studentId)
    .limit(1);
  if (!anyMessage || anyMessage.length === 0) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (blocked) {
    const { data: existing } = await supabaseAdmin
      .from("message_blocks")
      .select("id")
      .eq("user_id", studentId)
      .eq("mentor_id", String(mentor.id))
      .limit(1);
    if (!existing || existing.length === 0) {
      const { error } = await supabaseAdmin.from("message_blocks").insert({
        user_id: studentId,
        mentor_id: String(mentor.id),
        reason: "Blocked by mentor",
      });
      if (error) return Response.json({ error: "Couldn't block this student." }, { status: 500 });
    }
  } else {
    const { error } = await supabaseAdmin
      .from("message_blocks")
      .delete()
      .eq("user_id", studentId)
      .eq("mentor_id", String(mentor.id));
    if (error) return Response.json({ error: "Couldn't unblock this student." }, { status: 500 });
  }

  return Response.json({ success: true, blocked });
}