export const mentors = [
  {
    name: "Sara van der Berg",
    initials: "SV",
    school: "UMC Utrecht",
    year: "Year 3",
    verified: true,
    subject: "Medicine",
    country: "NL",
    languages: ["English", "Dutch"],
    bio: "6-year medicine programme in Utrecht. Went through decentrale selectie after a numerus fixus rejection first time. Happy to talk about the reality of clinical years.",
    sessions: 41,
    answers: 28,
    rating: 4.9,
    available: true,
  },
  {
    name: "James Adeyemi",
    initials: "JA",
    school: "Imperial College London",
    year: "Year 4",
    verified: true,
    subject: "Mechanical Engineering",
    country: "UK",
    languages: ["English", "German"],
    bio: "MEng Mechanical Engineering at Imperial. Previously interned at Rolls-Royce and a consulting firm. Honest about the debt-vs-return question.",
    sessions: 33,
    answers: 22,
    rating: 4.8,
    available: false,
  },
  {
    name: "Mia Kowalski",
    initials: "MK",
    school: "Leiden University",
    year: "Year 2",
    verified: true,
    subject: "Law",
    country: "NL",
    languages: ["English", "Polish"],
    bio: "International student who got into Leiden law through decentrale selectie with a foreign diploma. Can guide you through the Dutch application process.",
    sessions: 19,
    answers: 15,
    rating: 5.0,
    available: true,
  },
  {
    name: "Amara Okafor",
    initials: "AO",
    school: "University of Amsterdam",
    year: "Year 4",
    verified: true,
    subject: "Business",
    country: "NL",
    languages: ["English", "French"],
    bio: "Business Administration student, went through the Dutch application system as an international student. Ask me anything about relocating and studying in NL.",
    sessions: 33,
    answers: 21,
    rating: 4.6,
    available: true,
  },
];

export const subjectStyles = {
  Medicine: { color: "bg-red-100 text-red-800", icon: "🩺" },
  "Mechanical Engineering": { color: "bg-blue-100 text-blue-800", icon: "⚙️" },
  Business: { color: "bg-yellow-100 text-yellow-800", icon: "💼" },
  "Computer Science": { color: "bg-purple-100 text-purple-800", icon: "💻" },
  Law: { color: "bg-gray-200 text-gray-800", icon: "⚖️" },
  Psychology: { color: "bg-pink-100 text-pink-800", icon: "🧠" },
};

export function getSubjectStyle(subject) {
  return subjectStyles[subject] || { color: "bg-gray-100 text-gray-700", icon: "📘" };
}

export const countryFlags = {
  NL: "🇳🇱",
  UK: "🇬🇧",
  US: "🇺🇸",
  DE: "🇩🇪",
  FR: "🇫🇷",
  BE: "🇧🇪",
  CA: "🇨🇦",
};

export function getFlag(country) {
  return countryFlags[country] || "🌍";
}