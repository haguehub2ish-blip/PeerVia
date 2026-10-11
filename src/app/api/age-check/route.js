import { supabaseAdmin, validateAge, saveStudentProfile, calcAge } from "@/lib/parentalConsent";

// For people who signed up before the age check existed (or whose profile is missing).
export async function POST(request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return Response.json({ error: "Invalid session" }, { status: 401 });
  }
  const user = userData.user;

  const { data: existing } = await supabaseAdmin
    .from("student_profiles")
    .select("date_of_birth, consent_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // work out the age from the date of birth, so someone who turned 18 counts as an adult
    const minorNow = calcAge(existing.date_of_birth) < 18;
    return Response.json({ success: true, minor: minorNow, status: minorNow ? existing.consent_status : "approved" });
  }

  const { dateOfBirth, parentEmail } = await request.json();
  const check = validateAge({ dateOfBirth, email: user.email, parentEmail });
  if (check.error) {
    return Response.json({ error: check.error }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  try {
    await saveStudentProfile({
      userId: user.id,
      email: user.email,
      name: user.user_metadata?.name,
      check,
      parentEmail,
      siteUrl,
    });
  } catch (err) {
    console.error("Age check failed:", err);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  return Response.json({ success: true, minor: check.minor, status: check.minor ? "pending" : "approved" });
}