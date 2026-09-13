import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  const { firstName, lastName, email, university, field, country } = await request.json();

  try {
    await resend.emails.send({
      from: "PeerVia <info@peervia.org>",
      to: "info.peervia@gmail.com",
      subject: `New Mentor Application: ${firstName} ${lastName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #166534;">New Mentor Application</h2>
          <p style="color: #374151;"><strong>Name:</strong> ${firstName} ${lastName}</p>
          <p style="color: #374151;"><strong>Email:</strong> ${email}</p>
          <p style="color: #374151;"><strong>University:</strong> ${university}</p>
          <p style="color: #374151;"><strong>Field:</strong> ${field}</p>
          <p style="color: #374151;"><strong>Country:</strong> ${country}</p>
          <a href="https://peervia.org/admin/applications" style="display: inline-block; background: #16a34a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 12px;">
            Review Application
          </a>
        </div>
      `,
    });
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}