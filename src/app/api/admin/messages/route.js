import { supabaseAdmin, requireAdmin } from "@/lib/adminAuth";

// Overview of all message conversations, reports and blocks (admins only).
// With ?mentorId=...&studentId=... it returns the full text of one conversation instead.
export async function GET(request) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const mentorIdParam = url.searchParams.get("mentorId");
  const studentIdParam = url.searchParams.get("studentId");

  if (mentorIdParam && studentIdParam) {
    const { data, error } = await supabaseAdmin
      .from("mentor_messages")
      .select("id, sender, body, created_at")
      .eq("mentor_id", mentorIdParam)
      .eq("student_id", studentIdParam)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ messages: data || [] });
  }

  const [msgRes, reportRes, blockRes, mentorRes] = await Promise.all([
    supabaseAdmin
      .from("mentor_messages")
      .select("mentor_id, student_id, student_name, sender, body, created_at")
      .order("created_at", { ascending: false })
      .limit(3000),
    supabaseAdmin.from("message_reports").select("*").order("created_at", { ascending: false }).limit(100),
    supabaseAdmin.from("message_blocks").select("*").order("created_at", { ascending: false }).limit(200),
    supabaseAdmin.from("mentorss").select("id, name, user_id"),
  ]);

  if (msgRes.error) return Response.json({ error: msgRes.error.message }, { status: 500 });

  const mentorsById = new Map((mentorRes.data || []).map((m) => [String(m.id), m]));
  const mentorsByUserId = new Map((mentorRes.data || []).map((m) => [m.user_id, m]));

  const blocks = blockRes.data || [];
  const siteBlocked = new Set(blocks.filter((b) => b.mentor_id === null).map((b) => b.user_id));
  const scopedBlocked = new Set(
    blocks.filter((b) => b.mentor_id !== null).map((b) => `${b.user_id}|${b.mentor_id}`)
  );

  // Group messages into conversations (newest first, so the first message seen is the latest)
  const convoMap = new Map();
  const studentNames = new Map();
  for (const m of msgRes.data || []) {
    if (m.student_name && !studentNames.has(m.student_id)) studentNames.set(m.student_id, m.student_name);
    const key = `${m.mentor_id}|${m.student_id}`;
    if (!convoMap.has(key)) {
      convoMap.set(key, {
        mentor_id: m.mentor_id,
        student_id: m.student_id,
        count: 0,
        last_at: m.created_at,
        last_sender: m.sender,
        last_body: m.body.slice(0, 140),
      });
    }
    convoMap.get(key).count += 1;
  }

  const describe = (mentorId, studentId) => {
    const mentor = mentorsById.get(String(mentorId));
    return {
      mentor_name: mentor?.name || "Unknown mentor",
      student_name: studentNames.get(studentId) || "A student",
      student_blocked: siteBlocked.has(studentId) || scopedBlocked.has(`${studentId}|${mentorId}`),
      student_blocked_site: siteBlocked.has(studentId),
      mentor_blocked: mentor ? siteBlocked.has(mentor.user_id) : false,
    };
  };

  const conversations = [...convoMap.values()].map((c) => ({ ...c, ...describe(c.mentor_id, c.student_id) }));
  const reports = (reportRes.data || []).map((r) => ({ ...r, ...describe(r.mentor_id, r.student_id) }));

  // Work out who each block is about
  const blockList = await Promise.all(
    blocks.map(async (b) => {
      const mentor = mentorsByUserId.get(b.user_id);
      let name = mentor?.name || studentNames.get(b.user_id) || null;
      let email = null;
      if (!name) {
        try {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(b.user_id);
          email = u?.user?.email || null;
        } catch {}
      }
      return {
        id: b.id,
        user_id: b.user_id,
        role: mentor ? "mentor" : "student",
        name: name || email || b.user_id,
        scope: b.mentor_id === null ? "all" : mentorsById.get(String(b.mentor_id))?.name || "one mentor",
        reason: b.reason,
        created_at: b.created_at,
      };
    })
  );

  return Response.json({ conversations, reports, blocks: blockList });
}

// Block or unblock someone from messaging, site-wide.
export async function POST(request) {
  const { error: authError, user: admin } = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));

  if (body.action === "unblock" && body.blockId) {
    const { error } = await supabaseAdmin.from("message_blocks").delete().eq("id", body.blockId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  }

  if (body.action !== "block" && body.action !== "unblock") {
    return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  // Work out which account is being blocked or unblocked
  let userId = null;
  if (body.target === "student") {
    userId = body.studentId;
  } else if (body.target === "mentor") {
    const { data: mentor } = await supabaseAdmin
      .from("mentorss")
      .select("user_id")
      .eq("id", body.mentorId)
      .maybeSingle();
    userId = mentor?.user_id;
  }
  if (!userId) return Response.json({ error: "Couldn't find that account" }, { status: 400 });

  if (body.action === "block") {
    const { data: existing } = await supabaseAdmin
      .from("message_blocks")
      .select("id")
      .eq("user_id", userId)
      .is("mentor_id", null)
      .limit(1);
    if (!existing || existing.length === 0) {
      const { error } = await supabaseAdmin.from("message_blocks").insert({
        user_id: userId,
        mentor_id: null,
        reason: String(body.reason || `Blocked by admin (${admin.email})`).slice(0, 500),
      });
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabaseAdmin.from("message_blocks").delete().eq("user_id", userId).is("mentor_id", null);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}

// Dismiss (delete) a report once it has been dealt with.
export async function DELETE(request) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { reportId } = await request.json().catch(() => ({}));
  if (!reportId) return Response.json({ error: "Missing report" }, { status: 400 });

  const { error } = await supabaseAdmin.from("message_reports").delete().eq("id", reportId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}