import { subjectStyles, countryFlags, languageFlags } from "@/data/mentors";
import { courseGuides } from "@/data/courseGuides";

// Shared option lists, so every page offers the same wide range as the apply form.

const dutchUniversities = [
  "University of Amsterdam",
  "Vrije Universiteit Amsterdam",
  "Utrecht University",
  "Eindhoven University of Technology",
  "University of Twente",
  "University of Groningen",
  "Radboud University",
  "Maastricht University",
  "Wageningen University & Research",
  "Open University of the Netherlands",
  "Nyenrode Business University",
  "University of Humanistic Studies",
  "Protestant Theological University",
  "Amsterdam University of Applied Sciences",
  "Rotterdam University of Applied Sciences",
  "HU University of Applied Sciences Utrecht",
  "The Hague University of Applied Sciences",
  "Fontys University of Applied Sciences",
  "Hanze University of Applied Sciences",
  "Avans University of Applied Sciences",
  "Saxion University of Applied Sciences",
  "Windesheim University of Applied Sciences",
  "Inholland University of Applied Sciences",
  "HAN University of Applied Sciences",
  "Zuyd University of Applied Sciences",
  "NHL Stenden University of Applied Sciences",
  "Breda University of Applied Sciences",
  "HZ University of Applied Sciences",
];

export const ALL_UNIVERSITIES = [
  ...new Set([
    ...courseGuides.flatMap((c) => c.popularUniversities),
    ...dutchUniversities,
  ]),
].sort();

export const ALL_LANGUAGES = Object.keys(languageFlags);
export const ALL_FIELDS = Object.keys(subjectStyles);
export const ALL_COUNTRIES = Object.keys(countryFlags);

// Joins several lists into one: no duplicates, sorted A to Z.
export function mergeOptions(...lists) {
  return [...new Set(lists.flat().filter(Boolean))].sort((a, b) => a.localeCompare(b));
}