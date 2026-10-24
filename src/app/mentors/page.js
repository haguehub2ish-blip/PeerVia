"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/Components/Navbar";
import { getSubjectStyle, getFlag } from "@/data/mentors";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useFilterOptions } from "@/lib/useFilterOptions";
import { getFieldGroups } from "@/lib/filterDefaults";
import MentorMatch, { scoreMentor } from "@/Components/MentorMatch";
import { useSavedMentors } from "@/lib/useSavedMentors";

// Each group matches any subject text containing one of its keywords,
// so "Mechanical Engineering" and "Law, Psychology" are handled correctly.


const filterTabs = ["Field", "Country", "University", "Language", "Sort"];
const filterTabStyles = {
  Field: "bg-primary text-white border-primary",
  Country: "bg-ink text-white border-ink",
  University: "bg-ink text-white border-ink",
  Language: "bg-ink text-white border-ink",
  Sort: "bg-ink text-white border-ink",
};

export default function Mentors() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <MentorsContent />
    </Suspense>
  );
}

function MentorsContent() {
  const searchParams = useSearchParams();
    const { fields: fieldDefs, countries: countryDefs, hasCustomCountries } = useFilterOptions();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState([]);
  const [activeCountries, setActiveCountries] = useState([]);
  const [activeLanguages, setActiveLanguages] = useState([]);
    const [activeSchool, setActiveSchool] = useState("");
      const [searchText, setSearchText] = useState("");
 const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState("");
 const [activeFilterTabs, setActiveFilterTabs] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  
const [showMatch, setShowMatch] = useState(false);
const [currentUser, setCurrentUser] = useState(null);
const [savedMentorNames, setSavedMentorNames] = useState([]);
const [savingMentorName, setSavingMentorName] = useState(null);
const [matchAnswers, setMatchAnswers] = useState(null);
const [recommendedOnly, setRecommendedOnly] = useState(false); // now means "Saved mentors only"
const [visibleCount, setVisibleCount] = useState(9);
const loadMoreRef = useRef(null);
const { user: savedUser, savedIds } = useSavedMentors();


  useEffect(() => {
    const subjectParam = searchParams.get("subject");
    if (subjectParam) {
      const validSubjects = [
        ...new Set(subjectParam.split(",").flatMap((s) => getFieldGroups(s.trim(), fieldDefs))),
      ].filter((g) => g !== "Other");
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
            const schoolParam = searchParams.get("school") || "";
    setActiveSchool(schoolParam);
    if (schoolParam) {
      setActiveFilterTabs((prev) => (prev.includes("University") ? prev : [...prev, "University"]));
    }
    }, [searchParams, fieldDefs]);



  useEffect(() => {
    async function fetchMentors() {
            const { data, error } = await supabase.from("mentorss").select("*").eq("activated", true);
      if (error) {
        setFetchError(error.message || JSON.stringify(error));
      } else {
        setMentors(data);
      }
      setLoading(false);
    }
    fetchMentors();
  }, []);


  useEffect(() => {
    let cancelled = false;

    async function loadSavedMentors() {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;

      const user = error ? null : data?.user;
      setCurrentUser(user);

      const saved = user?.user_metadata?.emailPreferences?.mentors;
      setSavedMentorNames(Array.isArray(saved) ? saved : []);
    }

    loadSavedMentors();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadSavedMentors();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);


  useEffect(() => {
    let cancelled = false;

    async function loadSavedMatchAnswers() {
      const { data, error } = await supabase.auth.getUser();

      if (cancelled) return;

      const answers = error ? null : data?.user?.user_metadata?.matchAnswers;

      setMatchAnswers(
        answers && typeof answers === "object" ? answers : null
      );
    }

    loadSavedMatchAnswers();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadSavedMatchAnswers();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
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


  async function toggleSavedMentor(mentorName) {
    if (!currentUser || savingMentorName) return;

    const wasSaved = savedMentorNames.includes(mentorName);
    const nextSaved = wasSaved
      ? savedMentorNames.filter((name) => name !== mentorName)
      : [...savedMentorNames, mentorName];

    setSavingMentorName(mentorName);

    const previousSaved = savedMentorNames;
    setSavedMentorNames(nextSaved);

    const existingPreferences =
      currentUser.user_metadata?.emailPreferences || {};

    const { data, error } = await supabase.auth.updateUser({
      data: {
        emailPreferences: {
          ...existingPreferences,
          mentors: nextSaved,
        },
      },
    });

    if (error) {
      setSavedMentorNames(previousSaved);
      alert("Couldn't update your recommended mentors. Please try again.");
    } else if (data?.user) {
      setCurrentUser(data.user);
    }

    setSavingMentorName(null);
  }


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


const recommendedMentorIds = new Set(
  matchAnswers
    ? (matchAnswers.availableOnly
        ? mentors.filter((m) => m.available)
        : mentors
      )
        .map((mentor) => ({
          mentor,
          ...scoreMentor(mentor, matchAnswers, fieldDefs),
        }))
        .sort(
          (a, b) =>
            b.percent - a.percent ||
            (Number(b.mentor.rating) || 0) -
              (Number(a.mentor.rating) || 0)
        )
        .slice(0, 3)
        .map(({ mentor }) => String(mentor.id))
    : []
);


  const filteredMentors = mentors.filter((mentor) => {
    const matchesFilter =
      activeFilters.length === 0 ||
            getFieldGroups(mentor.subject, fieldDefs).some((g) => activeFilters.includes(g));
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
           const norm = (s) => (s || "").trim().replace(/\s+/g, " ").toLowerCase();
    const matchesSchool = !activeSchool || norm(mentor.school) === norm(activeSchool);
        const words = searchText.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const haystack = [mentor.name, mentor.school, mentor.subject, mentor.course, mentor.country]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = words.every((w) => haystack.includes(w));
    
const matchesRecommended =
  !recommendedOnly || savedIds.includes(String(mentor.id));

return (
  matchesFilter &&
  matchesCountry &&
  matchesLanguage &&
  matchesAvailability &&
  matchesSchool &&
  matchesSearch &&
  matchesRecommended
);

  });

const sortedMentors = [...filteredMentors].sort((a, b) => {
    if (!sortBy) return 0;
    return (Number(b[sortBy]) || 0) - (Number(a[sortBy]) || 0);
  });

  // Only show the first batch of mentors, and add more as the visitor scrolls
  const visibleMentors = sortedMentors.slice(0, visibleCount);

  // Go back to the first 9 whenever a filter, search or sort changes
  useEffect(() => {
    setVisibleCount(9);
  }, [activeFilters, activeCountries, activeLanguages, activeSchool, searchText, availableOnly, sortBy, recommendedOnly]);

  // When the "Loading more" marker near the bottom comes into view, show 9 more
  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((c) => c + 9);
      },
      { rootMargin: "300px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, sortedMentors.length, loading]);

  const norm = (s) => (s || "").trim().replace(/\s+/g, " ").toLowerCase();
  const uniq = (list) => [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const hasOtherMentors = mentors.some((m) => getFieldGroups(m.subject, fieldDefs).includes("Other"));
  const fieldOptions = [
    "All",
        ...fieldDefs.map((f) => f.label),
    ...(hasOtherMentors ? ["Other"] : []),
  ];
      const listedCountries = countryDefs.map((c) => c.value);
  const countryOptions = [
    "All",
    ...listedCountries,
    ...(hasCustomCountries
      ? []
      : uniq(mentors.map((m) => m.country)).filter((c) => !listedCountries.includes(c))),
  ];
  
  const schoolMap = new Map();
  mentors.forEach((m) => {
    const name = (m.school || "").trim().replace(/\s+/g, " ");
    if (name && !schoolMap.has(name.toLowerCase())) schoolMap.set(name.toLowerCase(), name);
  });
  const schoolOptions = [...schoolMap.values()].sort((a, b) => a.localeCompare(b));

  const languageOptions = uniq(
    mentors.flatMap((m) =>
      typeof m.languages === "string"
        ? m.languages.split(",").map((l) => l.trim())
        : m.languages || []
    )
  );

  const hasActiveFilters = Boolean(
    activeFilters.length ||
      activeCountries.length ||
      activeLanguages.length ||
      availableOnly ||
      activeSchool ||
      recommendedOnly ||
      searchText.trim()
  );

  
function clearAllFilters() {
    setActiveFilters([]);
    setActiveCountries([]);
    setActiveLanguages([]);
    setAvailableOnly(false);
    setActiveSchool("");
    setSearchText("");
    setRecommendedOnly(false);
  }


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
        <div className="flex flex-wrap items-center gap-3 mb-6 md:gap-52.5">
          <p className="text-muted">
            University students at top Dutch and UK institutions. Every mentor is reviewed before joining.
          </p>

          <button
            type="button"
            onClick={() => setShowMatch((v) => !v)}  
className="bg-primary text-white font-label text-[11px] tracking-[0.08em] uppercase px-5 py-2 rounded-full whitespace-nowrap ml-auto"
          >
            {showMatch ? "Close mentor match" : "Find recommended mentors"}
          </button>
        </div>

        {showMatch && !loading && !fetchError && (
          <div className="mb-6">
            <MentorMatch mentors={mentors} />
          </div>
        )}

            <div className="mb-5">
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by name, university, course or field…"
            className="w-full border border-border rounded-xl bg-background px-5 py-3 text-ink placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>   

 {/* Filter tabs */}
        <div data-tour="mentors-filters" className="mb-8">
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

            <div className="flex items-center gap-2 flex-wrap">
              {savedUser && (
                <button
                  type="button"
                  onClick={() => setRecommendedOnly((prev) => !prev)}
                  className={`font-label text-[11px] tracking-[0.05em] uppercase flex items-center gap-2 px-4 py-1.5 rounded-full border transition ${
                    recommendedOnly
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted bg-background hover:border-ink/30"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      recommendedOnly ? "bg-primary" : "bg-border"
                    }`}
                  />
                  Saved Mentors{savedIds.length > 0 ? ` (${savedIds.length})` : ""}
                </button>
              )}

              <button
                type="button"
                onClick={() => setAvailableOnly(!availableOnly)}
                className={`font-label text-[11px] tracking-[0.05em] uppercase flex items-center gap-2 px-4 py-1.5 rounded-full border transition ${
                  availableOnly
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted bg-background hover:border-ink/30"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    availableOnly ? "bg-primary" : "bg-border"
                  }`}
                />
                {availableOnly ? "Open for Booking" : "Open for Booking (Off)"}
              </button>
            </div>
          </div>

          {activeFilterTabs.includes("Field") && (
            <div className="flex flex-wrap gap-2 mb-3">
              {fieldOptions.map((filter) => {
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
              {countryOptions.map((c) => {
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

          {activeFilterTabs.includes("University") && (
            <select
              value={schoolOptions.find((s) => norm(s) === norm(activeSchool)) || ""}
              onChange={(e) => setActiveSchool(e.target.value)}
              className="font-label text-[11px] tracking-[0.05em] uppercase border border-border rounded-lg px-4 py-2 text-ink bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3 max-w-full"
            >
              <option value="">All universities</option>
              {schoolOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}

          {activeFilterTabs.includes("Language") && (
            <div className="flex flex-wrap gap-2 mb-3">
              {languageOptions.map((l) => {
                const isActive = activeLanguages.includes(l);
                return (
                  <button
                    key={l}
                    onClick={() =>
                      setActiveLanguages((prev) =>
                        prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]
                      )
                    }
                    className={`font-label text-[11px] tracking-[0.05em] uppercase px-4 py-1.5 rounded-full border transition ${
                      isActive
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted bg-background hover:border-ink/30"
                    }`}
                  >
                    {l}
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

        {!loading && !fetchError && (
          <div className="flex items-center justify-between mb-4">
            <p className="font-label text-[11px] tracking-[0.08em] uppercase text-muted">
              {sortedMentors.length} {sortedMentors.length === 1 ? "mentor" : "mentors"}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-sm text-muted underline underline-offset-4 hover:text-ink"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {!loading && !fetchError && sortedMentors.length === 0 && (
          <div className="border border-border rounded-2xl bg-surface p-10 text-center">
            <p className="font-display text-xl text-ink mb-1">
              {recommendedOnly && savedIds.length === 0
                ? "You haven't saved any mentors yet"
                : "No mentors match those filters"}
            </p>
            <p className="text-muted text-sm">
              {recommendedOnly && savedIds.length === 0
                ? "Open a mentor's profile and tap save to add them here or take the recommended mentors test."
                : "Try a different search, or clear the filters."}
            </p>
          </div>
        )}

       {/* Mentor cards */}
       {fetchError ? (
          <p className="text-red-600 font-semibold">Error: {fetchError}</p>
        ) : loading ? (
          <p className="text-muted">Loading Mentors...</p>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {visibleMentors.map((mentor, mentorIndex) => (
                   <Link
              key={mentor.id}
              data-tour={mentorIndex === 0 ? "mentors-first" : undefined}
              href={`/mentors/${mentor.id}`}
              className="relative bg-surface border border-border rounded-2xl overflow-hidden hover:shadow-md transition"
            >
              {mentor.photo_url ? (
                <img
                  src={mentor.photo_url}
                  alt={mentor.name}
                  loading="lazy"
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
          {visibleCount < sortedMentors.length && (
            <div ref={loadMoreRef} className="col-span-full py-6 text-center text-muted text-sm">
              Loading more mentors...
            </div>
          )}
       </div>
        )}
      </div>
    </div>
  );
}