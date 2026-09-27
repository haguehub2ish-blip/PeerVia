"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/Components/Navbar";
import { getSubjectStyle, getFlag } from "@/data/mentors";
import { questions } from "@/data/questions";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const fields = ["All fields", "Medicine", "Engineering", "Law", "Business", "Computer Science", "Psychology", "Biology", "Architecture"];
const countries = ["NL & UK", "Netherlands", "United Kingdom"];

export default function QAFeed() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <QAFeedContent />
    </Suspense>
  );
}

function QAFeedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState(0);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [interactions, setInteractions] = useState({});
  const [interactionsLoading, setInteractionsLoading] = useState(true);
  const [showMyActivity, setShowMyActivity] = useState(false);
  const [userQuestions, setUserQuestions] = useState([]);
  const [userQuestionAnswers, setUserQuestionAnswers] = useState([]);
  const [openAnsweredUserQuestions, setOpenAnsweredUserQuestions] = useState(new Set());

  function toggleAnsweredUserQuestion(id) {
    setOpenAnsweredUserQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }
  const answeredIds = new Set(userQuestionAnswers.map((a) => a.user_question_id));
  const unansweredUserQuestions = userQuestions.filter((uq) => !answeredIds.has(uq.id));
  const answeredUserQuestions = userQuestions
    .filter((uq) => answeredIds.has(uq.id))
    .map((uq) => ({
      ...uq,
      answerData: userQuestionAnswers.find((a) => a.user_question_id === uq.id),
    }));
  const [askText, setAskText] = useState("");
  const [showAskFilters, setShowAskFilters] = useState(false);
  const [askSubjects, setAskSubjects] = useState([]);
  const [askCountries, setAskCountries] = useState([]);
  const [askError, setAskError] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState({});
  const viewedThisSession = useRef(new Set());

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      const index = questions.findIndex((q) => q.id === hash);
      if (index !== -1) {
        setOpenIndex(index);
      }
    }
  }, []);

  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("NL & UK");

  useEffect(() => {
    const fieldParam = searchParams.get("field");
    if (fieldParam) {
      const validFields = fieldParam.split(",").filter((f) => fields.includes(f));
      if (validFields.length > 0) {
        setSelectedFields(validFields);
      }
    }

    const countryParam = searchParams.get("country");
    const countryDisplayMap = { NL: "Netherlands", UK: "United Kingdom" };
    if (countryParam) {
      const firstCode = countryParam.split(",")[0];
      if (countryDisplayMap[firstCode]) {
        setSelectedCountry(countryDisplayMap[firstCode]);
      }
    }
  }, [searchParams]);

  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadInteractions() {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user || null;
      setUser(currentUser);
      setAuthChecked(true);

      const [{ data: likes }, { data: comments }, { data: views }, { data: askedQuestions }, { data: userQuestionAnswers }] = await Promise.all([
        supabase.from("question_likes").select("question_id, user_id"),
        supabase
          .from("question_comments")
          .select("id, question_id, user_id, author_name, content, created_at")
          .order("created_at", { ascending: true }),
        supabase.from("question_views").select("question_id, view_count"),
        supabase
          .from("user_questions")
          .select("id, user_id, question, author_name, subject, country, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("question_answers")
          .select("id, user_question_id, mentor_id, mentor_name, answer, created_at"),
      ]);

      setUserQuestions(askedQuestions || []);
      setUserQuestionAnswers(userQuestionAnswers || []);

      const next = {};
      const allQuestionIds = [
        ...questions.map((q) => q.id),
        ...(askedQuestions || []).map((uq) => uq.id),
      ];
      allQuestionIds.forEach((qid) => {
        const qLikes = (likes || []).filter((l) => l.question_id === qid);
        const qComments = (comments || []).filter((c) => c.question_id === qid);
        const qViews = (views || []).find((v) => v.question_id === qid);
        next[qid] = {
          likeCount: qLikes.length,
          liked: currentUser ? qLikes.some((l) => l.user_id === currentUser.id) : false,
          comments: qComments,
          commentDraft: "",
          viewCount: qViews ? qViews.view_count : 0,
        };
      });
      setInteractions(next);
      setInteractionsLoading(false);
    }
    loadInteractions();
  }, []);

  const registerView = async (qid) => {
    if (viewedThisSession.current.has(qid)) return;
    viewedThisSession.current.add(qid);

    setInteractions((prev) => ({
      ...prev,
      [qid]: { ...prev[qid], viewCount: (prev[qid]?.viewCount || 0) + 1 },
    }));

    const { error } = await supabase.rpc("increment_question_view", { qid });
    if (error) {
      setInteractions((prev) => ({
        ...prev,
        [qid]: { ...prev[qid], viewCount: Math.max((prev[qid]?.viewCount || 1) - 1, 0) },
      }));
      viewedThisSession.current.delete(qid);
    }
  };

  const handleToggleOpen = (qid, index, isOpen) => {
    setOpenIndex(isOpen ? null : index);
    if (!isOpen) {
      registerView(qid);
    }
  };

  const handleLike = async (qid) => {
    if (!user) {
      router.push("/login?reason=interact");
      return;
    }
    const current = interactions[qid] || { liked: false, likeCount: 0 };

    if (current.liked) {
      setInteractions((prev) => ({
        ...prev,
        [qid]: { ...prev[qid], liked: false, likeCount: Math.max(prev[qid].likeCount - 1, 0) },
      }));
      const { error } = await supabase
        .from("question_likes")
        .delete()
        .eq("question_id", qid)
        .eq("user_id", user.id);
      if (error) {
        setInteractions((prev) => ({
          ...prev,
          [qid]: { ...prev[qid], liked: true, likeCount: prev[qid].likeCount + 1 },
        }));
      }
    } else {
      setInteractions((prev) => ({
        ...prev,
        [qid]: { ...prev[qid], liked: true, likeCount: (prev[qid]?.likeCount || 0) + 1 },
      }));
      const { error } = await supabase
        .from("question_likes")
        .insert({ question_id: qid, user_id: user.id });
      if (error) {
        setInteractions((prev) => ({
          ...prev,
          [qid]: { ...prev[qid], liked: false, likeCount: Math.max(prev[qid].likeCount - 1, 0) },
        }));
      }
    }
  };

  const handleCommentDraftChange = (qid, value) => {
    setInteractions((prev) => ({
      ...prev,
      [qid]: { ...prev[qid], commentDraft: value },
    }));
  };

  const handleCommentSubmit = async (qid) => {
    if (!user) {
      router.push("/login?reason=interact");
      return;
    }
    const text = (interactions[qid]?.commentDraft || "").trim();
    if (!text) return;

    const authorName = user.user_metadata?.name || user.email;

    const { data, error } = await supabase
      .from("question_comments")
      .insert({ question_id: qid, user_id: user.id, author_name: authorName, content: text })
      .select()
      .single();

    if (!error && data) {
      setInteractions((prev) => ({
        ...prev,
        [qid]: {
          ...prev[qid],
          comments: [...(prev[qid]?.comments || []), data],
          commentDraft: "",
        },
      }));
    }
  };

  const handleDeleteComment = async (qid, commentId, commentUserId) => {
    if (!user || user.id !== commentUserId) return;
    if (!window.confirm("Delete this comment? This can't be undone.")) return;

    const previousComments = interactions[qid]?.comments || [];
    setInteractions((prev) => ({
      ...prev,
      [qid]: {
        ...prev[qid],
        comments: prev[qid].comments.filter((c) => c.id !== commentId),
      },
    }));

    const { error } = await supabase
      .from("question_comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (error) {
      setInteractions((prev) => ({
        ...prev,
        [qid]: { ...prev[qid], comments: previousComments },
      }));
    }
  };

  const toggleComments = (qid) => {
    setCommentsVisible((prev) => ({ ...prev, [qid]: !prev[qid] }));
  };

  const handleAskClick = () => {
    if (!user) {
      router.push("/login?reason=interact");
      return;
    }
    if (!askText.trim()) {
      setAskError(true);
      return;
    }
    setAskError(false);
    setShowAskFilters(true);
  };

  const handleAskPost = async () => {
    const text = askText.trim();
    if (!text) return;

    const authorName = user.user_metadata?.name || user.email;

    const { data, error } = await supabase
      .from("user_questions")
      .insert({
        user_id: user.id,
        question: text,
        author_name: authorName,
        subject: askSubjects.length > 0 ? askSubjects.join(",") : null,
        country: askCountries.length > 0 ? askCountries.join(",") : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to submit question:", error);
      return;
    }

    setUserQuestions((prev) => [data, ...prev]);
    setAskText("");
    setAskSubjects([]);
    setAskCountries([]);
    setShowAskFilters(false);
  };

  const handleDeleteQuestion = async (questionId, questionUserId) => {
    if (!user || user.id !== questionUserId) return;
    if (!window.confirm("Delete this question? This can't be undone.")) return;

    const previous = userQuestions;
    setUserQuestions((prev) => prev.filter((uq) => uq.id !== questionId));

    const { error } = await supabase
      .from("user_questions")
      .delete()
      .eq("id", questionId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to delete question:", error);
      setUserQuestions(previous);
    }
  };

  const toggleField = (field) => {
    if (field === "All fields") {
      setSelectedFields([]);
      return;
    }
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const countryCodeMap = { "Netherlands": "NL", "United Kingdom": "UK" };

  const filteredQuestions = questions.filter((q) => {
    const matchesField = selectedFields.length === 0 || selectedFields.includes(q.subject);
    const matchesCountry =
      selectedCountry === "NL & UK" || q.country === countryCodeMap[selectedCountry];
    const matchesSearch = q.question.toLowerCase().includes(search.toLowerCase());

    const qData = interactions[q.id];
    const matchesMyActivity =
      !showMyActivity ||
      (qData && (qData.liked || qData.comments.some((c) => c.user_id === user?.id)));

    return matchesField && matchesCountry && matchesSearch && matchesMyActivity;
  });

  const totalAnswered = questions.length + answeredUserQuestions.length;
  const totalHelpful = Object.values(interactions).reduce((sum, d) => sum + (d.likeCount || 0), 0);

  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />

      {authChecked && !user && (
        <div className="fixed inset-0 top-[65px] z-30 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
          <div className="bg-surface border border-border rounded-2xl p-8 max-w-sm text-center shadow-lg mx-4">
            <h2 className="font-display text-xl text-ink mb-2">Unlock Community Access</h2>
            <p className="text-muted text-sm mb-6">
              Sign up or log in to see mentor answers, ask your own questions, and join the conversation.
            </p>
            <div className="flex gap-2 justify-center">
              <a
                href="/signup?redirect=/community"
                className="bg-primary text-white px-5 py-2.5 rounded-md text-sm font-semibold hover:bg-primary-dark transition"
              >
                Sign Up
              </a>
              <a
                href="/login?redirect=/community"
                className="border border-border text-ink px-5 py-2.5 rounded-md text-sm font-semibold hover:bg-background transition"
              >
                Log In
              </a>
            </div>
          </div>
        </div>
      )}

      <div className={authChecked && !user ? "h-[calc(100vh-65px)] overflow-hidden pointer-events-none select-none blur-[1px]" : ""}>
        {/* Hero banner */}
        <section className="bg-ink text-white px-6 py-12 md:py-16">
          <div className="max-w-6xl mx-auto">
            <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-3">
              Community
            </p>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
              <h1 className="font-display text-3xl md:text-4xl leading-tight max-w-xl">
                Real questions, answered by students who've{" "}
                <span className="italic text-primary">actually done it</span>
              </h1>
              <div className="flex gap-8">
                <div>
                  <p className="font-display text-3xl text-primary">{totalAnswered}</p>
                  <p className="font-label text-[10px] tracking-[0.05em] uppercase text-white/60">
                    Answered
                  </p>
                </div>
                <div>
                  <p className="font-display text-3xl text-primary">{unansweredUserQuestions.length}</p>
                  <p className="font-label text-[10px] tracking-[0.05em] uppercase text-white/60">
                    Open
                  </p>
                </div>
                <div>
                  <p className="font-display text-3xl text-primary">{totalHelpful}</p>
                  <p className="font-label text-[10px] tracking-[0.05em] uppercase text-white/60">
                    Helpful Votes
                  </p>
                </div>
              </div>
            </div>

            {/* Ask box, embedded in hero */}
            <div className="mt-10 bg-white/10 border border-white/15 rounded-xl px-5 py-4 flex items-center gap-3 backdrop-blur-sm">
              <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm shrink-0">
                {(user?.user_metadata?.name || "?").charAt(0).toUpperCase()}
              </div>
              <input
                type="text"
                value={askText}
                onChange={(e) => {
                  setAskText(e.target.value);
                  if (askError) setAskError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAskClick();
                }}
                placeholder={user ? "Ask a question to verified mentors..." : "Log in to ask a question..."}
                className="flex-1 focus:outline-none text-sm text-white placeholder-white/50 bg-transparent"
              />
              <button
                onClick={handleAskClick}
                className="bg-primary text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-primary-dark transition shrink-0"
              >
                Ask
              </button>
            </div>
            {askError && (
              <p className="text-red-300 text-sm mt-2">Type a question before posting.</p>
            )}

            {showAskFilters && (
              <div className="mt-4 bg-white/10 border border-white/15 rounded-xl px-5 py-4 space-y-3 backdrop-blur-sm">
                <p className="text-sm font-medium text-white/80">
                  Want to tag your question so it's easier to find? (optional)
                </p>
                <div>
                  <p className="text-xs font-semibold text-white/50 mb-1.5">SUBJECT</p>
                  <div className="flex flex-wrap gap-2">
                    {fields.filter((f) => f !== "All fields").map((f) => {
                      const isSelected = askSubjects.includes(f);
                      return (
                        <button
                          key={f}
                          onClick={() =>
                            setAskSubjects((prev) =>
                              isSelected ? prev.filter((s) => s !== f) : [...prev, f]
                            )
                          }
                          className={`text-xs font-medium px-3 py-1 rounded-md border transition ${
                            isSelected
                              ? "border-primary text-primary bg-primary/20"
                              : "border-white/20 text-white/70 hover:border-white/40"
                          }`}
                        >
                          {f}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/50 mb-1.5">COUNTRY</p>
                  <div className="flex flex-wrap gap-2">
                    {["NL", "UK"].map((c) => {
                      const isSelected = askCountries.includes(c);
                      return (
                        <button
                          key={c}
                          onClick={() =>
                            setAskCountries((prev) =>
                              isSelected ? prev.filter((x) => x !== c) : [...prev, c]
                            )
                          }
                          className={`text-xs font-medium px-3 py-1 rounded-md border transition ${
                            isSelected
                              ? "border-primary text-primary bg-primary/20"
                              : "border-white/20 text-white/70 hover:border-white/40"
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleAskPost}
                    className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition"
                  >
                    Post question
                  </button>
                  <button
                    onClick={() => {
                      setAskSubjects([]);
                      setAskCountries([]);
                      handleAskPost();
                    }}
                    className="text-white/60 text-sm font-medium hover:text-white"
                  >
                    Skip filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-surface border-r border-border p-6 hidden md:block">
          <p className="text-xs font-semibold text-muted mb-3 tracking-wide">CAREER FIELD</p>
          <div className="space-y-1 mb-8">
            {fields.map((field) => {
              const isActive =
                field === "All fields" ? selectedFields.length === 0 : selectedFields.includes(field);
              return (
                <button
                  key={field}
                  onClick={() => toggleField(field)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition border-l-2 ${
                    isActive
                      ? "border-l-primary text-ink bg-primary/5 font-medium"
                      : "border-l-transparent text-muted hover:text-ink hover:bg-background/60"
                  }`}
                >
                  {field}
                </button>
              );
            })}
          </div>

          <p className="text-xs font-semibold text-muted mb-3 tracking-wide">COUNTRY</p>
          <div className="space-y-1">
            {countries.map((country) => (
              <button
                key={country}
                onClick={() => setSelectedCountry(country)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition border-l-2 ${
                  selectedCountry === country
                    ? "border-l-primary text-ink bg-primary/5 font-medium"
                    : "border-l-transparent text-muted hover:text-ink hover:bg-background/60"
                }`}
              >
                {country}
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 md:p-10">
          <div className="flex flex-col md:flex-row gap-3 md:items-center mb-6">
            <div className="flex-1 bg-surface border border-border rounded-lg px-4 py-2.5 flex items-center gap-2 focus-within:ring-2 focus-within:ring-primary">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions..."
                className="flex-1 focus:outline-none text-ink placeholder-muted bg-transparent"
              />
            </div>
            <button
              onClick={() => {
                if (!user) {
                  router.push("/login?reason=interact");
                  return;
                }
                setShowMyActivity((prev) => !prev);
              }}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold border transition shrink-0 ${
                showMyActivity
                  ? "bg-primary text-background border-primary"
                  : "bg-surface text-ink/80 border-border hover:border-primary"
              }`}
            >
              {showMyActivity ? "✓ My Activity" : "My Activity"}
            </button>
          </div>

          {/* Recently asked, not yet answered by a mentor */}
          {unansweredUserQuestions.length > 0 && (
            <div className="bg-surface border border-border rounded-xl px-5 py-4 mb-6 space-y-3">
              <p className="font-label text-xs uppercase tracking-wide text-primary flex items-center gap-1.5">
                🕒 Recently Asked
              </p>
              {unansweredUserQuestions.map((uq) => (
                <div key={uq.id} className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-border text-ink flex items-center justify-center font-bold text-xs shrink-0">
                      {(uq.author_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      {(uq.subject || uq.country) && (
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                          {uq.subject &&
                            uq.subject.split(",").map((s) => (
                              <span
                                key={s}
                                className="font-label text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-md border border-border text-ink/70 bg-background"
                              >
                                {s}
                              </span>
                            ))}
                          {uq.country &&
                            uq.country.split(",").map((c) => (
                              <span
                                key={c}
                                className="font-label text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-md border border-border text-ink/70 bg-background"
                              >
                                {c}
                              </span>
                            ))}
                        </div>
                      )}
                      <p className="text-sm text-ink">{uq.question}</p>
                      {(() => {
                        const answer = userQuestionAnswers.find(
                          (a) => a.user_question_id === uq.id
                        );
                        if (answer) {
                          return (
                            <div className="mt-2 bg-primary/5 border border-primary/20 rounded-lg p-3">
                              <p className="text-sm text-ink/90 mb-1">{answer.answer}</p>
                              <p className="text-xs font-semibold text-primary">
                                — <Link href={`/mentors/${answer.mentor_id}`} className="font-semibold text-primary hover:underline">{answer.mentor_name}</Link>, Verified Mentor
                              </p>
                            </div>
                          );
                        }
                        return (
                          <p className="text-xs text-muted">
                            {uq.author_name} · {formatDate(uq.created_at)} ·{" "}
                            <span className="text-primary">Awaiting An Answer</span>
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                  {user && user.id === uq.user_id && (
                    <button
                      onClick={() => handleDeleteQuestion(uq.id, uq.user_id)}
                      title="Delete your question"
                      className="text-muted hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition shrink-0"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* User-asked questions that have been answered */}
          {answeredUserQuestions.length > 0 && (
            <div className="space-y-4 mb-4">
              {answeredUserQuestions.map((uq) => {
                const isOpen = openAnsweredUserQuestions.has(uq.id);
                return (
                  <div
                    key={uq.id}
                    id={uq.id}
                    className="bg-surface border border-border rounded-xl overflow-hidden scroll-mt-24 hover:border-primary transition"
                  >
                    <div className="p-5 flex items-start justify-between gap-4 hover:bg-background/60 transition-colors rounded-t-xl">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {uq.subject &&
                            uq.subject.split(",").map((s) => (
                              <span
                                key={s}
                                className="font-label text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-md border border-border text-ink/70 bg-background"
                              >
                                {s}
                              </span>
                            ))}
                          {uq.country &&
                            uq.country.split(",").map((c) => (
                              <span
                                key={c}
                                className="font-label text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-md border border-border text-ink/70 bg-background"
                              >
                                {c}
                              </span>
                            ))}
                        </div>
                        <h3 className="font-display text-lg text-ink mb-2">{uq.question}</h3>
                        <button
                          onClick={() => {
                            toggleAnsweredUserQuestion(uq.id);
                            if (!isOpen) registerView(uq.id);
                          }}
                          className="text-primary font-semibold text-sm flex items-center gap-1 hover:text-primary-dark"
                        >
                          {isOpen ? "▲ Hide Answer" : "▼ Show Answer"}
                        </button>
                      </div>

                      {!isOpen && (() => {
                        const data = interactions[uq.id] || {
                          likeCount: 0,
                          liked: false,
                          comments: [],
                          commentDraft: "",
                          viewCount: 0,
                        };
                        return (
                          <div className="hidden sm:flex flex-col items-end gap-2 shrink-0 text-right">
                            <div className="flex items-center gap-2 bg-primary/10 rounded-full pl-1 pr-3 py-1">
                              <div className="w-6 h-6 rounded-full bg-primary text-background flex items-center justify-center font-bold text-[10px] shrink-0">
                                {(uq.answerData?.mentor_name || "?").charAt(0).toUpperCase()}
                              </div>
                              <p className="text-xs font-semibold text-primary">
                                {uq.answerData?.mentor_name}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleLike(uq.id)}
                                className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition ${
                                  data.liked
                                    ? "bg-primary border-primary text-background"
                                    : "bg-surface border-border text-ink/70 hover:border-primary hover:text-primary"
                                }`}
                              >
                                {data.liked ? "👍" : "🤍"} {data.likeCount}
                              </button>
                              <span className="flex items-center gap-1 text-xs font-medium text-muted bg-background px-2.5 py-1 rounded-full border border-border">
                                👁 {data.viewCount}
                              </span>
                              <span className="flex items-center gap-1 text-xs font-medium text-muted bg-background px-2.5 py-1 rounded-full border border-border">
                                💬 {data.comments.length}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted">
                              Asked {formatDate(uq.created_at)}
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    {isOpen && (
                      <>
                        <div className="px-5 pb-5 border-t border-border pt-4 text-ink/80 leading-relaxed">
                          {uq.answerData?.answer}
                        </div>
                        <div className="bg-background px-5 py-3 flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary text-background flex items-center justify-center font-bold text-xs shrink-0">
                              {(uq.answerData?.mentor_name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-primary text-sm">
                                {uq.answerData?.mentor_name}
                              </p>
                              <p className="text-muted text-xs">
                                Verified Mentor · Answered {formatDate(uq.answerData?.created_at)}
                              </p>
                            </div>
                          </div>
                          {(() => {
                            const data = interactions[uq.id] || {
                              likeCount: 0,
                              liked: false,
                              comments: [],
                              commentDraft: "",
                              viewCount: 0,
                            };
                            return (
                              <div className="flex items-center gap-4 text-sm">
                                <button
                                  onClick={() => handleLike(uq.id)}
                                  className={`flex items-center gap-1 font-medium transition ${
                                    data.liked ? "text-primary" : "text-muted hover:text-primary"
                                  }`}
                                >
                                  {data.liked ? "👍" : "🤍"} {data.likeCount} Found Helpful
                                </button>
                                <span className="text-muted">👁 {data.viewCount} Views</span>
                                <span className="text-muted">💬 {data.comments.length}</span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Comments */}
                        <div className="px-5 py-4 border-t border-border space-y-3">
                          {(() => {
                            const data = interactions[uq.id] || {
                              likeCount: 0,
                              liked: false,
                              comments: [],
                              commentDraft: "",
                              viewCount: 0,
                            };
                            return (
                              <>
                                <button
                                  onClick={() => toggleComments(uq.id)}
                                  className="text-sm font-medium text-ink/70 hover:text-ink"
                                >
                                  {commentsVisible[uq.id]
                                    ? "▲ Hide Comments"
                                    : `▼ Show Comments (${data.comments.length})`}
                                </button>

                                {commentsVisible[uq.id] && (
                                  <>
                                    {data.comments.length > 0 && (
                                      <div className="space-y-3">
                                        {data.comments.map((c) => (
                                          <div key={c.id} className="flex items-start gap-2">
                                            <div className="w-7 h-7 rounded-full bg-border text-ink flex items-center justify-center font-bold text-xs shrink-0">
                                              {(c.author_name || "?").charAt(0).toUpperCase()}
                                            </div>
                                            <div className="bg-background rounded-lg px-3 py-2 flex-1 flex items-start justify-between gap-2">
                                              <div>
                                                <p className="text-xs font-semibold text-ink">{c.author_name}</p>
                                                <p className="text-sm text-ink/80">{c.content}</p>
                                              </div>
                                              {user && user.id === c.user_id && (
                                                <button
                                                  onClick={() => handleDeleteComment(uq.id, c.id, c.user_id)}
                                                  title="Delete Your Comment"
                                                  className="text-muted hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition shrink-0"
                                                >
                                                  🗑️ Delete
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={data.commentDraft}
                                        onChange={(e) => handleCommentDraftChange(uq.id, e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") handleCommentSubmit(uq.id);
                                        }}
                                        placeholder={user ? "Add A Comment..." : "Log In To Comment..."}
                                        className="flex-1 border border-border rounded-lg px-3 py-2 text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary bg-surface"
                                      />
                                      <button
                                        onClick={() => handleCommentSubmit(uq.id)}
                                        className="bg-primary text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition shrink-0"
                                      >
                                        Post
                                      </button>
                                    </div>
                                  </>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Question cards */}
          <div className="space-y-4">
            {filteredQuestions.map((q, i) => {
              const isOpen = openIndex === i;
              const data = interactions[q.id] || {
                likeCount: 0,
                liked: false,
                comments: [],
                commentDraft: "",
                viewCount: 0,
              };

              return (
                <div
                  key={i}
                  id={q.id}
                  className="bg-surface border border-border rounded-xl overflow-hidden scroll-mt-24 hover:border-primary transition"
                >
                  <div className="p-5 flex items-start justify-between gap-4 hover:bg-background/60 transition-colors rounded-t-xl">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="font-label text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-md border border-border text-ink/70 bg-background">
                          {q.subject}
                        </span>
                        <span className="font-label text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-md border border-border text-ink/70 bg-background">
                          {q.country}
                        </span>
                      </div>
                      <h3 className="font-display text-lg text-ink mb-2">{q.question}</h3>
                      <button
                        onClick={() => handleToggleOpen(q.id, i, isOpen)}
                        className="text-primary font-semibold text-sm flex items-center gap-1 hover:text-primary-dark"
                      >
                        {isOpen ? "▲ Hide answer" : "▼ Show answer"}
                      </button>
                    </div>

                    {!isOpen && (
                      <div className="hidden sm:flex flex-col items-end gap-2 shrink-0 text-right">
                        <div className="flex items-center gap-2 bg-primary/10 rounded-full pl-1 pr-3 py-1">
                          <div className="w-6 h-6 rounded-full bg-primary text-background flex items-center justify-center font-bold text-[10px] shrink-0">
                            {q.initials}
                          </div>
                          <p className="text-xs font-semibold text-primary">{q.name}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleLike(q.id)}
                            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition ${
                              data.liked
                                ? "bg-primary border-primary text-background"
                                : "bg-surface border-border text-ink/70 hover:border-primary hover:text-primary"
                            }`}
                          >
                            {data.liked ? "👍" : "🤍"} {data.likeCount}
                          </button>
                          <span className="flex items-center gap-1 text-xs font-medium text-muted bg-background px-2.5 py-1 rounded-full border border-border">
                            👁 {data.viewCount}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-medium text-muted bg-background px-2.5 py-1 rounded-full border border-border">
                            💬 {data.comments.length}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted">{formatDate(q.date)}</p>
                      </div>
                    )}
                  </div>

                  {isOpen && (
                    <>
                      <div className="px-5 pb-5 border-t border-border pt-4 text-ink/80 leading-relaxed">
                        {q.answer}
                      </div>
                      <div className="bg-background px-5 py-3 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary text-background flex items-center justify-center font-bold text-xs shrink-0">
                            {q.initials}
                          </div>
                          <div>
                            <p className="font-semibold text-primary text-sm">{q.name}</p>
                            <p className="text-muted text-xs">
                              {q.school} · {q.year} · {formatDate(q.date)}
                            </p>
                          </div>
                        </div>
                        {interactionsLoading ? (
                          <div className="flex items-center gap-4">
                            <div className="h-4 w-28 bg-border rounded animate-pulse"></div>
                            <div className="h-4 w-16 bg-border rounded animate-pulse"></div>
                            <div className="h-4 w-10 bg-border rounded animate-pulse"></div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4 text-sm">
                            <button
                              onClick={() => handleLike(q.id)}
                              className={`flex items-center gap-1 font-medium transition ${
                                data.liked ? "text-primary" : "text-muted hover:text-primary"
                              }`}
                            >
                              {data.liked ? "👍" : "🤍"} {data.likeCount} found helpful
                            </button>
                            <span className="text-muted">👁 {data.viewCount} views</span>
                            <span className="text-muted">💬 {data.comments.length}</span>
                          </div>
                        )}
                      </div>

                      {/* Comments */}
                      <div className="px-5 py-4 border-t border-border space-y-3">
                        {interactionsLoading ? (
                          <div className="space-y-3 animate-pulse">
                            {[...Array(2)].map((_, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <div className="w-7 h-7 rounded-full bg-border shrink-0"></div>
                                <div className="flex-1 space-y-1.5">
                                  <div className="h-3 w-24 bg-border rounded"></div>
                                  <div className="h-3 w-full bg-border rounded"></div>
                                </div>
                              </div>
                            ))}
                            <div className="h-9 w-full bg-border rounded-lg"></div>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => toggleComments(q.id)}
                              className="text-sm font-medium text-ink/70 hover:text-ink"
                            >
                              {commentsVisible[q.id]
                                ? "▲ Hide comments"
                                : `▼ Show comments (${data.comments.length})`}
                            </button>

                            {commentsVisible[q.id] && (
                              <>
                                {data.comments.length > 0 && (
                                  <div className="space-y-3">
                                    {data.comments.map((c) => (
                                      <div key={c.id} className="flex items-start gap-2">
                                        <div className="w-7 h-7 rounded-full bg-border text-ink flex items-center justify-center font-bold text-xs shrink-0">
                                          {(c.author_name || "?").charAt(0).toUpperCase()}
                                        </div>
                                        <div className="bg-background rounded-lg px-3 py-2 flex-1 flex items-start justify-between gap-2">
                                          <div>
                                            <p className="text-xs font-semibold text-ink">{c.author_name}</p>
                                            <p className="text-sm text-ink/80">{c.content}</p>
                                          </div>
                                          {user && user.id === c.user_id && (
                                            <button
                                              onClick={() => handleDeleteComment(q.id, c.id, c.user_id)}
                                              title="Delete your comment"
                                              className="text-muted hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition shrink-0"
                                            >
                                              🗑️ Delete
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={data.commentDraft}
                                    onChange={(e) => handleCommentDraftChange(q.id, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleCommentSubmit(q.id);
                                    }}
                                    placeholder={user ? "Add a comment..." : "Log in to comment..."}
                                    className="flex-1 border border-border rounded-lg px-3 py-2 text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary bg-surface"
                                  />
                                  <button
                                    onClick={() => handleCommentSubmit(q.id)}
                                    className="bg-primary text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition shrink-0"
                                  >
                                    Post
                                  </button>
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </main>
        </div>
      </div>
    </div>
  );
}