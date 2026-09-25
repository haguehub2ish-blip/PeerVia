"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/Components/Navbar";
import { questions } from "@/data/questions";
import { getSubjectStyle, getFlag, getLanguageStyle } from "@/data/mentors";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

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
  questions: { path: "/community", params: { field: "field", country: "country" } },
  courseGuides: { path: "/course-guides", params: { field: "field", country: "country" } },
};

const exploreButtonLabels = {
  mentors: "Find →",
  questions: "Find →",
  courseGuides: "Find →",
};

const howItWorksSteps = [
  {
    number: "01",
    title: "Find the right mentor",
    text: "Browse verified mentors by course, university, country, or language to find someone whose journey matches yours.",
  },
  {
    number: "02",
    title: "Reach out",
    text: "Post a question to the community, or book a 1-on-1 session directly with a verified mentor.",
  },
  {
    number: "03",
    title: "Get honest advice",
    text: "Learn what your future career is really like, from current students who've actually lived it.",
  },
];

const whyPeerVia = [
  {
    number: "01",
    title: "Honest Advice",
    text: "From real university students, not marketing teams. Every mentor is reviewed before joining the platform",
  },
  {
    number: "02",
    title: "Completely Free",
    text: "No paywalls, no subscriptions, no hidden costs.",
  },
  {
    number: "03",
    title: "By Students, for Students",
    text: "Built by people who were in your shoes not long ago.",
  },
];

// Put a real photo URL here once you've picked one (Unsplash/Pexels — see note below).
// Leave empty to keep the current plain teal background.
const CTA_PHOTO_URL = "/images/campus-medicine.jpg";
const HERO_PHOTO_URL = "/images/PV_HomePage.jpg"; // swap to a different file if you want a distinct hero image
const MENTORS_PHOTO_URL = "/images/PV_HomePage2.jpg"; // swap to a different file once you have one specific to this section
const COMMUNITY_PHOTO_URL = "/images/PV_HomePage3.jpg"; // swap to a different file once you have one specific to this section



function PhotoBlock({ src, alt = "", className = "", tint = 55, opacity = 100 }) {
  if (!src) return null;
  return (
    <div className={`overflow-hidden ${className}`} style={{ opacity: opacity / 100 }}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover grayscale contrast-[1.08]"
      />
      <div className="absolute inset-0 bg-primary mix-blend-multiply" style={{ opacity: tint / 100 }} />
    </div>
  );
}

