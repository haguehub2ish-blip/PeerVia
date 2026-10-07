"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/Components/Navbar";
import { questions } from "@/data/questions";
import { courseGuides } from "@/data/courseGuides";
import { getFlag } from "@/data/mentors";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

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

// How each result type is labeled/badged in the search dropdown, and how its
// results are ordered (Mentors, then Course Guides, then Questions).
const SEARCH_TYPE_ORDER = ["mentor", "guide", "question"];
const SEARCH_TYPE_META = {
  mentor: { label: "Mentor", badge: "bg-primary/10 text-primary" },
  guide: { label: "Course Guide", badge: "bg-ink/5 text-ink" },
  question: { label: "Question", badge: "bg-ink/5 text-ink" },
};

// Put a real photo URL here once you've picked one (Unsplash/Pexels — see note below).
// Leave empty to keep the current plain teal background.
const CTA_PHOTO_URL = "/images/campus-medicine.jpg";
const HERO_PHOTO_URL = "/images/PV_HomePage.jpg"; // swap to a different file if you want a distinct hero image
const MENTORS_PHOTO_URL = "/images/PV_HomePage2.jpg"; // swap to a different file once you have one specific to this section
const COMMUNITY_PHOTO_URL = "/images/PV_HomePage3.jpg"; // swap to a different file once you have one specific to this section
const GUIDES_PHOTO_URL = "/images/PV_HomePage4.jpg"; // swap to a different file once you have one specific to this section


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

