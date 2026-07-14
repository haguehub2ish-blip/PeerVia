"use client";
import { useState, useEffect } from "react";
import Navbar from "@/Components/Navbar";
import { getSubjectStyle, getFlag } from "@/data/mentors";
import { supabase } from "@/lib/supabase";

const filters = ["All", "Medicine", "Engineering", "Law", "Computer Science", "Business", "Psychology"];

export default function Mentors() {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [fetchError, setFetchError] = useState(null);

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

  const filteredMentors = mentors.filter((mentor) => {
    const matchesFilter =
      activeFilter === "All" ||
      mentor.subject === activeFilter ||
      mentor.subject.includes(activeFilter);
    const matchesAvailability = !availableOnly || mentor.available;
    return matchesFilter && matchesAvailability;
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

       {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {filters.map((filter) => {
            const isActive = activeFilter === filter;
            const style = filter === "All" ? null : getSubjectStyle(filter);

            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
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
          <button
            onClick={() => setAvailableOnly(!availableOnly)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border transition ${
              availableOnly
                ? "border-green-600 text-green-700 bg-green-50"
                : "border-gray-300 text-gray-700 bg-white hover:border-gray-400"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Available now
          </button>
        </div>

       {/* Mentor cards */}
       {fetchError ? (
          <p className="text-red-600 font-semibold">Error: {fetchError}</p>
        ) : loading ? (
          <p className="text-gray-500">Loading mentors...</p>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredMentors.map((mentor) => (
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
                      ✓ Verified
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