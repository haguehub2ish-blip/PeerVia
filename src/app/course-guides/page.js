"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const countryFlags = { NL: "🇳🇱", UK: "🇬🇧" };
const countries = ["All", "NL", "UK"];

export default function CourseGuides() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CourseGuidesContent />
    </Suspense>
  );
}

function CourseGuidesContent() {
  const searchParams = useSearchParams();
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
  }, [searchParams]);

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

  const filteredGuides = courseGuides.filter((guide) => {
    const matchesCountry = activeCountries.length === 0 || activeCountries.includes(guide.country);
    const matchesSubject = activeSubjects.length === 0 || activeSubjects.includes(guide.subject);
    return matchesCountry && matchesSubject;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-12">
        <p className="font-label text-xs uppercase tracking-[0.2em] text-primary mb-3">
          Field by field, country by country
        </p>
        <h1 className="font-display text-4xl text-ink mb-3">Course Guides</h1>
        <p className="text-muted max-w-xl mb-8 leading-relaxed">
          Real pathways into the fields students actually apply for, written by the people already on them.
        </p>

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

        <div className="flex flex-wrap gap-2 mb-10">
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
            {filteredGuides.map((guide) => (
              <Link
                key={guide.id}
                href={`/course-guides/${guide.id}`}
                className="group bg-border/40 hover:bg-primary/20 rounded-2xl p-2 transition-colors duration-200"
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
                      Read the full guide →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}