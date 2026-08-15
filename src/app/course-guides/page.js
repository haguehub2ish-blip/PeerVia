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
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5 transition flex flex-col h-full"
            >
              <div className={`px-6 py-4 flex items-center justify-between gap-3 ${getSubjectStyle(guide.subject).color}`}>
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center text-base shrink-0">
                    {getSubjectStyle(guide.subject).icon}
                  </span>
                  <h3 className="font-bold text-base leading-tight">
                    {guide.subject} in {guide.countryLabel}
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/70 shrink-0">
                  {guide.flag} {guide.country}
                </span>
              </div>

              <div className="p-6 flex flex-col flex-1">
                <p className="text-sm text-gray-600 mb-4">{guide.description}</p>

                {guide.popularUniversities?.length > 0 && (
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-xs">🏛️</span>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Popular universities
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {guide.popularUniversities.map((uni) => (
                        <span
                          key={uni}
                          className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-800"
                        >
                          {uni}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-xs">📋</span>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Admission requirements
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">{guide.admission}</p>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-xs">🎯</span>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Extracurriculars
                    </p>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {guide.extracurriculars.map((activity) => (
                      <li key={activity} className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">•</span>
                        <span>{activity}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {guide.languageRequirement && (
                  <div className="mb-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                      <p className="text-xs font-semibold text-amber-800">
                        ⚠️ Important: {guide.languageRequirement}
                      </p>
                    </div>
                  </div>
                )}

                {guide.writtenBy && (
                  <p className="text-xs text-gray-400 italic mt-auto pt-3 border-t border-gray-100">
                    {guide.writtenBy}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}