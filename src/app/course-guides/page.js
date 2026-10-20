"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useFilterOptions } from "@/lib/useFilterOptions";

const MAX_COMPARE = 3; // most guides you can compare at once

export default function CourseGuides() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CourseGuidesContent />
    </Suspense>
  );
}

function CourseGuidesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
    const { countries: countryDefs } = useFilterOptions();
  const countries = useMemo(() => ["All", ...countryDefs.map((c) => c.value)], [countryDefs]);
  const countryFlags = useMemo(
    () => Object.fromEntries(countryDefs.map((c) => [c.value, c.flag])),
    [countryDefs]
  );
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState([]); // ids of the guides picked for comparing
  const [activeCountries, setActiveCountries] = useState([]);
  const [activeSubjects, setActiveSubjects] = useState([]);
  const [courseGuides, setCourseGuides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGuides() {
      const { data } = await supabase
        .from("course_guides")
        .select("*")
        .order("subject", { ascending: true });
      setCourseGuides(
        (data || []).map((g) => ({
          ...g,
          countryLabel: g.country_label,
          popularUniversities: g.popular_universities,
          languageRequirement: g.language_requirement,
          datePublished: g.date_published,
          imageUrl: g.image_url,
        }))
      );
      setLoading(false);
    }
    loadGuides();
  }, []);

  const subjects = ["All", ...new Set(courseGuides.map((g) => g.subject))];

  useEffect(() => {
    const countryParam = searchParams.get("country");
    if (countryParam) {
      const validCountries = countryParam.split(",").filter((c) => countries.includes(c));
      if (validCountries.length > 0) setActiveCountries(validCountries);
    }

    const fieldParam = searchParams.get("field");
    if (fieldParam) setActiveSubjects(fieldParam.split(","));
    }, [searchParams, countries]);

  const toggleCountry = (country) => {
    if (country === "All") {
      setActiveCountries([]);
      return;
    }
    setActiveCountries((prev) =>
      prev.includes(country) ? prev.filter((c) => c !== country) : [...prev, country]
    );
  };

  const toggleSubject = (subject) => {
    if (subject === "All") {
      setActiveSubjects([]);
      return;
    }
    setActiveSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const toggleCompareMode = () => {
    setCompareMode((on) => !on);
    setSelected([]);
  };

  const toggleSelected = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) return prev; // already full
      return [...prev, id];
    });
  };

  const goCompare = () => {
    router.push(`/course-guides/compare?ids=${selected.join(",")}`);
  };

  const filteredGuides = courseGuides.filter((guide) => {
    const matchesCountry = activeCountries.length === 0 || activeCountries.includes(guide.country);
    const matchesSubject = activeSubjects.length === 0 || activeSubjects.includes(guide.subject);
    return matchesCountry && matchesSubject;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 mb-8">
          <div>
            <p className="font-label text-xs uppercase tracking-[0.2em] text-primary mb-3">
              Field by field, country by country
            </p>
            <h1 className="font-display text-4xl text-ink mb-3">Course Guides</h1>
            <p className="text-muted max-w-xl leading-relaxed">
              Real pathways into the fields students actually apply for, written by the people already on them.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleCompareMode}
            data-tour="guides-compare"
            title="Put two or three guides side by side"
            className={`font-label text-xs uppercase tracking-wide px-5 py-3 rounded-lg border transition ${
              compareMode
                ? "border-border bg-surface text-ink hover:border-primary"
                : "border-primary bg-primary text-background hover:bg-primary-dark"
            }`}
          >
            {compareMode ? "Cancel" : "⇄ Compare guides"}
          </button>
        </div>

        {compareMode && (
          <p className="text-sm text-ink bg-primary/10 border border-primary/30 rounded-lg px-4 py-2.5 mb-6">
            Pick 2 or 3 guides to compare ({selected.length}/{MAX_COMPARE} chosen)
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          {countries.map((c) => {
            const isActive = c === "All" ? activeCountries.length === 0 : activeCountries.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleCountry(c)}
                className={`font-label text-xs uppercase tracking-wide px-4 py-1.5 rounded-full border transition ${
                  isActive
                    ? "border-primary bg-primary text-background"
                    : "border-border text-muted bg-surface hover:border-primary hover:text-primary"
                }`}
              >
                {c === "All" ? "All" : `${countryFlags[c]} ${c}`}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {subjects.map((s) => {
            const isActive = s === "All" ? activeSubjects.length === 0 : activeSubjects.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggleSubject(s)}
                className={`font-label text-xs uppercase tracking-wide px-4 py-1.5 rounded-full border transition ${
                  isActive
                    ? "border-primary bg-primary text-background"
                    : "border-border text-muted bg-surface hover:border-primary hover:text-primary"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p className="font-label text-sm uppercase tracking-wide text-muted">Loading course guides...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGuides.map((guide, guideIndex) => (
              <Link
                key={guide.id}
                data-tour={guideIndex === 0 ? "guides-first" : undefined}
                href={`/course-guides/${guide.id}`}
                onClick={(e) => {
                  if (!compareMode) return;
                  e.preventDefault();
                  toggleSelected(guide.id);
                }}
                className={`group rounded-2xl p-2 transition-colors duration-200 ${
                  selected.includes(guide.id)
                    ? "bg-primary/20 ring-2 ring-primary"
                    : compareMode && selected.length >= MAX_COMPARE
                      ? "bg-border/40 opacity-60"
                      : "bg-border/40 hover:bg-primary/20"
                }`}
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-surface relative">
                  {guide.imageUrl ? (
                    <img
                      src={guide.imageUrl}
                      alt={`${guide.subject} in ${guide.countryLabel}`}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface to-border/60">
                      <span className="font-display text-4xl text-primary/30">
                        {guide.subject?.charAt(0)}
                      </span>
                    </div>
                  )}
                  <span className="absolute top-2 right-2 font-label text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-background/90 text-ink backdrop-blur-sm">
                    {guide.flag} {guide.country}
                  </span>
                  {compareMode && (
                    <span
                      aria-hidden="true"
                      className={`absolute top-2 left-2 w-6 h-6 rounded-md border-2 flex items-center justify-center text-sm font-bold ${
                        selected.includes(guide.id)
                          ? "bg-primary border-primary text-background"
                          : "bg-background/90 border-ink/40 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  )}
                </div>

                <div className="bg-surface rounded-xl -mt-4 relative px-4 pt-4 pb-4">
                  <h3 className="font-display text-lg text-ink leading-tight mb-1.5">
                    <span className="font-semibold">{guide.subject}</span>{" "}
                    <span className="text-muted font-normal">in {guide.countryLabel}</span>
                  </h3>

                  <p className="text-sm text-ink/70 line-clamp-2 leading-relaxed mb-3">
                    {guide.description}
                  </p>

                  <div className="border-t border-border pt-2.5">
                    <span className="font-label text-[10px] uppercase tracking-[0.2em] text-ink/60 group-hover:text-primary transition-colors">
                      {compareMode
                        ? selected.includes(guide.id)
                          ? "Selected ✓"
                          : "Tap to select"
                        : "Read the full guide →"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {compareMode && <div className="h-24" />}
      </div>

      {compareMode && (
        <div className="fixed bottom-4 left-4 right-20 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-30 flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/95 backdrop-blur px-4 py-3 shadow-xl">
          <p className="text-sm text-ink whitespace-nowrap">
            {selected.length === 0 ? "Select guides" : `${selected.length} selected`}
            {selected.length === MAX_COMPARE && <span className="text-muted"> (max)</span>}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelected([])}
              disabled={selected.length === 0}
              className="text-sm text-muted hover:text-primary transition disabled:opacity-40"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={goCompare}
              disabled={selected.length < 2}
              className="bg-primary text-background font-label text-xs uppercase tracking-wide px-4 py-2.5 rounded-lg hover:bg-primary-dark transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Compare
            </button>
          </div>
        </div>
      )}
    </div>
  );
}