// AI help chatbot for PeerVia. Uses Groq's free tier (no credit card needed).
// Needs one environment variable: GROQ_API_KEY
// Optional: GROQ_MODEL (defaults to llama-3.3-70b-versatile)

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

// If the main model hits its free daily limit (or is retired), these are tried
// in order. Groq counts limits per model, so each one adds more free capacity.
// Optional: GROQ_FALLBACK_MODELS="model-a,model-b"
const FALLBACK_MODELS = (process.env.GROQ_FALLBACK_MODELS || "llama-3.1-8b-instant")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const MODELS = [MODEL, ...FALLBACK_MODELS.filter((m) => m !== MODEL)];

const MAX_MESSAGES = 10; // only the last 10 messages are sent to the AI
const MAX_CHARS = 1000; // max length of one message

// Simple per-visitor limit so nobody can burn through the free quota.
// (In-memory, so it's best-effort on Vercel, but good enough for now.)
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;
const hits = new Map();

function tooManyRequests(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (!times.some((t) => now - t < WINDOW_MS)) hits.delete(key);
    }
  }
  return false;
}

const SYSTEM_PROMPT = `You are the PeerVia Assistant, the friendly help chatbot on peervia.org.

ABOUT PEERVIA
- PeerVia gives high school students free, honest guidance from real university students (called mentors) about courses, universities and student life.
- Everything is completely free. Browsing needs no sign-up. Mentors are verified.
- Students can find mentors on the Mentors page (/mentors) and request a call with a mentor from their profile.
- Students under 18 need a parent or guardian to approve their account, and the parent approves each call request and must be with the student during calls.
- Course Guides (/course-guides) are free to read in full and show what studying a specific course is really like. There is also a compare tool (/course-guides/compare).
- The Community page (/community) is where students support each other.
- University students can apply to become a mentor at /apply.
- Anyone can help in other ways at /volunteer (roles: spokesperson, course guide contributor, mentor recruiter, content and social media, school outreach, events, design/tech/translation, or something else).
- Learn more about the mission at /about. Sign up at /signup, log in at /login.

HOW TO ANSWER
- Be warm, short and clear: usually 2 to 4 sentences. Many users are teenagers, so keep the language simple and friendly.
- Point people to the right page of the site when it helps, written like /mentors.
- You may give light general advice about choosing a course or university, but make clear that real advice from a mentor is the best next step.
- If you are not sure about something specific to PeerVia (exact rules, dates, availability, a particular mentor, account problems), do NOT guess. Say you're not sure and suggest they message the team using the "Message the team" button at the bottom of this chat.
- Never invent mentors, universities, statistics, prices or policies.
- Never ask for or repeat passwords or other sensitive personal data.
- Stay on topic: PeerVia, choosing courses and universities, and student life. Politely decline anything unrelated.
- If someone seems to be in distress or crisis, respond kindly, encourage them to talk to a trusted adult or local emergency or support services, and do not try to handle it yourself.
- Reply in the language the user writes in.`;

export async function POST(request) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json(
      { error: "The assistant isn't set up yet." },
      { status: 500 }
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (tooManyRequests(ip)) {
    return Response.json(
      { error: "You're sending messages quite fast. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: "No message received." }, { status: 400 });
  }

  // Only accept plain user/assistant text, and cap the length
  const messages = body.messages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim()
    )
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "No message received." }, { status: 400 });
  }

  try {
    let sawRateLimit = false;

    for (const model of MODELS) {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
          temperature: 0.5,
          max_tokens: 400,
        }),
      });

      // Limit reached, model gone, or Groq having a moment: try the next model
      if (res.status === 429 || res.status === 404 || res.status >= 500) {
        if (res.status === 429) sawRateLimit = true;
        console.error(`Groq model ${model} unavailable:`, res.status);
        continue;
      }

      if (!res.ok) {
        console.error("Groq error:", model, res.status, await res.text());
        continue;
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content?.trim();
      if (reply) return Response.json({ reply });
    }

    // Every model failed
    if (sawRateLimit) {
      return Response.json(
        { error: "The assistant is busy right now. Please try again in a minute." },
        { status: 429 }
      );
    }
    return Response.json(
      { error: "The assistant couldn't answer right now. Please try again." },
      { status: 502 }
    );
  } catch (err) {
    console.error("Chat error:", err);
    return Response.json(
      { error: "The assistant couldn't answer right now. Please try again." },
      { status: 500 }
    );
  }
}