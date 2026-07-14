"use client";
import { useState } from "react";
import Navbar from "@/Components/Navbar";
import { universities } from "@/data/universities";
import { getSubjectStyle } from "@/data/mentors";

const countryFlags = { NL: "🇳🇱", UK: "🇬🇧" };
const countries = ["All", "NL", "UK"];

export default function Universities() {
  const [activeCountry, setActiveCountry] = useState("All");

  const filteredUniversities = universities.filter(
    (uni) => activeCountry === "All" || uni.country === activeCountry
  );

  return (
    <div className="min-h-screen bg-[#FFF9F2]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
          University Guides
        </h1>
        <p className="text-gray-600 mb-6">
          Everything you need to know about top universities — popular courses, admission requirements, and student life.
        </p>

        {/* Country filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {countries.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCountry(c)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${
                activeCountry === c
                  ? "border-green-600 text-green-700 bg-green-50"
                  : "border-gray-300 text-gray-700 bg-white hover:border-gray-400"
              }`}
            >
              {c === "All" ? "All" : `${countryFlags[c]} ${c}`}
            </button>
          ))}
        </div>

        {/* University cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredUniversities.map((uni) => (
            <div
              key={uni.id}
              className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition flex flex-col h-full"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-xl">{uni.name}</h3>
                  <p className="text-gray-500 text-sm">{uni.city}</p>
                </div>
                <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 shrink-0">
                  {countryFlags[uni.country]} {uni.country}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Popular courses
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {uni.popularCourses.map((course) => (
                    <span
                      key={course}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getSubjectStyle(course).color}`}
                    >
                      {getSubjectStyle(course).icon} {course}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Admission requirements
                </p>
                <p className="text-sm text-gray-600">{uni.admission}</p>
              </div>

              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Extracurriculars
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-0.5">
                  {uni.extracurriculars.map((activity) => (
                    <li key={activity}>{activity}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Tuition
                </p>
                <p className="text-sm text-gray-900 font-medium">{uni.tuition}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}