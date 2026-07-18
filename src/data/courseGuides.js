export const courseGuides = [
  {
    id: "medicine-nl",
    subject: "Medicine",
    country: "NL",
    countryLabel: "The Netherlands",
    flag: "🇳🇱",
    description:
      "Dutch medicine (Geneeskunde) is a 6-year programme combining pre-clinical coursework with hospital placements, admitted through a numerus fixus selection process rather than grades alone.",
    popularUniversities: ["Erasmus University Rotterdam", "Leiden University"],
    admission:
      "Numerus fixus applies — admission is via decentrale selectie (motivation letters, assessments, sometimes interviews) rather than grades alone.",
    languageRequirement: "Dutch C1 proficiency required for most programmes.",
    extracurriculars: ["Rotterdam School of Management network", "Leiden Model United Nations", "Faculty-run study associations"],
    writtenBy: "Written by a 3rd-year Medicine student at Erasmus University Rotterdam",
  },
  {
    id: "medicine-uk",
    subject: "Medicine",
    country: "UK",
    countryLabel: "the UK",
    flag: "🇬🇧",
    description:
      "UK medicine is a 5-6 year MBBS/MBChB degree with early clinical exposure, admitted through UCAS plus an admissions test.",
    popularUniversities: ["University of Oxford"],
    admission:
      "Highly competitive. Requires A-Levels (typically A*AA or higher), the BMAT/UCAT admissions test, and interviews under the college system.",
    languageRequirement: null,
    extracurriculars: ["Oxford Union debating society", "College sports (rowing, rugby)", "Over 400 student clubs and societies"],
    writtenBy: "Written by a 2nd-year Medicine student at the University of Oxford",
  },
  {
    id: "law-nl",
    subject: "Law",
    country: "NL",
    countryLabel: "The Netherlands",
    flag: "🇳🇱",
    description:
      "Dutch Law (Rechtsgeleerdheid) is a 3-year bachelor's covering Dutch and EU law, with room to specialise from the second year onward.",
    popularUniversities: ["Tilburg University", "Leiden University"],
    admission:
      "Generally accessible with a relevant VWO diploma; some programmes apply a weighted decentrale selectie process.",
    languageRequirement: "Dutch C1 proficiency required for Dutch-taught tracks.",
    extracurriculars: ["Debating society", "Honours College", "Faculty-run study associations"],
    writtenBy: "Written by a 2nd-year Law student at Tilburg University",
  },
  {
    id: "engineering-nl",
    subject: "Engineering",
    country: "NL",
    countryLabel: "The Netherlands",
    flag: "🇳🇱",
    description:
      "Dutch engineering degrees are technically rigorous, project-based bachelor's programmes with strong industry links.",
    popularUniversities: ["TU Delft"],
    admission:
      "Requires a strong Maths and Physics background (VWO profile N&T or N&G with extra Physics). Numerus fixus applies to some programmes.",
    languageRequirement: null,
    extracurriculars: ["Formula Student racing team", "Delft Aerospace Rocket Engineering (DARE)", "Study associations per faculty"],
    writtenBy: "Written by a final-year Engineering student at TU Delft",
  },
];

// Flat, de-duplicated list of real university names — used by settings/signup
// autocomplete, since courseGuides is now organized by course+country, not by university.
export const allUniversityNames = [
  ...new Set(courseGuides.flatMap((g) => g.popularUniversities)),
];