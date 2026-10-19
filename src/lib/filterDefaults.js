// Built-in filter lists. They are used until an admin customises a list in /admin/filters.

// Mentor field groups: a mentor appears under a group when their subject contains a keyword.
export const DEFAULT_FIELDS = [
  { label: "Medicine", keywords: ["medic", "nursing", "dentist", "pharmac", "biomedic", "surgery", "clinical"] },
  { label: "Engineering", keywords: ["engineer", "aerospace", "mechatronic", "robotic"] },
  { label: "Law", keywords: ["=law", "legal", "jurisprudence"] },
  {
    label: "Computer Science",
    keywords: ["computer", "software", "informatics", "artificial intelligence", "=ai", "data science", "cyber", "information technology"],
  },
  { label: "Business", keywords: ["business", "management", "finance", "accounting", "marketing", "entrepreneur"] },
  { label: "Economics", keywords: ["economic", "econometric"] },
  { label: "Psychology", keywords: ["psycholog", "neuroscien", "behavior", "behaviour"] },
];

// The Career Field sidebar and question tag buttons on the Community page.
const keywordsFor = (label) => DEFAULT_FIELDS.find((f) => f.label === label)?.keywords ?? [];
export const DEFAULT_COMMUNITY_FIELDS = [
  { label: "Medicine", keywords: keywordsFor("Medicine") },
  { label: "Engineering", keywords: keywordsFor("Engineering") },
  { label: "Law", keywords: keywordsFor("Law") },
  { label: "Business", keywords: keywordsFor("Business") },
  { label: "Computer Science", keywords: keywordsFor("Computer Science") },
  { label: "Psychology", keywords: keywordsFor("Psychology") },
  { label: "Biology", keywords: ["biolog"] },
  { label: "Architecture", keywords: ["architect"] },
];

export const DEFAULT_COUNTRIES = [
  { value: "NL", label: "Netherlands", flag: "🇳🇱" },
  { value: "UK", label: "United Kingdom", flag: "🇬🇧" },
];

// The "Career Field" dropdown on the apply form and the admin mentor form.
export const DEFAULT_CAREER_FIELDS = [
  "Medicine",
  "Mechanical Engineering",
  "Business",
  "Computer Science",
  "Law",
  "Psychology",
];

// The "Year of Study" dropdown on the apply form and the admin mentor form.
export const YEARS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Graduate"];

// "medic, nursing, =law" -> ["medic", "nursing", "=law"]
export function parseKeywords(text) {
  return (text || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

// A keyword matches anywhere inside the subject text.
// A keyword starting with "=" (like "=law") only matches the whole word.
function keywordMatches(text, keyword) {
  const k = keyword.trim().toLowerCase();
  if (!k) return false;
  if (k.startsWith("=")) {
    const word = k.slice(1).trim();
    if (!word) return false;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`).test(text);
  }
  return text.includes(k);
}

// Which field groups a subject such as "Mechanical Engineering" belongs to.
export function getFieldGroups(subject, fields = DEFAULT_FIELDS) {
  const text = (subject || "").toLowerCase();
  const groups = fields
    .filter((f) => f.keywords.some((k) => keywordMatches(text, k)))
    .map((f) => f.label);
  return groups.length > 0 ? groups : ["Other"];
}