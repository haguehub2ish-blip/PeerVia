import { requireAdmin, supabaseAdmin } from "@/lib/adminAuth";

const TEXT_FIELDS = [
  "name", "school", "year", "subject", "country", "bio", "about_me",
  "photo_url", "extracurriculars", "final_grade", "support_guidance", "linkedin",
];
const NUMBER_FIELDS = ["sessions", "answers", "rating"];
const BOOLEAN_FIELDS = ["available", "verified"];

function makeInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function toLanguages(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(",");
  const cleaned = list.map((l) => String(l).trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : ["English"];
}

// Only these columns can ever be written from the admin form.
function buildRow(body) {
  const row = {};
  for (const f of TEXT_FIELDS) {
    if (body[f] !== undefined) row[f] = String(body[f] ?? "").trim() || null;
  }
  for (const f of NUMBER_FIELDS) {
    if (body[f] !== undefined) {
      const n = Number(body[f]);
      row[f] = Number.isFinite(n) ? n : 0;
    }
  }
  for (const f of BOOLEAN_FIELDS) {
    if (body[f] !== undefined) row[f] = Boolean(body[f]);
  }
  if (body.languages !== undefined) row.languages = toLanguages(body.languages);
  return row;
}

// The languages column can be a real list or comma-separated text depending on how the
// table was set up. Try the list first, and fall back to text if the database objects.
async function writeMentor(run, row) {
  let result = await run(row);
  const rejected = result.error && /language|array|json|malformed/i.test(result.error.message);
  if (rejected && Array.isArray(row.languages)) {
    result = await run({ ...row, languages: row.languages.join(",") });
  }
  return result;
}

export async function GET(request) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { data, error } = await supabaseAdmin
    .from("mentorss")
    .select("*")
    .order("name", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function POST(request) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  const row = buildRow(body);

  for (const f of ["name", "school", "subject", "country"]) {
    if (!row[f]) return Response.json({ error: `Missing ${f}` }, { status: 400 });
  }

  row.initials = makeInitials(row.name);
  row.languages ??= ["English"];
  row.verified ??= true;
  row.available ??= true;
  row.sessions ??= 0;
  row.answers ??= 0;
  row.rating ??= 0;

  const { data, error } = await writeMentor(
    (r) => supabaseAdmin.from("mentorss").insert([r]).select().single(),
    row
  );
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function PATCH(request) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  if (!body.id) return Response.json({ error: "Missing id" }, { status: 400 });

  const row = buildRow(body);
  for (const f of ["name", "school", "subject", "country"]) {
    if (f in row && !row[f]) return Response.json({ error: `${f} can't be empty` }, { status: 400 });
  }
  if (row.name) row.initials = makeInitials(row.name);
  if (Object.keys(row).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await writeMentor(
    (r) => supabaseAdmin.from("mentorss").update(r).eq("id", body.id).select().single(),
    row
  );
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function DELETE(request) {
  const { error: authError, user } = await requireAdmin(request);
  if (authError) return authError;

  const { id, deleteLogin } = await request.json();
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const { data: mentor, error: findError } = await supabaseAdmin
    .from("mentorss")
    .select("id, user_id")
    .eq("id", id)
    .single();
  if (findError || !mentor) {
    return Response.json({ error: "Mentor not found" }, { status: 404 });
  }

  // Best effort: clear the mentor's calendar slots so they don't linger.
  for (const key of [mentor.id, mentor.user_id]) {
    if (key) await supabaseAdmin.from("mentor_calendar_events").delete().eq("mentor_id", key);
  }

  const { error: deleteError } = await supabaseAdmin.from("mentorss").delete().eq("id", id);
  if (deleteError) return Response.json({ error: deleteError.message }, { status: 500 });

  let warning = null;
  if (deleteLogin && mentor.user_id && mentor.user_id !== user.id) {
    const { error: userError } = await supabaseAdmin.auth.admin.deleteUser(mentor.user_id);
    if (userError) warning = `Mentor removed, but the login could not be deleted: ${userError.message}`;
  }

  return Response.json({ success: true, warning });
}