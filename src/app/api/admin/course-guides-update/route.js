import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const countryLabels = { NL: "The Netherlands", UK: "the UK" };
const countryFlags = { NL: "🇳🇱", UK: "🇬🇧" };

export async function POST(request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !userData?.user) {
    return Response.json({ error: "Invalid session" }, { status: 401 });
  }

  if (userData.user.email !== process.env.ADMIN_EMAIL) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const guide = await request.json();

  if (!guide.id || !guide.subject || !guide.country || !guide.description || !guide.admission) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("course_guides")
    .update({
      subject: guide.subject,
      country: guide.country,
      country_label: guide.countryLabel || countryLabels[guide.country] || guide.country,
      flag: guide.flag || countryFlags[guide.country] || "🌍",
      description: guide.description,
      popular_universities: guide.popularUniversities || [],
      admission: guide.admission,
      language_requirement: guide.languageRequirement || null,
      extracurriculars: guide.extracurriculars || [],
      written_by: guide.writtenBy || null,
    })
    .eq("id", guide.id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ success: true });
}