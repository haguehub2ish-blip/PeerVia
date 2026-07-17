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
        `[FAQ] Duplicate question id(s) found: ${[...duplicates].join(", ")} — these questions will incorrectly share likes/comments/views.`
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

      const [{ data: likes }, { data: comments }, { data: views }] = await Promise.all([
        supabase.from("question_likes").select("question_id, user_id"),
        supabase
          .from("question_comments")
          .select("id, question_id, author_name, content, created_at")
          .order("created_at", { ascending: true }),
        supabase.from("question_views").select("question_id, view_count"),
      ]);

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
    return matchesField && matchesCountry && matchesSearch;
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
            <h1 className="text-2xl font-bold text-gray-900 shrink-0">Q&A Feed</h1>
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
          </div>

          {/* Ask a question box */}
          <div className="bg-white border border-gray-300 rounded-xl px-5 py-4 flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-full bg-green-800 text-white flex items-center justify-center font-bold text-sm shrink-0">
              You
            </div>
            <input
              type="text"
              placeholder="Ask a question to verified mentors..."
              className="flex-1 focus:outline-none text-gray-900 placeholder-gray-400"
            />
            <button className="bg-green-700 text-white px-5 py-2 rounded-lg font-medium hover:bg-green-800 transition shrink-0">
              Ask
            </button>
          </div>

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
                            {data.comments.length > 0 && (
                              <div className="space-y-3">
                                {data.comments.map((c) => (
                                  <div key={c.id} className="flex items-start gap-2">
                                    <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0">
                                      {(c.author_name || "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="bg-gray-50 rounded-lg px-3 py-2 flex-1">
                                      <p className="text-xs font-semibold text-gray-800">{c.author_name}</p>
                                      <p className="text-sm text-gray-600">{c.content}</p>
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