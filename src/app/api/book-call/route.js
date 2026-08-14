import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

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

  const { mentorId, email, message } = await request.json();
  if (!mentorId || !email || !message) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: mentor, error: mentorError } = await supabaseAdmin
    .from("mentorss")
    .select("name, user_id, available")
    .eq("id", mentorId)
    .single();

  if (mentorError || !mentor) {
    return Response.json({ error: "Mentor not found" }, { status: 404 });
  }
  if (!mentor.available) {
    return Response.json({ error: "This mentor isn't open for bookings right now." }, { status: 400 });
  }

  const { data: mentorUser, error: mentorUserError } = await supabaseAdmin.auth.admin.getUserById(mentor.user_id);
  if (mentorUserError || !mentorUser?.user?.email) {
    return Response.json({ error: "Could not find mentor's contact email" }, { status: 500 });
  }

  const html = `
    <h2>New booking request</h2>
    <p><strong>Mentor:</strong> ${mentor.name}</p>
    <p><strong>From:</strong> ${email}</p>
    <p><strong>Reason:</strong></p>
    <p>${message.replace(/\n/g, "<br/>")}</p>
  `;

  try {
    await resend.emails.send({
      from: "PeerVia <onboarding@resend.dev>", // swap to your own domain once verified
      to: [mentorUser.user.email], // change once domain to peervia 1
      replyTo: email,
      subject: `New call request from ${email}`,
      html,
    });
  } catch (err) {
    return Response.json({ error: "Failed to send email: " + err.message }, { status: 500 });
  }

  return Response.json({ success: true });
}