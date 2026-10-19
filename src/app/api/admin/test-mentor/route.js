import { requireAdmin, supabaseAdmin } from "@/lib/adminAuth";

function makeInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

// The languages column can be a real list or comma-separated text depending on how the
// table was set up. Try the list first, and fall back to text if the database objects.
async function insertMentor(row) {
  let result = await supabaseAdmin.from("mentorss").insert([row]).select().single();
  const rejected = result.error && /language|array|json|malformed/i.test(result.error.message);
  if (rejected && Array.isArray(row.languages)) {
    result = await supabaseAdmin
      .from("mentorss")
      .insert([{ ...row, languages: row.languages.join(",") }])
      .select()
      .single();
  }
  return result;
}

async function findTestMentor() {
  const { data, error } = await supabaseAdmin
    .from("mentorss")
    .select("*")
    .eq("admin_only", true)
    .limit(1);

  if (error) {
    if (/admin_only|column/i.test(error.message)) {
      return {
        error:
          "The database isn't set up for test mentors yet. Run the SQL from the setup steps first (the admin_only column is missing).",
      };
    }
    return { error: error.message };
  }
  return { mentor: data?.[0] || null };
}

export async function GET(request) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const found = await findTestMentor();
  if (found.error) return Response.json({ error: found.error }, { status: 500 });

  let email = null;
  if (found.mentor?.user_id) {
    const { data } = await supabaseAdmin.auth.admin.getUserById(found.mentor.user_id);
    email = data?.user?.email || null;
  }

  return Response.json({ mentor: found.mentor, email });
}

export async function POST(request) {
  const { error: authError, user: adminUser } = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || "").trim() || "Test Mentor";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "The password needs at least 8 characters." }, { status: 400 });
  }
  if (name.length > 80) {
    return Response.json({ error: "That name is too long." }, { status: 400 });
  }

  const found = await findTestMentor();
  if (found.error) return Response.json({ error: found.error }, { status: 500 });
  if (found.mentor) {
    return Response.json(
      { error: "A test mentor already exists. Delete it first if you want to make a new one." },
      { status: 409 }
    );
  }

  // 1. The login. Confirmed straight away, with the same role real mentors get.
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      role: "mentor",
      personal_email: adminUser.email || "",
      is_test_mentor: true,
    },
  });

  if (createError || !created?.user) {
    const message = createError?.message || "Could not create the login.";
    const taken = /already|registered|exists/i.test(message);
    return Response.json(
      {
        error: taken
          ? "That email already has an account. Use a different address, for example yourname+testmentor@gmail.com."
          : message,
      },
      { status: taken ? 409 : 500 }
    );
  }

  // 2. The mentor profile, hidden from everyone except admins and the test login itself.
  const { data: mentor, error: insertError } = await insertMentor({
    user_id: created.user.id,
    name,
    initials: makeInitials(name),
    school: "University of Amsterdam",
    year: "Year 2",
    subject: "Psychology",
    country: "NL",
    languages: ["English", "Dutch"],
    bio: "This is the admin-only test mentor. Only admins can see this profile.",
    about_me: "A test profile used to try out mentor features without involving a real mentor.",
    extracurriculars: "Testing the PeerVia mentor tools.",
    support_guidance: "Ask me anything, I only exist for testing.",
    verified: true,
    available: true,
    sessions: 0,
    answers: 0,
    rating: 0,
    admin_only: true,
  });

  if (insertError) {
    // Don't leave a half-made account behind
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  return Response.json({ mentor, email });
}

export async function DELETE(request) {
  const { error: authError, user: adminUser } = await requireAdmin(request);
  if (authError) return authError;

  const found = await findTestMentor();
  if (found.error) return Response.json({ error: found.error }, { status: 500 });
  if (!found.mentor) return Response.json({ error: "There is no test mentor to delete." }, { status: 404 });

  const mentor = found.mentor;

  // Clean up everything the test mentor created (best effort, errors are ignored)
  for (const key of [mentor.id, mentor.user_id]) {
    if (key) await supabaseAdmin.from("mentor_calendar_events").delete().eq("mentor_id", key);
  }
  if (mentor.user_id) {
    await supabaseAdmin.from("question_answers").delete().eq("mentor_id", mentor.user_id);
  }
  await supabaseAdmin.from("mentor_reviews").delete().eq("mentor_id", mentor.id);
  await supabaseAdmin.from("call_requests").delete().eq("mentor_id", String(mentor.id));

  const { error: deleteError } = await supabaseAdmin.from("mentorss").delete().eq("id", mentor.id);
  if (deleteError) return Response.json({ error: deleteError.message }, { status: 500 });

  let warning = null;
  // Never delete the admin's own login
  if (mentor.user_id && mentor.user_id !== adminUser.id) {
    const { error: userError } = await supabaseAdmin.auth.admin.deleteUser(mentor.user_id);
    if (userError) warning = `The test mentor was removed, but its login could not be deleted: ${userError.message}`;
  }

  return Response.json({ success: true, warning });
}