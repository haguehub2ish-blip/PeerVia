"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/Components/Navbar";
import { getSubjectStyle, getFlag } from "@/data/mentors";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const filters = ["All", "Medicine", "Engineering", "Law", "Computer Science", "Business", "Psychology"];
const countries = ["All", "NL", "UK"];
const filterTabs = ["Field", "Country", "Sort"];
const filterTabStyles = {
  Field: "bg-primary text-white border-primary",
  Country: "bg-ink text-white border-ink",
  Sort: "bg-ink text-white border-ink",
};

export default function Mentors() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFF9F2]" />}>
      <MentorsContent />
    </Suspense>
  );
}

function MentorsContent() {
  const searchParams = useSearchParams();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState([]);
  const [activeCountries, setActiveCountries] = useState([]);
  const [activeLanguages, setActiveLanguages] = useState([]);
 const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState("");
 const [activeFilterTabs, setActiveFilterTabs] = useState(["Field"]);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    const subjectParam = searchParams.get("subject");
    if (subjectParam) {
      const validSubjects = subjectParam
        .split(",")
        .filter((s) => filters.includes(s));
      if (validSubjects.length > 0) {
        setActiveFilters(validSubjects);
      }
    }

    const countryParam = searchParams.get("country");
    if (countryParam) {
      setActiveCountries(countryParam.split(","));
    }

    const languageParam = searchParams.get("language");
    if (languageParam) {
      setActiveLanguages(languageParam.split(","));
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchMentors() {
      const { data, error } = await supabase.from("mentorss").select("*");
      if (error) {
        setFetchError(error.message || JSON.stringify(error));
      } else {
        setMentors(data);
      }
      setLoading(false);
    }
    fetchMentors();
  }, []);

  const toggleFilter = (filter) => {
    if (filter === "All") {
      setActiveFilters([]);
      return;
    }
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  const toggleCountry = (country) => {
    if (country === "All") {
      setActiveCountries([]);
      return;
    }
    setActiveCountries((prev) =>
      prev.includes(country) ? prev.filter((c) => c !== country) : [...prev, country]
    );
  };

  const toggleFilterTab = (tab) => {
    setActiveFilterTabs((prev) =>
      prev.includes(tab) ? prev.filter((t) => t !== tab) : [...prev, tab]
    );
  };

  const filteredMentors = mentors.filter((mentor) => {
    const matchesFilter =
      activeFilters.length === 0 || activeFilters.includes(mentor.subject);
    const matchesCountry =
      activeCountries.length === 0 || activeCountries.includes(mentor.country);
    const mentorLanguages =
      typeof mentor.languages === "string"
        ? mentor.languages.split(",").map((l) => l.trim())
        : mentor.languages || [];
    const matchesLanguage =
      activeLanguages.length === 0 ||
      activeLanguages.some((lang) => mentorLanguages.includes(lang));
    const matchesAvailability = !availableOnly || mentor.available;
    return matchesFilter && matchesCountry && matchesLanguage && matchesAvailability;
  });

const sortedMentors = [...filteredMentors].sort((a, b) => {
    if (!sortBy) return 0;
    return (Number(b[sortBy]) || 0) - (Number(a[sortBy]) || 0);
  });

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-3">
          Meet The Mentors
        </p>
        <h1 className="font-display text-3xl md:text-4xl text-ink mb-2">
          Verified mentors
        </h1>
        <p className="text-muted mb-6">
          University students at top Dutch and UK institutions. Every mentor is reviewed before joining.
        </p>

 {/* Filter tabs */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div className="flex gap-2">
              {filterTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => toggleFilterTab(tab)}
                  className={`font-label text-[11px] tracking-[0.08em] uppercase px-4 py-1.5 rounded-full border transition ${
                    activeFilterTabs.includes(tab)
                      ? filterTabStyles[tab]
                      : "bg-surface text-muted border-transparent hover:bg-border"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

             <button
              onClick={() => setAvailableOnly(!availableOnly)}
              className={`font-label text-[11px] tracking-[0.05em] uppercase flex items-center gap-2 px-4 py-1.5 rounded-full border transition ${
                availableOnly
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted bg-background hover:border-ink/30"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${availableOnly ? "bg-primary" : "bg-border"}`}></span>
              {availableOnly ? "Open for Booking" : "Open for Booking (Off)"}
            </button>
          </div>

          {activeFilterTabs.includes("Field") && (
            <div className="flex flex-wrap gap-2 mb-3">
              {filters.map((filter) => {
                const isActive =
                  filter === "All" ? activeFilters.length === 0 : activeFilters.includes(filter);

                return (
                  <button
                    key={filter}
                    onClick={() => toggleFilter(filter)}
                    className={`font-label text-[11px] tracking-[0.05em] uppercase px-4 py-1.5 rounded-full border transition ${
                      isActive
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted bg-background hover:border-ink/30"
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          )}

          {activeFilterTabs.includes("Country") && (
            <div className="flex flex-wrap gap-2 mb-3">
              {countries.map((c) => {
                const isActive = c === "All" ? activeCountries.length === 0 : activeCountries.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleCountry(c)}
                    className={`font-label text-[11px] tracking-[0.05em] uppercase px-4 py-1.5 rounded-full border transition ${
                      isActive
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted bg-background hover:border-ink/30"
                    }`}
                  >
                    {c === "All" ? "All countries" : c}
                  </button>
                );
              })}
            </div>
          )}

          {activeFilterTabs.includes("Sort") && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="font-label text-[11px] tracking-[0.05em] uppercase border border-border rounded-lg px-4 py-2 text-ink bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3"
            >
              <option value="">Default</option>
              <option value="rating">Highest rating</option>
              <option value="sessions">Most sessions</option>
              <option value="answers">Most answers</option>
            </select>
          )}
        </div>

       {/* Mentor cards */}
       {fetchError ? (
          <p className="text-red-600 font-semibold">Error: {fetchError}</p>
        ) : loading ? (
          <p className="text-muted">Loading Mentors...</p>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sortedMentors.map((mentor) => (
                   <Link
              key={mentor.id}
              href={`/mentors/${mentor.id}`}
              className="bg-surface border border-border rounded-2xl overflow-hidden hover:shadow-md transition"
            >
              {mentor.photo_url ? (
                <img
                  src={mentor.photo_url}
                  alt={mentor.name}
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <div className="w-full aspect-square bg-primary/10 text-primary flex items-center justify-center text-3xl font-display">
                  {mentor.initials}
                </div>
              )}
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-ink text-sm leading-tight truncate">{mentor.name}</p>
                  <span className={`flex items-center gap-1 text-[10px] font-semibold shrink-0 ${mentor.available ? "text-primary" : "text-muted"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${mentor.available ? "bg-primary" : "bg-muted"}`}></span>
                    {mentor.available ? "Open" : "Closed"}
                  </span>
                </div>
                <p className="font-label text-[10px] tracking-[0.05em] uppercase text-muted truncate">
                  {mentor.school} · {mentor.subject}
                </p>
                {mentor.bio && (
                  <p className="text-muted text-xs italic mt-1.5 line-clamp-2">{mentor.bio}</p>
                )}
              </div>
            </Link>
          ))}
       </div>
        )}
      </div>
    </div>
  );
}