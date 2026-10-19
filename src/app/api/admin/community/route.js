import { requireAdmin, supabaseAdmin } from "@/lib/adminAuth";

// What each kind of community item is stored in, and which column holds its text.
const TYPES = {
  question: { table: "user_questions", column: "question" },
  answer: { table: "question_answers", column: "answer" },
  comment: { table: "question_comments", column: "content" },
};

// Loads every row of a table, 1000 at a time, newest first.
async function fetchAll(table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

export async function GET(request) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  try {
    const [questions, answers, comments] = await Promise.all([
      fetchAll("user_questions"),
      fetchAll("question_answers"),
      fetchAll("question_comments"),
    ]);
    return Response.json({ questions, answers, comments });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// Turns a list of tags (or "A,B" text) into the comma-separated form the site stores.
function cleanTags(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(",");
  const cleaned = [...new Set(list.map((t) => String(t).trim()).filter(Boolean))];
  return cleaned.length > 0 ? cleaned.join(",") : null;
}

// Edit the text of a question, answer or comment, or the tags of a question.
export async function PATCH(request) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { type, id, text, subject, country } = await request.json();
  const target = TYPES[type];
  if (!target || !id) return Response.json({ error: "Invalid request" }, { status: 400 });

  const update = {};
  if (text !== undefined) {
    const clean = String(text || "").trim();
    if (!clean) return Response.json({ error: "The text can't be empty" }, { status: 400 });
    update[target.column] = clean;
  }
  if (type === "question") {
    if (subject !== undefined) update.subject = cleanTags(subject);
    if (country !== undefined) update.country = cleanTags(country);
  }
  if (Object.keys(update).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from(target.table).update(update).eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}

// Delete a question (with everything attached to it), an answer, or a comment.
export async function DELETE(request) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { type, id } = await request.json();
  const target = TYPES[type];
  if (!target || !id) return Response.json({ error: "Invalid request" }, { status: 400 });

  if (type === "question") {
    // Clear the question's answers, comments, likes and views first.
    const attached = [
      ["question_answers", "user_question_id"],
      ["question_comments", "question_id"],
      ["question_likes", "question_id"],
      ["question_views", "question_id"],
    ];
    for (const [table, column] of attached) {
      await supabaseAdmin.from(table).delete().eq(column, id);
    }
  }

  const { error } = await supabaseAdmin.from(target.table).delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}