
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  try {
    const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
    if (!token) return Response.json({error:"Not authenticated"},{status:401});
    const {data,error}=await admin.auth.getUser(token);
    if (error||!data?.user) return Response.json({error:"Invalid session"},{status:401});

    const body=await request.json();
    const user=data.user;
    const automatic=body.automatic===true;
    const category=String(body.category||(automatic?"authorization":"manual")).slice(0,50);
    const message=String(body.message||body.reason||"Mentor dashboard access issue").slice(0,1000);
    const details=String(body.details||"").slice(0,3000);
    const incidentId=crypto.randomUUID();

    const result=await resend.emails.send({
      from:"PeerVia <info@peervia.org>",
      to:"info.peervia@gmail.com",
      subject:`PeerVia ${automatic?"automatic diagnostic":"issue report"} [${category}]`,
      text:[
        `Incident ID: ${incidentId}`,
        `Time: ${new Date().toISOString()}`,
        `Type: ${automatic?"Automatic diagnostic":"User report"}`,
        `Category: ${category}`,
        `User ID: ${user.id}`,
        `Email: ${user.email||"Unavailable"}`,
        `Role: ${user.user_metadata?.role||"Not set"}`,
        `Personal email: ${user.user_metadata?.personal_email||"Not set"}`,
        `Email confirmed: ${user.email_confirmed_at?"Yes":"No"}`,
        `Page: ${String(body.page||"/mentor-account/dashboard").slice(0,300)}`,
        "",
        "Issue:",
        message,
        "",
        "Details:",
        details||"None provided",
        "",
        "No permissions or account settings were changed."
      ].join("\n")
    });

    if (result.error) {
      console.error("Mentor diagnostic email failed:",result.error);
      return Response.json({error:"Email delivery failed",incidentId},{status:502});
    }
    return Response.json({success:true,incidentId});
  } catch (error) {
    console.error("Mentor diagnostic route failed:",error);
    return Response.json({error:"Could not submit diagnostic report"},{status:500});
  }
}
