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
  courseGuides: {
    field: ["Medicine", "Engineering", "Law", "Computer Science", "Business", "Psychology"],
    country: ["NL", "UK"],
  },
};

const dimensionLabels = { field: "Field", country: "Country", language: "Language" };

const categoryDisplayNames = {
  mentors: "Mentors",
  questions: "Questions",
  courseGuides: "Course Guides",
};

const categoryTargets = {
  mentors: { path: "/mentors", params: { field: "subject", country: "country", language: "language" } },
  questions: { path: "/FAQ", params: { field: "field", country: "country" } },
 courseGuides: { path: "/course-guides", params: { field: "field", country: "country" } },
};

export default function Home() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeDimension, setActiveDimension] = useState("field");
  const [selectedChips, setSelectedChips] = useState({});
  const [searchText, setSearchText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
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

  // --- Recognize typed category/filter words ---
  const tryRecognizeToken = (token) => {
    const lower = token.trim().toLowerCase();
    if (!lower) return false;

    const categoryMatch = Object.keys(categoryFilters).find((cat) => cat === lower);
    if (categoryMatch) {
      handleCategorySelect(categoryMatch);
      return true;
    }

    const cat = selectedCategory || "mentors";
    const dimensions = categoryFilters[cat];
    for (const dimension of Object.keys(dimensions)) {
      const chipMatch = dimensions[dimension].find((chip) => chip.toLowerCase() === lower);
      if (chipMatch) {
        handleChipSelect(dimension, chipMatch);
        return true;
      }
    }

    return false;
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    if (value.endsWith(" ")) {
      const words = value.trim().split(/\s+/);
      const lastWord = words[words.length - 1];
      if (tryRecognizeToken(lastWord)) {
        setSearchText("");
        return;
      }
    }
    setSearchText(value);
  };

  // --- Search index / suggestions ---
 const buildSearchIndex = () => {
  const items = [];

  Object.keys(categoryFilters).forEach((cat) => {
    items.push({ type: "category", label: cat.charAt(0).toUpperCase() + cat.slice(1), value: cat });
  });

  // Dedupe filters by dimension + value, but remember every category they belong to
  const filterMap = new Map();
  Object.entries(categoryFilters).forEach(([cat, dims]) => {
    Object.entries(dims).forEach(([dimension, chips]) => {
      chips.forEach((chip) => {
        const key = `${dimension}:${chip}`;
        if (!filterMap.has(key)) {
          filterMap.set(key, { type: "filter", label: chip, value: chip, dimension, categories: [cat] });
        } else {
          filterMap.get(key).categories.push(cat);
        }
      });
    });
  });
  items.push(...filterMap.values());

  mentors.forEach((m) => {
    items.push({ type: "mentor", label: m.name, value: m.name, subject: m.subject, school: m.school });
  });

  questions.forEach((q) => {
    items.push({ type: "question", label: q.question, value: q.question, id: q.id, subject: q.subject });
  });

  return items;
};

  const searchResults = searchText.trim()
    ? buildSearchIndex()
        .filter((item) => item.label.toLowerCase().includes(searchText.trim().toLowerCase()))
        .slice(0, 8)
    : [];

 const handleSuggestionClick = (item) => {
  if (item.type === "category") {
    handleCategorySelect(item.value);
  } else if (item.type === "filter") {
    const targetCategory = item.categories.includes(selectedCategory)
      ? selectedCategory
      : item.categories[0];
    if (selectedCategory !== targetCategory) handleCategorySelect(targetCategory);
    handleChipSelect(item.dimension, item.value);
  } else if (item.type === "mentor") {
    router.push(`/mentors?name=${encodeURIComponent(item.value)}`);
  } else if (item.type === "question") {
    router.push(`/FAQ#${item.id}`);
  }
  setSearchText("");
  setShowSuggestions(false);
};

  const categoryButtonStyles = {
    mentors: "bg-green-600 text-white border-green-600",
    questions: "bg-amber-500 text-white border-amber-500",
    courseGuides: "bg-indigo-600 text-white border-indigo-600",
  };

  const categoryFillStyles = {
    mentors: "bg-green-100",
    questions: "bg-amber-100",
    courseGuides: "bg-indigo-100",
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
  Connect with verified university students for honest, first hand advice about courses, universities, applications and student life - <span className="font-bold text-black">all completely free</span>.
</p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            {/* Category selector */}
            <div className="flex justify-center gap-2 mb-4">
              {[
                { key: "mentors", label: "Mentors" },
                { key: "questions", label: "Questions" },
                { key: "courseGuides", label: "Course Guides" },
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

            <div className="relative">
              <div className="flex items-stretch bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-gray-900">
                <div className="flex-1 px-4 py-2 flex items-center gap-2 flex-wrap">
                  {selectedCategory && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedCategory(null);
                          setSelectedChips({});
                          setActiveDimension("field");
                        }}
                        className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1 rounded-full text-black ${categoryFillStyles[selectedCategory]} hover:opacity-80 transition`}
                      >
                        {categoryDisplayNames[selectedCategory]}
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
                  )}
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => {
                      handleSearchChange(e);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setShowSuggestions(false)}
                    onKeyDown={(e) => {
  if (e.key === "Enter") {
    if (searchResults.length > 0) {
      handleSuggestionClick(searchResults[0]);
    } else if (searchText.trim() && tryRecognizeToken(searchText.trim())) {
      setSearchText("");
    } else {
      // No match just show "no results" instead of navigating away
      setShowSuggestions(true);
    }
  }
}}
                    placeholder="Choose Mentors, Questions, or Course Guides to get started"
                    className="flex-1 min-w-[160px] outline-none text-sm text-gray-600 placeholder-gray-600"
                  />
                </div>
                <button
                  onClick={handleExplore}
                  className="bg-green-600 text-white px-6 font-medium hover:bg-green-700 transition shrink-0"
                >
                  Find your Mentor →
                </button>
              </div>

             {showSuggestions && searchText.trim() && (
  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 text-left overflow-hidden">
    {searchResults.length > 0 ? (
      searchResults.map((item, i) => {
        let badgeLabel = "";
        let badgeStyle = "bg-gray-100 text-gray-500";
        let icon = "";

        if (item.type === "category") {
          badgeLabel = "Category";
          badgeStyle =
            item.value === "mentors"
              ? "bg-green-100 text-green-700"
              : item.value === "questions"
              ? "bg-amber-100 text-amber-700"
              : "bg-indigo-100 text-indigo-700";
        } else if (item.type === "filter") {
          badgeLabel = dimensionLabels[item.dimension] || item.dimension;
          const style = getChipStyle(item.dimension, item.value);
          badgeStyle = style.color;
          icon = style.icon || "";
        } else if (item.type === "mentor") {
          badgeLabel = "Mentor";
          badgeStyle = "bg-green-100 text-green-700";
        } else if (item.type === "question") {
          badgeLabel = "Question";
          badgeStyle = "bg-amber-100 text-amber-700";
        }

        return (
          <button
            key={`${item.type}-${item.value}-${i}`}
            onMouseDown={() => handleSuggestionClick(item)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 transition text-left border-b border-gray-100 last:border-b-0"
          >
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${badgeStyle}`}>
              {icon} {badgeLabel}
            </span>
            <span className="text-gray-800 truncate">{item.label}</span>
          </button>
        );
      })
    ) : (
      <div className="px-4 py-4 text-sm text-gray-500 text-center">
        No results for "<span className="font-semibold text-gray-700">{searchText}</span>" — try a category, subject, or mentor name.
      </div>
    )}
  </div>
)}
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
                  <p className="text-gray-600 text-sm mt-0.5">Verified Mentors</p>
                </div>

                <div>
                  <p className="text-4xl font-extrabold text-green-800">{questionsAnsweredCount}</p>
                  <p className="text-gray-600 text-sm mt-0.5"> Student Questions Answered</p>
                </div>

                <div>
                  <p className="text-4xl font-extrabold text-green-800">{careerPathsCount}</p>
                  <p className="text-gray-600 text-sm mt-0.5">Career Paths</p>
                </div>

                <div>
                  <p className="text-4xl font-extrabold text-green-800">{avgRating}★</p>
                  <p className="text-gray-600 text-sm mt-0.5">Average Session Rating</p>
                </div>

                <div>
                  <p className="text-4xl font-extrabold text-green-800">{languagesCount}</p>
                  <p className="text-gray-600 text-sm mt-0.5">Languages Spoken</p>
                </div>

                <div>
                  <p className="text-4xl font-extrabold text-green-800">{schoolsCount}</p>
                  <p className="text-gray-600 text-sm mt-0.5">Universities Represented</p>
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
           Three simple steps to connect with verified university students for honest, first-hand advice about courses, universities, applications and student life.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-2xl font-bold mb-4">
                🔍
              </div>
              <h4 className="font-bold text-gray-900 text-lg mb-2">1. Find the right Mentor</h4>
              <p className="text-gray-600 text-sm">
                Browse verified mentors by course, university, country, or language to find someone whose journey matches yours.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-2xl font-bold mb-4">
                💬
              </div>
              <h4 className="font-bold text-gray-900 text-lg mb-2">2. Reach Out</h4>
              <p className="text-gray-600 text-sm">
                Post a question to the community, or book a 1-on-1 session directly with a verified mentor.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-2xl font-bold mb-4">
                ✅
              </div>
              <h4 className="font-bold text-gray-900 text-lg mb-2">3. Get Honest Advice</h4>
              <p className="text-gray-600 text-sm">
                Learn what your future career is really like with advice from current students.
              </p>
            </div>
          </div>
        </div>
      </section>



     {/* Why Students Use PeerVia */}
      <section className="bg-white pt-10 pb-10">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Why Students Use PeerVia
          </h3>
          <p className="text-gray-600 text-center mb-10">
            No brochures, no sales pitches — just a tool built by students, for students.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-2xl font-bold mb-4">
                🎓
              </div>
              <h4 className="font-bold text-gray-900 text-lg mb-2">Honest Advice</h4>
              <p className="text-gray-600 text-sm">
                From real university students, not marketing teams.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-2xl font-bold mb-4">
                💸
              </div>
              <h4 className="font-bold text-gray-900 text-lg mb-2">Completely Free</h4>
              <p className="text-gray-600 text-sm">
                No paywalls, no subscriptions, no hidden costs.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-2xl font-bold mb-4">
                ✅
              </div>
              <h4 className="font-bold text-gray-900 text-lg mb-2">Verified Mentors</h4>
              <p className="text-gray-600 text-sm">
                Every mentor is reviewed before joining the platform.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-2xl font-bold mb-4">
                🚫
              </div>
              <h4 className="font-bold text-gray-900 text-lg mb-2">No Algorithms</h4>
              <p className="text-gray-600 text-sm">
                Real conversations, not content ranked for engagement.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-2xl font-bold mb-4">
                🤝
              </div>
              <h4 className="font-bold text-gray-900 text-lg mb-2">By Students, for Students</h4>
              <p className="text-gray-600 text-sm">
                Built by people who were in your shoes not long ago.
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

          <div className="text-center mt-10">
            <a href="/mentors" className="inline-block border border-gray-300 rounded-lg px-6 py-2.5 font-medium text-gray-800 hover:bg-white transition">
              See All Mentors →
            </a>
          </div>
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