import { Resend } from "resend";

export async function POST(req) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is missing. Restart the dev server.");
      return Response.json({ error: "Email service is not configured." }, { status: 500 });
    }
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { name, email, question, website } = await req.json();

    // Honeypot: bots fill this hidden field, humans don't
    if (website) return Response.json({ ok: true });

    if (!name?.trim() || !email?.trim() || !question?.trim()) {
      return Response.json({ error: "All fields are required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Please enter a valid email." }, { status: 400 });
    }

    const { error } = await resend.emails.send({
      from: "PeerVia <info@peervia.org>",
      to: "info.peervia@gmail.com",
      replyTo: email,
      subject: `New PeerVia question from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${question}`,
    });

    if (error) {
      console.error("Resend error:", error);
      return Response.json({ error: error.message || "Could not send message." }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return Response.json({ error: err.message || "Something went wrong." }, { status: 500 });
  }
}