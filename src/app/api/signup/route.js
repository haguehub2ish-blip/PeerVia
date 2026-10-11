import { createClient } from "@supabase/supabase-js";
import { validateAge, saveStudentProfile } from "@/lib/parentalConsent";

export async function POST(request) {
  const { email, password, data, dateOfBirth, parentEmail } = await request.json();

  if (!email || !password) {
    return Response.json({ error: "Please enter your email and a password." }, { status: 400 });
  }

  // Check age first, so we never create an account with an invalid date of birth.
  const check = validateAge({ dateOfBirth, email, parentEmail });
  if (check.error) {
    return Response.json({ error: check.error }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: signUpData, error } = await anon.auth.signUp({
    email,
    password,
    options: { data },
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  const user = signUpData?.user;

  // If the email is already registered, Supabase returns a user with no identities. Do nothing then.
  if (user && user.identities && user.identities.length > 0) {
    try {
      await saveStudentProfile({
        userId: user.id,
        email,
        name: data?.name,
        check,
        parentEmail,
        siteUrl,
      });
    } catch (err) {
      console.error("Student profile / parent email failed:", err);
      return Response.json(
        { error: "Your account was created, but we couldn't email your parent or guardian. Please write to info.peervia@gmail.com." },
        { status: 500 }
      );
    }
  }

  return Response.json({ success: true, minor: check.minor });
}