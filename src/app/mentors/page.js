"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/Components/Navbar";
import { getSubjectStyle, getFlag } from "@/data/mentors";
import { supabase } from "@/lib/supabase";

const filters = ["All", "Medicine", "Engineering", "Law", "Computer Science", "Business", "Psychology"];
const countries = ["All", "NL", "UK"];
const filterTabs = ["Field", "Country", "Sort"];
const filterTabStyles = {
  Field: "bg-green-600 text-white border-green-600",
  Country: "bg-amber-500 text-white border-amber-500",
  Sort: "bg-indigo-600 text-white border-indigo-600",
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
    <div className="min-h-screen bg-[#FFF9F2]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
          Verified Mentors
        </h1>
        <p className="text-gray-600 mb-6">
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
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold border transition ${
                    activeFilterTabs.includes(tab)
                      ? filterTabStyles[tab]
                      : "bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

             <button
              onClick={() => setAvailableOnly(!availableOnly)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                availableOnly
                  ? "border-green-600 text-green-700 bg-green-50"
                  : "border-gray-300 text-gray-400 bg-white hover:border-gray-400"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${availableOnly ? "bg-green-500" : "bg-gray-300"}`}></span>
              {availableOnly ? "Open for Booking" : "Open for Booking (Off)"}
            </button>
          </div>

          {activeFilterTabs.includes("Field") && (
            <div className="flex flex-wrap gap-2 mb-3">
              {filters.map((filter) => {
                const isActive =
                  filter === "All" ? activeFilters.length === 0 : activeFilters.includes(filter);
                const style = filter === "All" ? null : getSubjectStyle(filter);

                return (
                  <button
                    key={filter}
                    onClick={() => toggleFilter(filter)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${
                      filter === "All"
                        ? isActive
                          ? "border-green-600 text-green-700 bg-green-50"
                          : "border-gray-300 text-gray-700 bg-white hover:border-gray-400"
                        : isActive
                        ? `${style.color} border-transparent ring-2 ring-offset-1 ring-gray-400`
                        : `${style.color} border-transparent opacity-60 hover:opacity-100`
                    }`}
                  >
                    {filter !== "All" && `${style.icon} `}
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
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${
                      isActive
                        ? "border-green-600 text-green-700 bg-green-50"
                        : "border-gray-300 text-gray-700 bg-white hover:border-gray-400"
                    }`}
                  >
                    {c === "All" ? "All countries" : `${getFlag(c)} ${c}`}
                  </button>
                );
              })}
            </div>
          )}

          {activeFilterTabs.includes("Sort") && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-600 mb-3"
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
          <p className="text-gray-500">Loading Mentors...</p>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sortedMentors.map((mentor) => (
            <div
              key={mentor.name}
              className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col h-full"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-green-800 text-white flex items-center justify-center font-bold text-lg shrink-0">
                  {mentor.initials}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg leading-tight">
                    {mentor.name}
                  </h4>
                  <p className="text-gray-500 text-sm">
                    {mentor.school} · {mentor.year}
                  </p>
                  {mentor.verified && (
                    <span className="inline-block mt-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                      ✓ Verified Since{" "}
                      {mentor.created_at &&
                        new Date(mentor.created_at).toLocaleDateString("en-GB", {
                          month: "short",
                          year: "numeric",
                        })}
                    </span>
                  )}
                </div>
              </div>

             <div className="flex flex-wrap gap-2 mb-3">
                <span
                  className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${getSubjectStyle(mentor.subject).color}`}
                >
                  {getSubjectStyle(mentor.subject).icon} {mentor.subject}
                </span>
                <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                  {getFlag(mentor.country)} {mentor.country}
                </span>
              </div>

              <p className="text-gray-600 text-sm mb-5">{mentor.bio}</p>

              <div className="grid grid-cols-4 gap-2 pt-4 border-t border-gray-100 text-center mt-auto">
                <div>
                  <p className="font-bold text-gray-900">{mentor.sessions}</p>
                  <p className="text-xs text-gray-500">Sessions</p>
                </div>
                <div>
                  <p className="font-bold text-gray-900">{mentor.answers}</p>
                  <p className="text-xs text-gray-500">Answers</p>
                </div>
                <div>
                  <p className="font-bold text-gray-900">{mentor.rating}★</p>
                  <p className="text-xs text-gray-500">Rating</p>
                </div>
                <div>
                  <p
                    className={`font-bold flex items-center justify-center gap-1 ${
                      mentor.available ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        mentor.available ? "bg-green-600" : "bg-gray-400"
                      }`}
                    ></span>
                    {mentor.available ? "Open" : "Closed"}
                  </p>
                  <p className="text-xs text-gray-500">Bookings</p>
                </div>
              </div>
            </div>
          ))}
       </div>
        )}
      </div>
    </div>
  );
}