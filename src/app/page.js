"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/Components/Navbar";
import { questions } from "@/data/questions";
import { getSubjectStyle, getFlag, getLanguageStyle } from "@/data/mentors";
import { supabase } from "@/lib/supabase";

const categoryFilters = {
  mentors: {
    field: ["Medicine", "Engineering", "Law", "Computer Science", "Business", "Psychology"],
    country: ["NL", "UK"],
    language: ["English", "Dutch", "German", "French", "Spanish"],
  },
  questions: {
    field: ["Medicine", "Engineering", "Law", "Business", "Computer Science", "Psychology", "Biology", "Architecture"],
    country: ["NL", "UK"],
  },
  universities: {
    field: ["Medicine", "Engineering", "Law", "Computer Science", "Business", "Psychology"],
    country: ["NL", "UK"],
  },
};

const dimensionLabels = { field: "Field", country: "Country", language: "Language" };

const categoryTargets = {
  mentors: { path: "/mentors", params: { field: "subject", country: "country", language: "language" } },
  questions: { path: "/FAQ", params: { field: "field", country: "country" } },
  universities: { path: "/universities", params: { field: "field", country: "country" } },
};

export default function Home() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeDimension, setActiveDimension] = useState("field");
  const [selectedChips, setSelectedChips] = useState({});
  const [mentors, setMentors] = useState([]);
  const [mentorsLoading, setMentorsLoading] = useState(true);
  const [mentorsError, setMentorsError] = useState(null);

  useEffect(() => {
    async function fetchMentors() {
      const { data, error } = await supabase.from("mentorss").select("*");
      if (error) {
        setMentorsError(error.message || JSON.stringify(error));
      } else {
        setMentors(data);
      }
      setMentorsLoading(false);
    }
    fetchMentors();
  }, []);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category === selectedCategory ? null : category);
    setSelectedChips({});
    setActiveDimension("field");
  };

  const handleChipSelect = (dimension, chip) => {
    setSelectedChips((prev) => {
      const current = prev[dimension] || [];
      const updated = current.includes(chip)
        ? current.filter((c) => c !== chip)
        : [...current, chip];
      return { ...prev, [dimension]: updated };
    });
  };

  const handleExplore = () => {
    const target = categoryTargets[selectedCategory] || categoryTargets.mentors;
    const parts = Object.entries(target.params)
      .map(([dimension, paramName]) => {
        const values = selectedChips[dimension];
        return values && values.length > 0
          ? `${paramName}=${encodeURIComponent(values.join(","))}`
          : null;
      })
      .filter(Boolean);
    const query = parts.length > 0 ? `?${parts.join("&")}` : "";
    router.push(`${target.path}${query}`);
  };

  const categoryButtonStyles = {
    mentors: "bg-green-600 text-white border-green-600",
    questions: "bg-amber-500 text-white border-amber-500",
    universities: "bg-indigo-600 text-white border-indigo-600",
  };

  const categoryFillStyles = {
    mentors: "bg-green-100",
    questions: "bg-amber-100",
    universities: "bg-indigo-100",
  };

  const getChipStyle = (dimension, chip) => {
    if (dimension === "country") {
      return { color: "bg-slate-100 text-slate-700", icon: getFlag(chip) };
    }
    if (dimension === "language") {
      return getLanguageStyle(chip);
    }
    return getSubjectStyle(chip);
  };