// --- Small floating annotation card used in the Course Guides preview ---
function AnnotationChip({ label, href, align = "left" }) {
  return (
    <div
      className={`bg-surface border border-border rounded-xl px-4 py-3 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <p
        className={`font-label text-[10px] tracking-[0.1em] uppercase text-ink flex items-center gap-2 ${
          align === "right" ? "justify-end" : ""
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
        {label}
      </p>
      <Link
        href={href}
        className="font-label text-[10px] tracking-[0.1em] uppercase text-primary mt-1 inline-block hover:underline underline-offset-2"
      >
        See Full Guide →
      </Link>
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
  const searchBoxRef = useRef(null);
  const [searchText, setSearchText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentors, setMentors] = useState([]);
  const [mentorsLoading, setMentorsLoading] = useState(true);
  const [mentorsError, setMentorsError] = useState(null);
  const [guides, setGuides] = useState([]);
  const [answeredUserQuestionsCount, setAnsweredUserQuestionsCount] = useState(0);
  const [communityQuestions, setCommunityQuestions] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [leavingIndex, setLeavingIndex] = useState(null);
    const [contact, setContact] = useState({ name: "", email: "", question: "", website: "" });
  const [contactStatus, setContactStatus] = useState("idle"); // idle | sending | sent | error
  const [contactError, setContactError] = useState("");

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactStatus("sending");
    setContactError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contact),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setContactStatus("sent");
      setContact({ name: "", email: "", question: "", website: "" });
    } catch (err) {
      setContactError(err.message);
      setContactStatus("error");
    }
  };
    const [contactOpen, setContactOpen] = useState(false);

  const closeContact = () => {
    setContactOpen(false);
    if (contactStatus === "sent" || contactStatus === "error") setContactStatus("idle");
  };

  // Close the popup with Escape
  useEffect(() => {
    if (!contactOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeContact();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [contactOpen, contactStatus]);

  // Close the suggestions dropdown on any click/tap outside the search box,
  // instead of relying on the input's onBlur (which races with clicking a
  // suggestion and can close the list before the tap/click registers).
  useEffect(() => {
    function handleOutsideClick(e) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  // Automatically rotate the hero mentor through the top 4 rated mentors.
  useEffect(() => {
    const count = Math.min(4, mentors.length);
    if (count < 2) return;
    const t = setTimeout(() => {
      setLeavingIndex(heroIndex);
      setHeroIndex((heroIndex + 1) % count);
    }, 5200);
    return () => clearTimeout(t);
  }, [mentors.length, heroIndex]);

  // Clear the "leaving" flag once the page-turn animation has finished (1600ms).
  useEffect(() => {
    if (leavingIndex === null) return;
    const t = setTimeout(() => setLeavingIndex(null), 1650);
    return () => clearTimeout(t);
  }, [leavingIndex]);

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

    async function fetchGuides() {
      const { data } = await supabase
        .from("course_guides")
        .select("id, subject, country, country_label");
      setGuides(data || []);
    }
    fetchGuides();

    // Real, user-submitted community questions (separate from the
    // hardcoded examples in data/questions.js) — only ones a mentor has
    // actually answered are worth surfacing in search.
    async function fetchCommunityQuestions() {
      const [{ data: userQs }, { data: answers }] = await Promise.all([
        supabase.from("user_questions").select("id, question, subject, country"),
        supabase.from("question_answers").select("user_question_id"),
      ]);
      const answeredIds = new Set((answers || []).map((a) => a.user_question_id));
      setCommunityQuestions((userQs || []).filter((q) => answeredIds.has(q.id)));
    }
    fetchCommunityQuestions();
  }, []);

  // --- Search index: one flat list across mentors, course guides and
  // questions, each carrying the real page it should link to. ---
  const buildSearchIndex = () => {
    const items = [];

    mentors.forEach((m) => {
      items.push({
        type: "mentor",
        key: `mentor-${m.id}`,
        label: m.name,
        meta: [m.subject, m.school].filter(Boolean).join(" · "),
        href: `/mentors/${m.id}`,
      });
    });

    guides.forEach((g) => {
      items.push({
        type: "guide",
        key: `guide-${g.id}`,
        label: `${g.subject} in ${g.country_label || g.country}`,
        meta: "Course Guide",
        href: `/course-guides/${g.id}`,
      });
    });

    questions.forEach((q) => {
      items.push({
        type: "question",
        key: `question-${q.id}`,
        label: q.question,
        meta: q.subject,
        href: `/community#${q.id}`,
      });
    });

    communityQuestions.forEach((q) => {
      items.push({
        type: "question",
        key: `question-${q.id}`,
        label: q.question,
        meta: q.subject ? q.subject.split(",")[0] : "Community Question",
        href: `/community#${q.id}`,
      });
    });

    return items;
  };

  const normalizedQuery = searchText.trim().toLowerCase();
  const matchedResults = normalizedQuery
    ? buildSearchIndex().filter(
        (item) =>
          item.label.toLowerCase().includes(normalizedQuery) ||
          (item.meta && item.meta.toLowerCase().includes(normalizedQuery))
      )
    : [];

  // Group into sections (max 4 per section) so results read as
  // "Mentors / Course Guides / Questions" rather than one mixed list.
  const groupedResults = SEARCH_TYPE_ORDER.map((type) => ({
    type,
    items: matchedResults.filter((item) => item.type === type).slice(0, 4),
  })).filter((group) => group.items.length > 0);

  const flatResults = groupedResults.flatMap((group) => group.items);

  const handleResultClick = (item) => {
    router.push(item.href);
    setSearchText("");
    setShowSuggestions(false);
  };

  const topMentors = [...mentors].sort((a, b) => b.rating - a.rating).slice(0, 3);
  const heroMentors = [...mentors].sort((a, b) => b.rating - a.rating).slice(0, 4);
  const heroMentor = heroMentors[heroIndex] || heroMentors[0];
  const topQuestions = [...questions].sort((a, b) => b.helpful - a.helpful).slice(0, 3);
  const previewGuide = courseGuides.find((g) => g.id === "medicine-nl") || courseGuides[0];
  const previewGuideUrl = "/course-guides/f6a57bf0-3656-42fc-9343-61e5a32c0499";
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

      <style>{`
        @keyframes pageTurn {
          0%   { transform: translate(0, 0) rotate(0deg) scale(1) rotateY(0deg); z-index: 50; }
          35%  { transform: translate(-22%, 2%) rotate(-5deg) scale(0.98) rotateY(-90deg); z-index: 50; }
          36%  { z-index: 5; }
          65%  { transform: var(--back-transform) rotateY(-270deg); z-index: 5; }
          100% { transform: var(--back-transform) rotateY(-360deg); z-index: 5; }
        }
        .shuffle-card {
          transition: transform 900ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 900ms ease;
          backface-visibility: hidden;
          transform-style: preserve-3d;
        }
        .shuffle-leaving {
          animation: pageTurn 1600ms cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .shuffle-card { transition: none; }
          .shuffle-leaving { animation: none; }
        }
      `}</style>

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
          {/* Left: spotlight mentor photo — auto-rotates through the top 4 mentors, click to open their page */}
          <div className="relative w-full pr-9 pb-9">
            {!mentorsLoading && heroMentors.length > 0 ? (
              <div className="relative w-full aspect-[4/5]" style={{ perspective: "1800px" }}>
                {heroMentors.map((m, i) => {
                  const n = heroMentors.length;
                  const offset = (i - heroIndex + n) % n; // 0 = top card
                  const isTop = offset === 0;
                  const stackTransform = `translate(${offset * 12}px, ${offset * 12}px) rotate(${offset * 2.5}deg) scale(${1 - offset * 0.04})`;
                  return (
                    <Link
                      key={m.id}
                      href={`/mentors/${m.id}`}
                      tabIndex={isTop ? 0 : -1}
                      aria-hidden={!isTop}
                      className={`shuffle-card absolute inset-0 block rounded-2xl overflow-hidden border border-border bg-surface ${
                        isTop ? "shadow-xl" : "shadow-md pointer-events-none"
                      } ${i === leavingIndex ? "shuffle-leaving" : ""}`}
                      style={{
                        transform: stackTransform,
                        zIndex: 40 - offset * 10,
                        "--back-transform": stackTransform,
                        transformOrigin: "left center",
                      }}
                    >
                      <MentorPhoto mentor={m} className="w-full h-full text-6xl" />
                      <div className="absolute left-4 right-4 bottom-4 bg-badge/90 backdrop-blur-sm rounded-xl px-5 py-4">
                        <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary flex items-center gap-2 mb-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          Verified Mentor
                        </p>
                        <p className="font-display text-white text-lg leading-tight">{m.name}</p>
                        <p className="text-white/70 text-sm italic">
                          {m.subject} · {m.school}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
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

            {/* Search */}
            <div className="relative" ref={searchBoxRef}>
              <div className="flex items-stretch bg-surface border border-border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/30">
                <div className="flex items-center pl-4 text-muted shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && flatResults.length > 0) {
                      handleResultClick(flatResults[0]);
                    } else if (e.key === "Escape") {
                      setShowSuggestions(false);
                    }
                  }}
                  placeholder="Search mentors, course guides, or questions…"
                  className="flex-1 min-w-0 px-3 py-3.5 outline-none text-sm text-ink placeholder-muted bg-transparent"
                />
                {searchText && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchText("");
                      setShowSuggestions(false);
                    }}
                    aria-label="Clear search"
                    className="px-4 text-muted hover:text-ink transition shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>

              {showSuggestions && normalizedQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-lg shadow-lg z-20 text-left overflow-hidden max-h-96 overflow-y-auto">
                  {groupedResults.length > 0 ? (
                    groupedResults.map((group) => (
                      <div key={group.type}>
                        <p className="font-label text-[10px] tracking-[0.1em] uppercase text-muted px-4 pt-3 pb-1">
                          {SEARCH_TYPE_META[group.type].label}s
                        </p>
                        {group.items.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => handleResultClick(item)}
                            className="w-full flex items-start gap-2 px-4 py-2.5 text-sm hover:bg-background transition text-left border-b border-border last:border-b-0"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block text-ink truncate">{item.label}</span>
                              {item.meta && (
                                <span className="block text-muted text-xs truncate mt-0.5">{item.meta}</span>
                              )}
                            </span>
                            <span
                              className={`shrink-0 font-label text-[9px] tracking-[0.08em] uppercase px-2 py-1 rounded-full ${SEARCH_TYPE_META[item.type].badge}`}
                            >
                              {SEARCH_TYPE_META[item.type].label}
                            </span>
                          </button>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-5 text-sm text-muted text-center">
                      No results for &ldquo;<span className="font-semibold text-ink">{searchText}</span>&rdquo;.
                      <Link
                        href="/mentors"
                        onClick={() => setShowSuggestions(false)}
                        className="block mt-2 font-label text-xs tracking-[0.08em] uppercase text-primary hover:underline"
                      >
                        Browse All Mentors →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick links — fills out the hero on larger screens and gives
                a fast path in without typing */}
            <div className="flex flex-wrap items-center gap-2 mt-5">
              <span className="font-label text-[10px] tracking-[0.1em] uppercase text-muted mr-1">
                Popular:
              </span>
              {["Medicine", "Engineering", "Law", "Computer Science", "Psychology"].map((subject) => (
                <Link
                  key={subject}
                  href={`/mentors?subject=${encodeURIComponent(subject)}`}
                  className="font-label text-[11px] tracking-[0.05em] px-3 py-1.5 rounded-full border border-border text-muted hover:border-primary/40 hover:text-ink transition"
                >
                  {subject}
                </Link>
              ))}
            </div>

            {/* Trust strip — reuses mentor data already in state, no extra query */}
            {!mentorsLoading && mentors.length > 0 && (
              <div className="flex items-center gap-3 mt-7">
                <div className="flex -space-x-2.5">
                  {mentors.slice(0, 5).map((m) => (
                    <div key={m.id} className="w-8 h-8 rounded-full border-2 border-background overflow-hidden shrink-0">
                      <MentorPhoto mentor={m} className="w-full h-full text-xs" />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted">
                  <span className="font-semibold text-ink">{verifiedMentorsCount}+ verified mentors</span>{" "}
                  already answering questions
                </p>
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

      {/* ============ COURSE GUIDES PREVIEW ============ */}
      {previewGuide && (
        <section className="relative overflow-hidden px-6 py-20 md:py-24 bg-ink">
          {GUIDES_PHOTO_URL && (
            <div
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{
                maskImage:
                  "linear-gradient(to bottom, transparent, rgba(0,0,0,0.5) 15%, rgba(0,0,0,0.5) 85%, transparent)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent, rgba(0,0,0,0.5) 15%, rgba(0,0,0,0.5) 85%, transparent)",
              }}
            >
              <PhotoBlock src={GUIDES_PHOTO_URL} className="w-full h-full" tint={45} opacity={12} />
            </div>
          )}
          <div className="max-w-5xl mx-auto relative">
            <div className="max-w-xl mb-14">
              <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-3">
                Course Guides
              </p>
              <h2 className="font-display text-3xl md:text-4xl text-white leading-tight">
                Imagine reading the admissions notes{" "}
                <span className="italic text-primary">a current student actually wrote.</span>
              </h2>
              <p className="text-background/60 mt-4 max-w-md">
                You can, for free. Here&rsquo;s what a course guide looks like.
              </p>
            </div>

            <div className="relative max-w-2xl mx-auto">
              {/* Mobile: annotation chips shown stacked above the card */}
              <div className="flex flex-wrap gap-3 mb-6 lg:hidden">
                <AnnotationChip label="Why This Country?" href={previewGuideUrl} />
                <AnnotationChip label="What Surprised Me" href={previewGuideUrl} />
                <AnnotationChip label="How To Get In" href={previewGuideUrl} />
              </div>

              {/* Desktop: annotation chips floating beside the card */}
              <div className="hidden lg:block absolute -left-4 top-16 -translate-x-full w-52">
                <AnnotationChip label="Why This Country?" href={previewGuideUrl} align="right" />
              </div>
              <div className="hidden lg:block absolute -right-4 top-6 translate-x-full w-52">
                <AnnotationChip label="What Surprised Me" href={previewGuideUrl} />
              </div>
              <div className="hidden lg:block absolute -right-4 bottom-24 translate-x-full w-52">
                <AnnotationChip label="How To Get In" href={previewGuideUrl} />
              </div>

              {/* Document card */}
              <div className="bg-background border border-border rounded-2xl p-8 md:p-10 shadow-[0_1px_0_0_rgba(36,26,18,0.04)]">
                <div className="flex items-center justify-between border-b border-border pb-4 mb-6 gap-4 flex-wrap">
                  <p className="font-label text-[10px] tracking-[0.15em] uppercase text-muted">
                    Course Guide
                  </p>
                  <p className="font-label text-[10px] tracking-[0.15em] uppercase text-primary">
                    {previewGuide.subject} · {previewGuide.countryLabel}
                  </p>
                </div>

                <p className="text-ink text-[15px] leading-relaxed mb-4">
                  {previewGuide.description}
                </p>

                {previewGuide.admission && (
                  <p className="text-ink text-[15px] leading-relaxed mb-4">
                    <span className="underline decoration-primary/70 decoration-2 underline-offset-2">
                      {previewGuide.admission}
                    </span>
                  </p>
                )}

                {previewGuide.extracurriculars?.length > 0 && (
                  <p className="text-muted text-[15px] leading-relaxed italic">
                    Popular extracurriculars: {previewGuide.extracurriculars.join(", ")}.
                  </p>
                )}

                <p className="font-label text-[10px] tracking-[0.1em] uppercase text-muted/60 mt-6">
                  {previewGuide.writtenBy}
                </p>

                <div className="border-t border-border mt-6 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="font-label text-[11px] tracking-[0.1em] uppercase text-ink mb-1">
                      Want The Full Guide?
                    </p>
                    <p className="text-muted text-sm">
                      Every course guide is free to read, in full —{" "}
                      <span className="text-ink font-semibold">no sign-up</span> needed to browse.
                    </p>
                  </div>
                  <Link
                    href="/course-guides"
                    className="shrink-0 text-center font-label text-xs tracking-[0.1em] uppercase bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition"
                  >
                    Browse Course Guides →
                  </Link>
                </div>
              </div>
            </div>

            <p className="text-center font-label text-[10px] tracking-[0.1em] uppercase text-background/50 italic mt-6">
              A real course guide, shown to illustrate what&rsquo;s inside.
            </p>
          </div>
        </section>
      )}

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
            {/* ============ CONTACT US ============ */}
      <section id="contact" className="px-6 py-10 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="font-display text-xl text-ink">
              Got a question? <span className="italic text-primary">Ask us.</span>
            </h2>
            <p className="text-muted text-sm mt-1">Feedback, questions, or want to become a mentor?</p>
          </div>
          <button
            type="button"
            onClick={() => setContactOpen(true)}
            className="shrink-0 font-label text-xs tracking-[0.1em] uppercase bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition"
          >
            Send Us A Message →
          </button>
        </div>

        {contactOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
            onClick={closeContact}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Contact PeerVia"
              className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface border border-border rounded-2xl p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeContact}
                aria-label="Close"
                className="absolute top-4 right-4 text-muted hover:text-ink transition"
              >
                ✕
              </button>

              {contactStatus === "sent" ? (
                <div className="text-center py-8">
                  <p className="font-display text-2xl text-ink mb-2">Message sent!</p>
                  <p className="text-muted text-sm mb-6">We&rsquo;ll reply to your email soon.</p>
                  <button
                    type="button"
                    onClick={closeContact}
                    className="font-label text-xs tracking-[0.1em] uppercase bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <h3 className="font-display text-xl text-ink pr-6">Contact PeerVia</h3>

                  <div>
                    <label htmlFor="contact-name" className="block font-label text-[10px] tracking-[0.1em] uppercase text-muted mb-1.5">
                      Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      maxLength={200}
                      value={contact.name}
                      onChange={(e) => setContact({ ...contact, name: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-email" className="block font-label text-[10px] tracking-[0.1em] uppercase text-muted mb-1.5">
                      Email
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      maxLength={200}
                      value={contact.email}
                      onChange={(e) => setContact({ ...contact, email: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-question" className="block font-label text-[10px] tracking-[0.1em] uppercase text-muted mb-1.5">
                      Your Question
                    </label>
                    <textarea
                      id="contact-question"
                      required
                      rows={4}
                      maxLength={5000}
                      value={contact.question}
                      onChange={(e) => setContact({ ...contact, question: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                    />
                  </div>

                  {/* Honeypot: hidden from humans, bots tend to fill it */}
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={contact.website}
                    onChange={(e) => setContact({ ...contact, website: e.target.value })}
                    className="hidden"
                  />

                  {contactStatus === "error" && (
                    <p className="text-red-600 text-sm font-semibold">{contactError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={contactStatus === "sending"}
                    className="w-full font-label text-xs tracking-[0.1em] uppercase bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition disabled:opacity-60"
                  >
                    {contactStatus === "sending" ? "Sending…" : "Send Message →"}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
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