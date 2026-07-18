"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/Components/Navbar";
import { courseGuides } from "@/data/courseGuides";
import { getSubjectStyle } from "@/data/mentors";

const countryFlags = { NL: "🇳🇱", UK: "🇬🇧" };
const countries = ["All", "NL", "UK"];

export default function CourseGuides() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFF9F2]" />}>
      <CourseGuidesContent />
    </Suspense>
  );
}

function CourseGuidesContent() {
  const searchParams = useSearchParams();
  const [activeCountries, setActiveCountries] = useState([]);
  const [activeSubjects, setActiveSubjects] = useState([]);

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
    <div className="min-h-screen bg-[#FFF9F2]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Course Guides</h1>
        <p className="text-gray-600 mb-6">
          Everything you need to know about different fields of study — how the course works, study pathways, entry requirements, and what to expect along the way.
        </p>

        {/* Country filter */}
        <div className="flex flex-wrap gap-2 mb-3">
          {countries.map((c) => {
            const isActive = c === "All" ? activeCountries.length === 0 : activeCountries.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleCountry(c)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${
                  isActive
                    ? "border-green-600 text-green-700 bg-green-50"
                    : "border-gray-300 text-gray-700 bg-white hover:border-gray-400"
                }`}
              >
                {c === "All" ? "All" : `${countryFlags[c]} ${c}`}
              </button>
            );
          })}
        </div>

        {/* Subject filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {subjects.map((s) => {
            const isActive = s === "All" ? activeSubjects.length === 0 : activeSubjects.includes(s);
            const style = s === "All" ? null : getSubjectStyle(s);

            return (
              <button
                key={s}
                onClick={() => toggleSubject(s)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${
                  s === "All"
                    ? isActive
                      ? "border-green-600 text-green-700 bg-green-50"
                      : "border-gray-300 text-gray-700 bg-white hover:border-gray-400"
                    : isActive
                    ? `${style.color} border-transparent ring-2 ring-offset-1 ring-gray-400`
                    : `${style.color} border-transparent opacity-60 hover:opacity-100`
                }`}
              >
                {s !== "All" && `${style.icon} `}
                {s}
              </button>
            );
          })}
        </div>

        {/* Course guide cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredGuides.map((guide) => (
            <div
              key={guide.id}
              className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition flex flex-col h-full"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-xl">
                  {guide.subject} in {guide.countryLabel}
                </h3>
                <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 shrink-0">
                  {guide.flag} {guide.country}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-4">{guide.description}</p>

              {guide.popularUniversities?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Popular universities
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {guide.popularUniversities.map((uni) => (
                      <span
                        key={uni}
                        className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-800"
                      >
                        🏛️ {uni}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Admission requirements
                </p>
                <p className="text-sm text-gray-600">{guide.admission}</p>
              </div>

              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Extracurriculars
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-0.5">
                  {guide.extracurriculars.map((activity) => (
                    <li key={activity}>{activity}</li>
                  ))}
                </ul>
              </div>

              {guide.languageRequirement && (
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                    <p className="text-xs font-semibold text-amber-800">
                      ⚠️ Important: {guide.languageRequirement}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}