const topMentors = [...mentors].sort((a, b) => b.rating - a.rating).slice(0, 3);
const topQuestions = [...questions].sort((a, b) => b.helpful - a.helpful).slice(0, 3);
const verifiedMentorsCount = mentors.filter((m) => m.verified).length;
  const questionsAnsweredCount = questions.length;
  const careerPathsCount = new Set(mentors.map((m) => m.subject)).size;
  const avgRating = mentors.length
    ? (mentors.reduce((sum, m) => sum + m.rating, 0) / mentors.length).toFixed(1)
    : "—";
  const languagesCount = new Set(
    mentors.flatMap((m) =>
      typeof m.languages === "string"
        ? m.languages.split(",").map((l) => l.trim())
        : m.languages || []
    )
  ).size;
  const schoolsCount = new Set(mentors.map((m) => m.school)).size;
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
          Get honest career intel from university students who are actually on the path you're considering. No cost. No sales pitch. Just the truth.
        </p>

        {/* Search Bar */}
       <div className="max-w-2xl mx-auto">
          {/* Category selector */}
          <div className="flex justify-center gap-2 mb-4">
            {[
              { key: "mentors", label: "Mentors" },
              { key: "questions", label: "Questions" },
              { key: "universities", label: "Universities" },
            ].map((cat) => (
              <button
                key={cat.key}
                onClick={() => handleCategorySelect(cat.key)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold border transition ${
                  selectedCategory === cat.key
                    ? categoryButtonStyles[cat.key]
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-stretch bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-gray-900">
            <div className="flex-1 px-4 py-2 flex items-center gap-2 flex-wrap">
              {selectedCategory ? (
                <>
                  <button
  onClick={() => {
    setSelectedCategory(null);
    setSelectedChips({});
    setActiveDimension("field");
  }}
  className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1 rounded-full text-black ${categoryFillStyles[selectedCategory]} hover:opacity-80 transition`}
>
  {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
  <span className="font-bold">×</span>
</button>
                  {Object.entries(selectedChips).flatMap(([dimension, chips]) =>
                    chips.map((chip) => {
                      const style = getChipStyle(dimension, chip);
                      return (
                        <button
                          key={`${dimension}-${chip}`}
                          onClick={() => handleChipSelect(dimension, chip)}
                          className={`inline-flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full transition hover:opacity-80 ${style.color}`}
                        >
                          {style.icon} {chip}
                        </button>
                      );
                    })
                  )}
                </>
              ) : (
                <span className="text-gray-600 text-sm">
                  Choose Mentors, Questions, or Universities to get started
                </span>
              )}
            </div>
            <button
              onClick={handleExplore}
              className="bg-green-600 text-white px-6 font-medium hover:bg-green-700 transition shrink-0"
            >
              Find a Mentor →
            </button>
          </div>

          {/* Filter dimension tabs + chips for the selected category */}
          {selectedCategory && (
            <div className="mt-4">
              <div className="flex justify-center gap-2 mb-3">
                {Object.keys(categoryFilters[selectedCategory]).map((dimension) => (
                  <button
                    key={dimension}
                    onClick={() => setActiveDimension(dimension)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                      activeDimension === dimension
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {dimensionLabels[dimension]}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {categoryFilters[selectedCategory][activeDimension].map((chip) => {
                  const style = getChipStyle(activeDimension, chip);
                  const isSelected = (selectedChips[activeDimension] || []).includes(chip);

                  return (
                    <button
                      key={chip}
                      onClick={() => handleChipSelect(activeDimension, chip)}
                      className={`text-sm font-semibold px-4 py-1.5 rounded-full transition ${style.color} ${
                        isSelected ? "ring-2 ring-gray-900" : "hover:opacity-80"
                      }`}
                    >
                      {style.icon} {chip}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        </div>
  </section>

    {/* Stats */}
      <section className="bg-white pt-6 pb-6">
  <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
    {mentorsLoading
      ? [...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-10 w-16 bg-gray-200 rounded mx-auto mb-2"></div>
            <div className="h-4 w-24 bg-gray-200 rounded mx-auto"></div>
          </div>
        ))
      : (
        <>
          <div>
            <p className="text-4xl font-extrabold text-green-800">{verifiedMentorsCount}</p>
            <p className="text-gray-600 text-sm mt-0.5">Verified mentors</p>
          </div>

          <div>
            <p className="text-4xl font-extrabold text-green-800">{questionsAnsweredCount}</p>
            <p className="text-gray-600 text-sm mt-0.5">Questions answered</p>
          </div>

          <div>
            <p className="text-4xl font-extrabold text-green-800">{careerPathsCount}</p>
            <p className="text-gray-600 text-sm mt-0.5">Career paths</p>
          </div>

          <div>
            <p className="text-4xl font-extrabold text-green-800">{avgRating}★</p>
            <p className="text-gray-600 text-sm mt-0.5">Average session rating</p>
          </div>

          <div>
            <p className="text-4xl font-extrabold text-green-800">{languagesCount}</p>
            <p className="text-gray-600 text-sm mt-0.5">Languages spoken</p>
          </div>

          <div>
            <p className="text-4xl font-extrabold text-green-800">{schoolsCount}</p>
            <p className="text-gray-600 text-sm mt-0.5">Schools represented</p>
          </div>
        </>
      )}
  </div>
</section>

     {/* How it works */}
<section className="bg-orange-50 pt-10 pb-10">
        <div className="max-w-5xl mx-auto px-6">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
            How it Works
          </h3>
          <p className="text-gray-600 text-center mb-10">
            Getting real answers takes three simple steps — completely free.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-2xl font-bold mb-4">
                🔍
              </div>
              <h4 className="font-bold text-gray-900 text-lg mb-2">1. Search</h4>
              <p className="text-gray-600 text-sm">
                Filter mentors by school, subject, country, or language to find someone who's been exactly where you are.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-2xl font-bold mb-4">
                💬
              </div>
              <h4 className="font-bold text-gray-900 text-lg mb-2">2. Ask or book</h4>
              <p className="text-gray-600 text-sm">
                Post a question to the community, or book a 1-on-1 session directly with a verified mentor.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-2xl font-bold mb-4">
                ✅
              </div>
              <h4 className="font-bold text-gray-900 text-lg mb-2">3. Get real answers</h4>
              <p className="text-gray-600 text-sm">
                No brochures, no marketing spin — just honest, first-hand advice from current students.
              </p>
            </div>
          </div>
        </div>
      </section>

{/* Featured Mentors */}
<section className="bg-orange-50 px-6 pt-6 pb-10">
        <div className="max-w-6xl mx-auto">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          Featured Mentors
        </h3>
        {mentorsError ? (
          <p className="text-red-600 font-semibold">Error: {mentorsError}</p>
        ) : mentorsLoading ? (
          <p className="text-gray-500">Loading mentors...</p>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {topMentors.map((mentor) => (
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
        )}
        </div>
      </section>

{/* Q&A */}
<section className="bg-orange-50 pt-8 pb-16">
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