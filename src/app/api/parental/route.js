import { supabaseAdmin, sendBookingToMentor, notifyStudent } from "@/lib/parentalConsent";

const EXPIRY_MS = 14 * 24 * 60 * 60 * 1000; // links work for 14 days

// The approval page asks for the details of a request.
export async function GET(request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token || token.length !== 64) {
    return Response.json({ error: "This link isn't valid." }, { status: 400 });
  }

  const { data: req } = await supabaseAdmin
    .from("parental_requests")
    .select("kind, student_name, mentor_name, message, status, created_at")
    .eq("token", token)
    .maybeSingle();

  if (!req) {
    return Response.json({ error: "This link isn't valid." }, { status: 404 });
  }

  const expired = req.status === "pending" && Date.now() - new Date(req.created_at).getTime() > EXPIRY_MS;

  return Response.json({
    kind: req.kind,
    studentName: req.student_name,
    mentorName: req.mentor_name,
    message: req.message,
    status: req.status,
    expired,
  });
}

// The parent presses Approve or Decline.
export async function POST(request) {
  const { token, decision } = await request.json();
  if (!token || token.length !== 64 || !["approve", "decline"].includes(decision)) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { data: req } = await supabaseAdmin
    .from("parental_requests")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!req) {
    return Response.json({ error: "This link isn't valid." }, { status: 404 });
  }
  if (req.status !== "pending") {
    return Response.json({ status: req.status, already: true });
  }
  if (Date.now() - new Date(req.created_at).getTime() > EXPIRY_MS) {
    return Response.json({ error: "This link has expired. Please ask your child to send a new request." }, { status: 410 });
  }

  const newStatus = decision === "approve" ? "approved" : "declined";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  // Only succeeds if the request is still pending, so a double click can't send twice.
  const { data: updated } = await supabaseAdmin
    .from("parental_requests")
    .update({ status: newStatus, decided_at: new Date().toISOString() })
    .eq("id", req.id)
    .eq("status", "pending")
    .select()
    .maybeSingle();

  if (!updated) {
    return Response.json({ status: req.status, already: true });
  }

  if (req.kind === "signup") {
    await supabaseAdmin
      .from("student_profiles")
      .update({ consent_status: newStatus })
      .eq("user_id", req.student_id);
  }

  if (req.kind === "call" && newStatus === "approved") {
    try {
      await sendBookingToMentor({ request: req, siteUrl });
    } catch (err) {
      console.error("Could not send booking to mentor:", err);
      // put it back so the parent can try again
      await supabaseAdmin
        .from("parental_requests")
        .update({ status: "pending", decided_at: null })
        .eq("id", req.id);
      return Response.json({ error: "We couldn't send the request just now. Please try again in a moment." }, { status: 500 });
    }
  }

  try {
    await notifyStudent({ request: req, decision: newStatus, siteUrl });
  } catch (err) {
    console.error("Could not notify student:", err);
  }

  return Response.json({ status: newStatus });
}