// --- Placeholder photo tile: swaps to a real <img> automatically once mentor.photoUrl exists ---
function MentorPhoto({ mentor, className = "" }) {
  if (mentor?.photo_url) {
    return (
      <img
        src={mentor.photo_url}
        alt={mentor.name}
        className={`object-cover ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5 text-primary/50 font-display ${className}`}
    >
      {mentor?.initials || "?"}
    </div>
  );
}

// --- Decorative background texture, low-opacity, same hue family as bg ---
function DecorShapes() {
  return (
    <svg
      className="absolute left-8 top-2 w-32 h-32 md:w-40 md:h-40 text-primary/[0.06] pointer-events-none hidden lg:block"
      viewBox="0 0 0 0"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.8"
    >
      <path d="M12 3 2 8l10 5 10-5-10-5z" />
      <path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5" />
      <path d="M22 8v6" />
    </svg>
  );
}

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
  const [answeredUserQuestionsCount, setAnsweredUserQuestionsCount] = useState(0);

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

    async function fetchAnsweredCount() {
      const { count, error } = await supabase
        .from("question_answers")
        .select("*", { count: "exact", head: true });
      if (!error && count !== null) {
        setAnsweredUserQuestionsCount(count);
      }
    }
    fetchAnsweredCount();
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
      router.push(`/community#${item.id}`);
    }
    setSearchText("");
    setShowSuggestions(false);
  };

  const categoryButtonStyles = {
    mentors: "bg-primary text-white border-primary",
    questions: "bg-primary text-white border-primary",
    courseGuides: "bg-primary text-white border-primary",
  };

  const categoryFillStyles = {
    mentors: "bg-primary/10 text-primary",
    questions: "bg-primary/10 text-primary",
    courseGuides: "bg-primary/10 text-primary",
  };

  const getChipStyle = (dimension, chip) => {
    if (dimension === "country") {
      return { color: "bg-ink/5 text-ink", icon: getFlag(chip) };
    }
    if (dimension === "language") {
      return getLanguageStyle(chip);
    }
    return getSubjectStyle(chip);
  };

  const topMentors = [...mentors].sort((a, b) => b.rating - a.rating).slice(0, 3);
  const heroMentor = topMentors[0] || mentors[0];
  const stripMentors = mentors.filter((m) => m.id !== heroMentor?.id).slice(0, 4);
  const topQuestions = [...questions].sort((a, b) => b.helpful - a.helpful).slice(0, 3);
  const verifiedMentorsCount = mentors.filter((m) => m.verified).length;
  const questionsAnsweredCount = questions.length + answeredUserQuestionsCount;
  const careerPathsCount = new Set(mentors.map((m) => m.subject)).size;
  const ratedMentors = mentors.filter((m) => m.rating > 0);
  const avgRating = ratedMentors.length > 0
    ? (ratedMentors.reduce((sum, m) => sum + m.rating, 0) / ratedMentors.length).toFixed(1)
    : "—";
  const languagesCount = new Set(
    mentors.flatMap((m) =>
      typeof m.languages === "string"
        ? m.languages.split(",").map((l) => l.trim())
        : m.languages || []
    )
  ).size;
  const schoolsCount = new Set(mentors.map((m) => m.school)).size;

  const statsList = [
    { value: verifiedMentorsCount, label: "Verified Mentors" },
    { value: questionsAnsweredCount, label: "Questions Answered" },
    { value: careerPathsCount, label: "Career Paths" },
    { value: `${avgRating}★`, label: "Avg. Rating" },
    { value: languagesCount, label: "Languages" },
    { value: schoolsCount, label: "Universities" },
  ];

  return (
    <main className="min-h-screen bg-background bg-grain">
      <Navbar />

            {/* ============ HERO ============ */}
            <section className="relative overflow-hidden px-6 pt-4 pb-8 md:pt-6">
        {HERO_PHOTO_URL && (
          <div
            className="absolute right-0 top-0 w-full md:w-[55%] h-full pointer-events-none overflow-hidden"
            style={{
              position: "absolute",
              maskImage: "linear-gradient(to left, rgba(0,0,0,0.5), transparent)",
              WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,0.5), transparent)",
            }}
          >
            <PhotoBlock src={HERO_PHOTO_URL} className="w-full h-full" tint={30} opacity={32} />
          </div>
        )}
        <DecorShapes />
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[420px_1fr] gap-12 items-start relative">
          {/* Left: spotlight mentor photo — fixed-width column so it never resizes when a filter/category is selected */}
          <div className="relative w-full">
            {!mentorsLoading && heroMentor ? (
              <>
                <MentorPhoto
                  mentor={heroMentor}
                  className="w-full aspect-[4/5] rounded-2xl border border-border text-6xl"
                />
                <div className="absolute left-4 right-4 bottom-4 bg-badge/90 backdrop-blur-sm rounded-xl px-5 py-4">
                  <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary flex items-center gap-2 mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Verified Mentor
                  </p>
                  <p className="font-display text-white text-lg leading-tight">{heroMentor.name}</p>
                  <p className="text-white/70 text-sm italic">
                    {heroMentor.subject} · {heroMentor.school}
                  </p>
                </div>
              </>
            ) : (
              <div className="w-full aspect-[4/5] rounded-2xl border border-border bg-surface animate-pulse" />
            )}
          </div>

          {/* Right: headline + search */}
          <div>
            <p className="inline-block font-label text-[11px] tracking-[0.15em] uppercase border border-border rounded-full px-4 py-2 text-muted mb-7">
              Free Peer Mentorship For High Schoolers
            </p>
            <h1 className="font-display text-4xl md:text-6xl text-ink leading-[1.08] mb-6">
              Real answers.
              <br />
              <span className="italic text-primary">From the people living it.</span>
            </h1>
            <p className="text-muted text-lg mb-9 max-w-lg">
              Connect with verified university students for honest, first-hand advice about courses, universities, applications and student life —{" "}
              <span className="font-semibold text-ink">all completely free</span>.
            </p>

            {/* Category selector */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { key: "mentors", label: "Mentors" },
                { key: "questions", label: "Questions" },
                { key: "courseGuides", label: "Course Guides" },
              ].map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => handleCategorySelect(cat.key)}
                  className={`font-label text-[11px] tracking-[0.1em] uppercase px-4 py-2 rounded-full border transition ${
                    selectedCategory === cat.key
                      ? categoryButtonStyles[cat.key]
                      : "bg-surface text-muted border-border hover:border-primary/40"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <div className="flex items-stretch bg-surface border border-border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/30">
                <div className="flex-1 px-4 py-2.5 flex items-center gap-2 flex-wrap">
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
                          setShowSuggestions(true);
                        }
                      }
                    }}
                    placeholder="Choose Mentors, Course Guides or Questions to get started…"
                    className="flex-1 min-w-[160px] outline-none text-sm text-ink placeholder-muted bg-transparent"
                  />
                </div>
                <button
                  onClick={handleExplore}
                  className="font-label text-xs tracking-[0.1em] uppercase bg-primary text-white px-6 font-medium hover:bg-primary-dark transition shrink-0"
                >
                  {exploreButtonLabels[selectedCategory] || "Find →"}
                </button>
              </div>

              {showSuggestions && searchText.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-lg shadow-lg z-20 text-left overflow-hidden">
                  {searchResults.length > 0 ? (
                    searchResults.map((item, i) => {
                      let badgeLabel = "";
                      let badgeStyle = "bg-ink/5 text-muted";
                      let icon = "";

                      if (item.type === "category") {
                        badgeLabel = "Category";
                        badgeStyle = "bg-primary/10 text-primary";
                      } else if (item.type === "filter") {
                        badgeLabel = dimensionLabels[item.dimension] || item.dimension;
                        const style = getChipStyle(item.dimension, item.value);
                        badgeStyle = style.color;
                        icon = style.icon || "";
                      } else if (item.type === "mentor") {
                        badgeLabel = "Mentor";
                        badgeStyle = "bg-primary/10 text-primary";
                      } else if (item.type === "question") {
                        badgeLabel = "Question";
                        badgeStyle = "bg-ink/5 text-ink";
                      }

                      return (
                        <button
                          key={`${item.type}-${item.value}-${i}`}
                          onMouseDown={() => handleSuggestionClick(item)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-background transition text-left border-b border-border last:border-b-0"
                        >
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${badgeStyle}`}>
                            {icon} {badgeLabel}
                          </span>
                          <span className="text-ink truncate">{item.label}</span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-4 py-4 text-sm text-muted text-center">
                      No results for &ldquo;<span className="font-semibold text-ink">{searchText}</span>&rdquo; — try a category, subject, or mentor name.
                    </div>
                  )}
                </div>
              )}
            </div>


            {/* Thumbnail strip */}
            {!mentorsLoading && stripMentors.length > 0 && (
              <div className="flex gap-3 mt-8">
                {stripMentors.map((m) => (
                  <Link key={m.id} href={`/mentors/${m.id}`} className="relative w-16 h-16 md:w-20 md:h-20 shrink-0">
                    <MentorPhoto mentor={m} className="w-full h-full rounded-lg border border-border text-xl" />
                    <span className="absolute -bottom-1.5 -right-1.5 font-label text-[9px] tracking-wide uppercase bg-ink text-white px-1.5 py-0.5 rounded">
                      {m.school?.split(" ")[0] || getFlag(m.country)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============ STATS STRIP ============ */}
      <section className="px-6 py-8 border-y border-border bg-surface">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-6 gap-8 text-center">
          {mentorsLoading
            ? [...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-7 w-12 bg-background rounded mx-auto mb-2"></div>
                  <div className="h-3 w-20 bg-background rounded mx-auto"></div>
                </div>
              ))
            : statsList.map((stat) => (
                <div key={stat.label}>
                  <p className="font-display text-3xl text-primary">{stat.value}</p>
                  <p className="font-label text-[10px] tracking-[0.1em] uppercase text-muted mt-1">{stat.label}</p>
                </div>
              ))}
        </div>
      </section>

      {/* ============ FEATURED MENTORS (Quadzio "results" pattern) ============ */}
      <section className="relative overflow-hidden px-6 py-20 md:py-24">
        {MENTORS_PHOTO_URL && (
          <div
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              maskImage:
                "linear-gradient(to bottom, transparent, rgba(0,0,0,0.5) 15%, rgba(0,0,0,0.5) 85%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent, rgba(0,0,0,0.5) 15%, rgba(0,0,0,0.5) 85%, transparent)",
            }}
          >
            <PhotoBlock src={MENTORS_PHOTO_URL} className="w-full h-full" tint={35} opacity={9} />
          </div>
        )}
        <div className="max-w-6xl mx-auto relative">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-3">
                Meet The Mentors · Verified Now
              </p>
              <h2 className="font-display text-3xl md:text-4xl text-ink">
                Real students, <span className="italic text-primary">real answers</span>
              </h2>
            </div>
            <span className="font-label text-[11px] tracking-[0.1em] uppercase border border-border rounded-full px-4 py-2 text-muted flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {verifiedMentorsCount} Verified Mentors
            </span>
          </div>

          {mentorsError ? (
            <p className="text-red-600 font-semibold">Error: {mentorsError}</p>
          ) : mentorsLoading ? (
            <p className="text-muted">Loading mentors...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topMentors.map((mentor) => (
                <Link
                  key={mentor.id}
                  href={`/mentors/${mentor.id}`}
                  className="bg-surface border border-border rounded-2xl p-6 flex flex-col h-full hover:border-primary/40 transition"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <MentorPhoto mentor={mentor} className="w-16 h-16 rounded-lg shrink-0 text-xl" />
                    <div>
                      <p className="font-display text-lg text-ink leading-tight">{mentor.name}</p>
                      <p className="text-muted text-sm">
                        {getFlag(mentor.country)} {mentor.school}
                      </p>
                    </div>
                  </div>

                  <p className="text-muted text-sm italic mb-4 line-clamp-2">
                    &ldquo;{mentor.bio}&rdquo;
                  </p>

                  <p className="font-label text-[10px] tracking-[0.1em] uppercase text-primary mb-4">
                    {mentor.available ? "● Books Live 1:1 Calls" : "○ Currently Closed"}
                  </p>

                  <span className="mt-auto inline-flex items-center justify-center gap-2 font-label text-[11px] tracking-[0.1em] uppercase border border-ink/20 rounded-md px-4 py-2.5 text-ink hover:bg-ink hover:text-white transition">
                    View Profile →
                  </span>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <a href="/mentors" className="font-label text-xs tracking-[0.1em] uppercase text-ink underline underline-offset-4 hover:text-primary transition">
              See All Mentors →
            </a>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="px-6 py-20 md:py-24 border-y border-border bg-surface">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-xl mb-14">
            <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-3">
              How It Works
            </p>
            <h2 className="font-display text-3xl md:text-4xl text-ink">
              Three steps to a <span className="italic text-primary">real conversation</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-12">
            {howItWorksSteps.map((step) => (
              <div key={step.number} className="border-t border-border pt-6">
                <p className="font-display text-3xl text-primary/40 mb-4">{step.number}</p>
                <h3 className="font-display text-xl text-ink mb-2">{step.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ COMMUNITY ============ */}
      <section className="relative overflow-hidden px-6 py-20 md:py-24">
        {COMMUNITY_PHOTO_URL && (
          <div
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              maskImage:
                "linear-gradient(to bottom, transparent, rgba(0,0,0,0.5) 15%, rgba(0,0,0,0.5) 85%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent, rgba(0,0,0,0.5) 15%, rgba(0,0,0,0.5) 85%, transparent)",
            }}
          >
            <PhotoBlock src={COMMUNITY_PHOTO_URL} className="w-full h-full" tint={35} opacity={16} />
          </div>
        )}
        <div className="max-w-6xl mx-auto relative">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-3">
                From The Community
              </p>
              <h2 className="font-display text-3xl text-ink">
                What high schoolers are <span className="italic text-primary">actually asking</span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topQuestions.map((qa, i) => (
              <a key={i} href={`/community#${qa.id}`} className="bg-surface border border-border rounded-2xl p-6 flex flex-col h-full hover:border-primary/40 transition">
                <h4 className="font-display text-lg text-ink mb-2">{qa.question}</h4>
                <p className="text-muted text-sm italic mb-4 line-clamp-3">&ldquo;{qa.answer}&rdquo;</p>

                <div className="flex items-center gap-3 pt-4 mt-auto border-t border-border">
                  <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {qa.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-ink text-sm">{qa.name}</p>
                    <p className="font-label text-[10px] tracking-[0.05em] uppercase text-muted">
                      {qa.school} · {qa.year}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>

          <div className="text-center mt-10">
            <a href="/community" className="font-label text-xs tracking-[0.1em] uppercase text-ink underline underline-offset-4 hover:text-primary transition">
              See All Community Posts →
            </a>
          </div>
        </div>
      </section>

      {/* ============ WHY PEERVIA ============ */}
      <section className="px-6 py-20 md:py-24 border-t border-border bg-surface">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[280px_1fr] gap-12">
          <div>
            <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-3">
              Why PeerVia
            </p>
            <h2 className="font-display text-3xl text-ink mb-4 leading-tight">
              No brochures. <span className="italic text-primary">No sales pitches.</span>
            </h2>
            <p className="text-muted">Just a tool built by students, for students.</p>
          </div>
          <div className="divide-y divide-border">
            {whyPeerVia.map((item) => (
              <div key={item.title} className="flex items-start gap-5 py-6 first:pt-0 last:pb-0">
                <span className="font-display text-2xl text-primary/40 shrink-0 w-10">{item.number}</span>
                <div>
                  <h3 className="font-display text-lg text-ink mb-1">{item.title}</h3>
                  <p className="text-muted text-sm leading-relaxed">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

           {/* ============ CLOSING CTA ============ */}
      <section className="relative overflow-hidden px-6 py-24 text-center">
        {CTA_PHOTO_URL && (
          <>
            <PhotoBlock src={CTA_PHOTO_URL} className="absolute inset-0 w-full h-full" tint={70} />
            <div className="absolute inset-0 bg-ink/60" />
          </>
        )}
        {!CTA_PHOTO_URL && (
          <div className="absolute inset-0 bg-primary" />
        )}
        <div
          className="absolute -left-10 top-6 w-48 h-28 -rotate-12 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, var(--color-background) 0px, var(--color-background) 3px, transparent 3px, transparent 14px)",
          }}
        />
               <div className="max-w-xl mx-auto relative">
          <h2
            className="font-display text-4xl md:text-5xl text-ink mb-8"
            style={CTA_PHOTO_URL ? { color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.45)" } : undefined}
          >
            Browse free.{" "}
            <span
              className="italic"
              style={CTA_PHOTO_URL ? { color: "#fff" } : { color: "var(--color-primary)" }}
            >
              Join when ready.
            </span>
          </h2>
          <a
            href="/mentors"
            className="inline-block font-label text-sm tracking-[0.1em] uppercase bg-primary text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary-dark transition"
          >
            Find A Mentor →
          </a>
          <p className="font-label text-[11px] tracking-[0.05em] uppercase text-background/60 mt-5">
            100% Free · No Sign-Up To Browse · Verified Mentors Only
          </p>
        </div>
      </section>
    </main>
  );
}