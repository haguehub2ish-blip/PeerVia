import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BOT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch|go-http|vercel|screenshot/i;

function parseUserAgent(ua) {
  const s = ua || "";

  const device = /ipad|tablet|(android(?!.*mobile))/i.test(s)
    ? "tablet"
    : /mobi|iphone|ipod|android/i.test(s)
      ? "mobile"
      : "desktop";

  let browser = "Other";
  if (/edg(e|a|ios)?\//i.test(s)) browser = "Edge";
  else if (/opr\/|opera/i.test(s)) browser = "Opera";
  else if (/samsungbrowser/i.test(s)) browser = "Samsung Internet";
  else if (/firefox|fxios/i.test(s)) browser = "Firefox";
  else if (/chrome|crios/i.test(s)) browser = "Chrome";
  else if (/safari/i.test(s)) browser = "Safari";

  let os = "Other";
  if (/iphone|ipad|ipod/i.test(s)) os = "iOS";
  else if (/android/i.test(s)) os = "Android";
  else if (/windows/i.test(s)) os = "Windows";
  else if (/cros/i.test(s)) os = "ChromeOS";
  else if (/mac os x|macintosh/i.test(s)) os = "macOS";
  else if (/linux/i.test(s)) os = "Linux";

  return { device, browser, os };
}

const cleanId = (value) => {
  const v = typeof value === "string" ? value.trim() : "";
  return /^[A-Za-z0-9_-]{8,64}$/.test(v) ? v : null;
};

const cleanText = (value, max) => {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  return v ? v.slice(0, max) : null;
};

export async function POST(request) {
  try {
    const userAgent = request.headers.get("user-agent") || "";
    if (!userAgent || BOT_PATTERN.test(userAgent)) {
      return Response.json({ ok: true, skipped: "bot" });
    }

    const body = await request.json().catch(() => null);
    const path = typeof body?.path === "string" ? body.path.split("?")[0].slice(0, 300) : "";
    if (!path.startsWith("/") || /^\/(admin|api)(\/|$)/.test(path)) {
      return Response.json({ ok: true, skipped: "path" });
    }

    // Referrer: keep only the host, and ignore our own site
    let referrer = null;
    if (typeof body.referrer === "string" && body.referrer) {
      try {
        const refHost = new URL(body.referrer).hostname.toLowerCase().replace(/^www\./, "");
        const ownHost = (request.headers.get("host") || "").toLowerCase().replace(/^www\./, "");
        if (refHost && refHost !== ownHost) referrer = refHost.slice(0, 100);
      } catch {
        referrer = null;
      }
    }

    // Optional: attach the logged-in user
    let userId = null;
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (token) {
      const { data } = await supabaseAdmin.auth.getUser(token);
      userId = data?.user?.id || null;
    }

    const { device, browser, os } = parseUserAgent(userAgent);
    const country = (request.headers.get("x-vercel-ip-country") || "").toUpperCase().slice(0, 2) || null;

    const { error } = await supabaseAdmin.from("page_views").insert({
      path,
      user_id: userId,
      visitor_id: cleanId(body.visitorId),
      session_id: cleanId(body.sessionId),
      referrer,
      utm_source: cleanText(body.utmSource, 60),
      device,
      browser,
      os,
      country,
    });

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}