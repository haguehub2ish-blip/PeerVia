import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SCHEMA_INSTRUCTIONS = `
You extract structured content from a PDF course/career guide for a student mentorship platform, and output ONLY a valid JSON object — no markdown fences, no commentary, nothing before or after it.

CRITICAL RULE: Copy text from the PDF word-for-word wherever possible. Do NOT paraphrase, summarize, reword, or rewrite the source text. Your job is to REORGANIZE the existing sentences into the right fields below, not to rewrite them. Only lightly trim a passage if it's too long to fit a field naturally (e.g. combining multiple paragraphs under one glossary term) — even then, keep the original wording and only cut, never rephrase.

Match this exact shape (use empty string "" or empty array [] for anything not present in the PDF — never invent facts):

{
  "subject": string,               // e.g. "Medicine" — copy the subject name as written
  "country": "NL" | "UK" | "",     // best guess based on content; leave "" if genuinely unclear or neither
  "description": string,           // copy the intro/overview paragraph(s) from the PDF verbatim
  "popularUniversities": string,   // comma-separated list, university names copied exactly as written
  "admission": string,             // copy the admission requirements text verbatim
  "languageRequirement": string,   // copy the language requirement sentence(s) verbatim, or "" if none mentioned
  "journeySteps": [{ "title": string, "description": string }],       // title and description copied verbatim from the source
  "applicationRules": [{ "title": string, "description": string }],   // copied verbatim
  "entryPaths": [{ "title": string, "points": string }],              // points is newline-separated, each line copied verbatim
  "pipelineStages": [{ "title": string, "description": string }],     // copied verbatim
  "specializations": [{ "category": string, "examples": string, "duration": string, "competitiveness": string }], // copied verbatim from any table
  "careerSteps": [{ "title": string, "description": string }],        // copied verbatim
  "glossary": [{ "term": string, "definition": string }],             // term and definition copied verbatim
  "officialLinks": [{ "label": string, "url": string }]               // label copied verbatim, url exactly as written
}
`;

async function callGeminiWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.status !== 503) return response;

    const waitMs = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  return fetch(url, options); // final attempt, let it fail naturally if still down
}

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
  if (userData.user.email !== process.env.ADMIN_EMAIL) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Gemini API key not configured" }, { status: 500 });
  }

  try {
    const response = await callGeminiWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: SCHEMA_INSTRUCTIONS },
                { inlineData: { mimeType: "application/pdf", data: base64 } },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return Response.json({ error: `Gemini API error: ${errText}` }, { status: 500 });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return Response.json({ error: "No response from Gemini" }, { status: 500 });
    }

    const parsed = JSON.parse(rawText);
    return Response.json({ data: parsed });
  } catch (err) {
    return Response.json({ error: "Failed to parse PDF: " + err.message }, { status: 500 });
  }
}