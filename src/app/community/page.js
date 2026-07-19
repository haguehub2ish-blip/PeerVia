"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/Components/Navbar";
import { getSubjectStyle, getFlag } from "@/data/mentors";
import { questions } from "@/data/questions";
import { supabase } from "@/lib/supabase";

const fields = ["All fields", "Medicine", "Engineering", "Law", "Business", "Computer Science", "Psychology", "Biology", "Architecture"];
const countries = ["NL & UK", "Netherlands", "United Kingdom"];

export default function QAFeed() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFF9F2]" />}>
      <QAFeedContent />
    </Suspense>
  );
}

function QAFeedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState(0);
const [user, setUser] = useState(null);
  const [interactions, setInteractions] = useState({});
  const [interactionsLoading, setInteractionsLoading] = useState(true);
  const [showMyActivity, setShowMyActivity] = useState(false);
    const [userQuestions, setUserQuestions] = useState([]);
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

  useEffect(() => {
    const seen = new Set();
    const duplicates = new Set();
    questions.forEach((q) => {
      if (seen.has(q.id)) duplicates.add(q.id);
      seen.add(q.id);
    });
    if (duplicates.size > 0) {
      console.warn(
        `[Community] Duplicate question id(s) found: ${[...duplicates].join(", ")} — these questions will incorrectly share likes/comments/views.`
      );
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

  // --- Load current user + all interaction data ---
  useEffect(() => {
    async function loadInteractions() {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user || null;
      setUser(currentUser);

      const [{ data: likes }, { data: comments }, { data: views }, { data: askedQuestions }] = await Promise.all([
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
      ]);

      setUserQuestions(askedQuestions || []);

      const next = {};
      questions.forEach((q) => {
        const qLikes = (likes || []).filter((l) => l.question_id === q.id);
        const qComments = (comments || []).filter((c) => c.question_id === q.id);
        const qViews = (views || []).find((v) => v.question_id === q.id);
        next[q.id] = {
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
      // roll back on failure
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

  return (
    <div className="min-h-screen bg-[#FFF9F2]">
      <Navbar />
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-300 p-6 hidden md:block">
          <p className="text-xs font-semibold text-gray-500 mb-3 tracking-wide">CAREER FIELD</p>
          <div className="space-y-1 mb-8">
            {fields.map((field) => {
              const isActive =
                field === "All fields" ? selectedFields.length === 0 : selectedFields.includes(field);
              return (
                <button
                  key={field}
                  onClick={() => toggleField(field)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition ${
                    isActive
                      ? "bg-green-50 text-green-800 font-semibold"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? "bg-green-600" : "bg-gray-300"
                    }`}
                  ></span>
                  {field}
                </button>
              );
            })}
          </div>

          <p className="text-xs font-semibold text-gray-500 mb-3 tracking-wide">COUNTRY</p>
          <div className="space-y-1">
            {countries.map((country) => (
              <button
                key={country}
                onClick={() => setSelectedCountry(country)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition ${
                  selectedCountry === country
                    ? "bg-green-50 text-green-800 font-semibold"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    selectedCountry === country ? "bg-green-600" : "bg-gray-300"
                  }`}
                ></span>
                {country}
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 md:p-10">
          {/* Top bar */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 shrink-0">Community</h1>
            <div className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2.5 flex items-center gap-2">
              <span>🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions..."
                className="flex-1 focus:outline-none text-gray-900 placeholder-gray-400"
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
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
              }`}
            >
              {showMyActivity ? "✓ My Activity" : "My Activity"}
            </button>
          </div>

          {/* Ask a question box */}
          <div className="bg-white border border-gray-300 rounded-xl px-5 py-4 flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-full bg-green-800 text-white flex items-center justify-center font-bold text-sm shrink-0">
              You
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
              className={`flex-1 focus:outline-none text-gray-900 placeholder-gray-400 ${
                askError ? "placeholder-red-400" : ""
              }`}
            />
            <button
              onClick={handleAskClick}
              className="bg-green-700 text-white px-5 py-2 rounded-lg font-medium hover:bg-green-800 transition shrink-0"
            >
              Ask
            </button>
          </div>
          {askError && (
            <p className="text-red-600 text-sm -mt-4 mb-6">
              Type a question before posting.
            </p>
          )}

          {showAskFilters && (
            <div className="bg-white border border-gray-300 rounded-xl px-5 py-4 mb-6 space-y-3">
              <p className="text-sm font-medium text-gray-700">
                Want to tag your question so it's easier to find? (optional)
              </p>

              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">SUBJECT</p>
                <div className="flex flex-wrap gap-2">
                  {fields.filter((f) => f !== "All fields").map((f) => {
                    const style = getSubjectStyle(f);
                    const isSelected = askSubjects.includes(f);
                    return (
                      <button
                        key={f}
                        onClick={() =>
                          setAskSubjects((prev) =>
                            isSelected ? prev.filter((s) => s !== f) : [...prev, f]
                          )
                        }
                        className={`text-xs font-semibold px-3 py-1 rounded-full transition ${style.color} ${
                          isSelected ? "ring-2 ring-gray-900" : "hover:opacity-80"
                        }`}
                      >
                        {style.icon} {f}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">COUNTRY</p>
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
                        className={`text-xs font-semibold px-3 py-1 rounded-full transition bg-slate-100 text-slate-700 ${
                          isSelected ? "ring-2 ring-gray-900" : "hover:opacity-80"
                        }`}
                      >
                        {getFlag(c)} {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleAskPost}
                  className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition"
                >
                  Post question
                </button>
                <button
                  onClick={() => {
                    setAskSubjects([]);
                    setAskCountries([]);
                    handleAskPost();
                  }}
                  className="text-gray-500 text-sm font-medium hover:text-gray-700"
                >
                  Skip filters
                </button>
              </div>
            </div>
          )}

          {/* Recently asked, not yet answered by a mentor */}
          {userQuestions.length > 0 && (
            <div className="bg-white border border-gray-300 rounded-xl px-5 py-4 mb-6 space-y-3">
              <p className="text-xs font-semibold text-gray-500 tracking-wide">RECENTLY ASKED</p>
              {userQuestions.map((uq) => (
                <div key={uq.id} className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {(uq.author_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      {(uq.subject || uq.country) && (
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                          {uq.subject &&
                            uq.subject.split(",").map((s) => (
                              <span
                                key={s}
                                className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${getSubjectStyle(s).color}`}
                              >
                                {getSubjectStyle(s).icon} {s}
                              </span>
                            ))}
                          {uq.country &&
                            uq.country.split(",").map((c) => (
                              <span
                                key={c}
                                className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700"
                              >
                                {getFlag(c)} {c}
                              </span>
                            ))}
                        </div>
                      )}
                      <p className="text-sm text-gray-900">{uq.question}</p>
                      <p className="text-xs text-gray-500">
                        {uq.author_name} · <span className="text-amber-600">Awaiting an answer</span>
                      </p>
                    </div>
                  </div>
                  {user && user.id === uq.user_id && (
                    <button
                      onClick={() => handleDeleteQuestion(uq.id, uq.user_id)}
                      title="Delete your question"
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition shrink-0"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              ))}
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
                  className="bg-white border border-gray-300 rounded-xl overflow-hidden scroll-mt-24"
                >
                  <div className="p-5">
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span
                        className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${getSubjectStyle(q.subject).color}`}
                      >
                        {getSubjectStyle(q.subject).icon} {q.subject}
                      </span>
                      <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                        {getFlag(q.country)} {q.country}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">{q.question}</h3>
                    <button
                      onClick={() => handleToggleOpen(q.id, i, isOpen)}
                      className="text-green-700 font-semibold text-sm flex items-center gap-1 hover:text-green-800"
                    >
                      {isOpen ? "▲ Hide answer" : "▼ Show answer"}
                    </button>
                  </div>

                  {isOpen && (
                    <>
                      <div className="px-5 pb-5 border-t border-gray-100 pt-4 text-gray-600 leading-relaxed">
                        {q.answer}
                      </div>
                      <div className="bg-gray-50 px-5 py-3 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {q.initials}
                          </div>
                          <div>
                            <p className="font-semibold text-green-800 text-sm">{q.name}</p>
                            <p className="text-gray-500 text-xs">
                              {q.school} · {q.year}
                            </p>
                          </div>
                        </div>
                        {interactionsLoading ? (
                          <div className="flex items-center gap-4">
                            <div className="h-4 w-28 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-4 w-10 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4 text-sm">
                            <button
                              onClick={() => handleLike(q.id)}
                              className={`flex items-center gap-1 font-medium transition ${
                                data.liked ? "text-green-700" : "text-gray-500 hover:text-green-700"
                              }`}
                            >
                              {data.liked ? "👍" : "🤍"} {data.likeCount} found helpful
                            </button>
                            <span className="text-gray-500">👁 {data.viewCount} views</span>
                            <span className="text-gray-500">💬 {data.comments.length}</span>
                          </div>
                        )}
                      </div>

                      {/* Comments */}
                      <div className="px-5 py-4 border-t border-gray-100 space-y-3">
                        {interactionsLoading ? (
                          <div className="space-y-3 animate-pulse">
                            {[...Array(2)].map((_, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0"></div>
                                <div className="flex-1 space-y-1.5">
                                  <div className="h-3 w-24 bg-gray-200 rounded"></div>
                                  <div className="h-3 w-full bg-gray-200 rounded"></div>
                                </div>
                              </div>
                            ))}
                            <div className="h-9 w-full bg-gray-200 rounded-lg"></div>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => toggleComments(q.id)}
                              className="text-sm font-medium text-gray-600 hover:text-gray-900"
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
                                        <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0">
                                          {(c.author_name || "?").charAt(0).toUpperCase()}
                                        </div>
                                        <div className="bg-gray-50 rounded-lg px-3 py-2 flex-1 flex items-start justify-between gap-2">
                                          <div>
                                            <p className="text-xs font-semibold text-gray-800">{c.author_name}</p>
                                            <p className="text-sm text-gray-600">{c.content}</p>
                                          </div>
                                          {user && user.id === c.user_id && (
                                            <button
                                              onClick={() => handleDeleteComment(q.id, c.id, c.user_id)}
                                              title="Delete your comment"
                                              className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition shrink-0"
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
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
                                  />
                                  <button
                                    onClick={() => handleCommentSubmit(q.id)}
                                    className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition shrink-0"
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
  );
}