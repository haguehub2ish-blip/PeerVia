"use client";
import { useState } from "react";
import Navbar from "@/Components/Navbar";
import { questions } from "@/data/questions";
import { mentors, getSubjectStyle, getFlag } from "@/data/mentors";

export default function Home() {
  const [query, setQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState([]);

  const toggleFilter = (filter) => {
    setSelectedFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
  };
const topMentors = [...mentors].sort((a, b) => b.rating - a.rating).slice(0, 3);
const topQuestions = [...questions].sort((a, b) => b.helpful - a.helpful).slice(0, 3);
const filteredMentors = topMentors.filter((mentor) => {
    const searchTerm = query.toLowerCase();
    const matchesText =
      mentor.name.toLowerCase().includes(searchTerm) ||
      mentor.school.toLowerCase().includes(searchTerm) ||
      mentor.subject.toLowerCase().includes(searchTerm) ||
      mentor.country.toLowerCase().includes(searchTerm);

    const matchesFilters =
      selectedFilters.length === 0 ||
      selectedFilters.every(
        (f) => mentor.subject === f || mentor.country === f
      );

    return matchesText && matchesFilters;
  });
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <Navbar />

      {/* Hero + Search */}
      <section className="bg-orange-50 px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Real Answers from the People Living it
        </h2>
        <p className="text-gray-600 mb-10">
          Search by school, subject, country, or language to connect with
          students and mentors like you.
        </p>

        {/* Search Bar */}
       <div className="max-w-2xl mx-auto">
          <div className="flex items-stretch bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-gray-900">
            <div className="flex flex-wrap items-center gap-2 flex-1 pl-3 py-2 min-w-0">
              {selectedFilters.map((filter) => {
                const isCountry = filter === "NL" || filter === "UK";
                const style = isCountry
                  ? { color: "bg-slate-100 text-slate-700", icon: getFlag(filter) }
                  : getSubjectStyle(filter);
                return (
                  <span
                    key={filter}
                    className={`flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full ${style.color}`}
                  >
                    {style.icon} {filter}
                    <button
                      onClick={() => toggleFilter(filter)}
                      className="ml-1 hover:opacity-70"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={selectedFilters.length === 0 ? "Search by subject, school, or country..." : ""}
                className="flex-1 min-w-[120px] py-1 text-gray-900 placeholder-gray-400 focus:outline-none"
              />
            </div>
            <button className="bg-green-600 text-white px-6 font-medium hover:bg-green-600 transition shrink-0">
              Explore →
            </button>
          </div>

          {/* Quick filters */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {["Medicine", "Business", "Computer Science", "NL", "UK"].map((filter) => {
              const isCountry = filter === "NL" || filter === "UK";
              const style = isCountry
                ? { color: "bg-slate-100 text-slate-700", icon: getFlag(filter) }
                : getSubjectStyle(filter);
              const isSelected = selectedFilters.includes(filter);

              return (
                <button
                  key={filter}
                  onClick={() => toggleFilter(filter)}
                  className={`text-sm font-semibold px-4 py-1.5 rounded-full transition ${style.color} ${
                    isSelected ? "ring-2 ring-gray-900" : "hover:opacity-80"
                  }`}
                >
                  {style.icon} {filter}
                </button>
              );
            })}
          </div>
        </div>
        </div>
  </section>

     {/* Stats */}
      <section className="bg-white py-6">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
          <div>
            <p className="text-4xl font-extrabold text-green-800">184</p>
            <p className="text-gray-600 text-sm mt-0.5">Verified mentors</p>
          </div>
          <div>
            <p className="text-4xl font-extrabold text-green-800">2.3k</p>
            <p className="text-gray-600 text-sm mt-0.5">Questions answered</p>
          </div>
          <div>
            <p className="text-4xl font-extrabold text-green-800">14</p>
            <p className="text-gray-600 text-sm mt-0.5">Career paths</p>
          </div>
          <div>
            <p className="text-4xl font-extrabold text-green-800">4.9★</p>
            <p className="text-gray-600 text-sm mt-0.5">Average session rating</p>
          </div>
          <div>
            <p className="text-4xl font-extrabold text-green-800">12</p>
            <p className="text-gray-600 text-sm mt-0.5">Languages spoken</p>
          </div>
          <div>
            <p className="text-4xl font-extrabold text-green-800">40+</p>
            <p className="text-gray-600 text-sm mt-0.5">Schools represented</p>
          </div>
        </div>
      </section>

      {/* Mentor Results */}
      <section className="bg-orange-50 px-6 py-10">
        <div className="max-w-6xl mx-auto">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          Featured Mentors
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredMentors.map((mentor) => (
            <div
              key={mentor.name}
              className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition flex flex-col h-full"
            >
              {/* Top: avatar + name + school */}
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

           {/* Subject tag */}
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

              {/* Bio */}
              <p className="text-gray-600 text-sm mb-5">{mentor.bio}</p>

              {/* Stats row */}
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
        </div>
      </section>

{/* Q&A */}
      <section className="bg-orange-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">
            What high schoolers are actually asking
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topQuestions.map((qa, i) => (
              <a key={i} href={`/FAQ#${qa.id}`} className="bg-white rounded-2xl p-6 flex flex-col h-full border border-gray-200 hover:shadow-md transition">
                <div className="flex flex-wrap gap-2 mb-3">
                  <span
                    className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${getSubjectStyle(qa.subject).color}`}
                  >
                    {getSubjectStyle(qa.subject).icon} {qa.subject}
                  </span>
                  <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                    {getFlag(qa.country)} {qa.country}
                  </span>
                </div>

                <h4 className="font-bold text-gray-900 text-lg mb-2">
                  {qa.question}
                </h4>
                <p className="text-gray-500 text-sm mb-4 line-clamp-3">{qa.answer}</p>

                <div className="flex items-center gap-3 pt-4 mt-auto border-t border-gray-100">
                  <div className="w-9 h-9 rounded-full bg-green-800 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {qa.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{qa.name}</p>
                    <p className="text-gray-500 text-xs">
                      {qa.school} · {qa.year}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>

          <div className="text-center mt-10">
            <a href="/FAQ" className="inline-block border border-gray-300 rounded-lg px-6 py-2.5 font-medium text-gray-800 hover:bg-white transition">
              See all Q&A →
            </a>
          </div>
        </div>
      </section>
      </main>
  );
}