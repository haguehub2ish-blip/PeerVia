import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim());
  if (!adminEmails.includes(userData.user.email)) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const { id } = await request.json();
  if (!id) {
    return Response.json({ error: "Missing application id" }, { status: 400 });
  }

  const { data: application, error: appError } = await supabaseAdmin
    .from("mentor_applications")
    .select("*")
    .eq("id", id)
    .single();

  if (appError || !application) {
    return Response.json({ error: "Application not found" }, { status: 404 });
  }

  if (application.status !== "approved") {
    return Response.json({ error: "Only approved applications can be re-invited." }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const fullName = `${application.first_name} ${application.last_name}`;

  const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    application.email,
    {
      data: { name: fullName, role: "mentor" },
      redirectTo: `${siteUrl}/mentor-account/set-password`,
    }
  );

  if (inviteError) {
    const msg = inviteError.message?.toLowerCase() || "";
    if (msg.includes("already been registered") || msg.includes("already registered")) {
      return Response.json(
        { error: "This person has already activated their account, so there is nothing to resend. They can log in, or use Forgot password on the login page." },
        { status: 400 }
      );
    }
    return Response.json({ error: inviteError.message }, { status: 500 });
  }

  return Response.json({ success: true });
}