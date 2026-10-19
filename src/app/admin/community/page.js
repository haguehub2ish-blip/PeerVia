"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";
import { questions as staticQuestions } from "@/data/questions";
import { useFilterOptions } from "@/lib/useFilterOptions";

const PAGE_SIZE = 30;

async function adminFetch(method, body) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const res = await fetch("/api/admin/community", {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Something went wrong");
  return json;
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Tag({ children }) {
  return (
    <span className="font-label text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-border/60 text-ink">
      {children}
    </span>
  );
}

// Text with an Edit button that turns it into a small editor.
function EditableText({ text, busy, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  if (!editing) {
    return (
      <div>
        <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{text}</p>
        <button
          type="button"
          onClick={() => {
            setDraft(text);
            setEditing(true);
          }}
          className="mt-1.5 font-label text-[10px] uppercase tracking-wide text-primary hover:underline"
        >
          Edit text
        </button>
      </div>
    );
  }

  return (
    <div>
      <textarea
        rows={4}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="w-full border border-border rounded-lg bg-background px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          disabled={busy || !draft.trim() || draft.trim() === text}
          onClick={async () => {
            const ok = await onSave(draft.trim());
            if (ok) setEditing(false);
          }}
          className="bg-primary text-background font-label text-[10px] uppercase tracking-wide px-3 py-2 rounded-lg hover:bg-primary-dark transition disabled:opacity-40"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="font-label text-[10px] uppercase tracking-wide px-3 py-2 rounded-lg border border-border text-ink hover:border-primary transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Pick the subject and country tags of a question, like the buttons shown when asking one.
function TagEditor({ item, subjectOptions, countryOptions, busy, onSave, onCancel }) {
  const split = (value) =>
    (value || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  const [subjects, setSubjects] = useState(split(item.subject));
  const [countries, setCountries] = useState(split(item.country));

  // Tags already on the question stay visible even if they're no longer in the lists.
  const withCurrent = (options, current) => [...options, ...current.filter((c) => !options.includes(c))];
  const toggle = (list, setList, value) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  const pill = (active) =>
    `text-xs font-medium px-3 py-1 rounded-md border transition ${
      active
        ? "border-primary text-primary bg-primary/10"
        : "border-border text-muted hover:border-primary"
    }`;

  return (
    <div className="bg-background border border-border rounded-lg p-4 mb-4 space-y-4">
      <div>
        <p className="font-label text-[10px] uppercase tracking-[0.12em] text-muted mb-2">Subject</p>
        <div className="flex flex-wrap gap-2">
          {withCurrent(subjectOptions, split(item.subject)).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggle(subjects, setSubjects, s)}
              className={pill(subjects.includes(s))}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="font-label text-[10px] uppercase tracking-[0.12em] text-muted mb-2">Country</p>
        <div className="flex flex-wrap gap-2">
          {withCurrent(countryOptions, split(item.country)).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggle(countries, setCountries, c)}
              className={pill(countries.includes(c))}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onSave(subjects, countries)}
          className="bg-primary text-background font-label text-[10px] uppercase tracking-wide px-3 py-2 rounded-lg hover:bg-primary-dark transition disabled:opacity-40"
        >
          Save tags
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="font-label text-[10px] uppercase tracking-wide px-3 py-2 rounded-lg border border-border text-ink hover:border-primary transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function AdminCommunity() {
  const [data, setData] = useState({ questions: [], answers: [], comments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState("questions");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);
  const { communityFields, countries: countryList } = useFilterOptions();
  const [tagEditId, setTagEditId] = useState(null);

  const load = useCallback(async () => {
    try {
      const json = await adminFetch("GET");
      setData({
        questions: json.questions || [],
        answers: json.answers || [],
        comments: json.comments || [],
      });
      setError(null);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Runs an edit or delete, then refreshes the list. Returns true when it worked.
  const act = useCallback(
    async (action, successMessage) => {
      setBusy(true);
      setError(null);
      try {
        await action();
        setNotice(successMessage);
        await load();
        setBusy(false);
        return true;
      } catch (e) {
        setError(e.message);
        setBusy(false);
        return false;
      }
    },
    [load]
  );

  const editText = (type, id, text) =>
    act(() => adminFetch("PATCH", { type, id, text }), "Saved.");

  async function saveTags(id, subjects, countryTags) {
    const ok = await act(
      () => adminFetch("PATCH", { type: "question", id, subject: subjects, country: countryTags }),
      "Tags saved."
    );
    if (ok) setTagEditId(null);
  }

  function remove(type, id, warning) {
    if (!window.confirm(warning)) return;
    act(() => adminFetch("DELETE", { type, id }), "Deleted.");
  }

  const answersByQuestion = useMemo(() => {
    const map = {};
    for (const a of data.answers) (map[a.user_question_id] ||= []).push(a);
    return map;
  }, [data.answers]);

  const commentCounts = useMemo(() => {
    const map = {};
    for (const c of data.comments) map[c.question_id] = (map[c.question_id] || 0) + 1;
    return map;
  }, [data.comments]);

  // Comments can sit on member questions or on the built-in questions from the code.
  const questionTextById = useMemo(() => {
    const map = {};
    for (const q of staticQuestions) map[q.id] = q.question;
    for (const q of data.questions) map[q.id] = q.question;
    return map;
  }, [data.questions]);

  const q = search.trim().toLowerCase();
  const includes = (...parts) => parts.filter(Boolean).join(" ").toLowerCase().includes(q);

  const visibleQuestions = data.questions.filter((item) => {
    const answers = answersByQuestion[item.id] || [];
    if (status === "answered" && answers.length === 0) return false;
    if (status === "unanswered" && answers.length > 0) return false;
    if (!q) return true;
    return (
      includes(item.question, item.author_name, item.subject, item.country) ||
      answers.some((a) => includes(a.answer, a.mentor_name))
    );
  });

  const visibleComments = data.comments.filter(
    (c) => !q || includes(c.content, c.author_name, questionTextById[c.question_id])
  );

  const unanswered = data.questions.filter((item) => !(answersByQuestion[item.id] || []).length).length;
  const list = tab === "questions" ? visibleQuestions : visibleComments;

  function switchTab(next) {
    setTab(next);
    setShown(PAGE_SIZE);
  }

  const tabClass = (active) =>
    `font-label text-xs uppercase tracking-wide px-4 py-2.5 rounded-lg border transition ${
      active
        ? "border-primary bg-primary text-background"
        : "border-border text-ink hover:border-primary"
    }`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link
          href="/admin"
          className="font-label text-xs uppercase tracking-wide text-muted hover:text-primary transition mb-6 inline-block"
        >
          ← Admin dashboard
        </Link>
        <p className="font-label text-[10px] tracking-[0.15em] uppercase text-primary mb-2">Admin</p>
        <h1 className="font-display text-3xl text-ink mb-1">Community</h1>
        <p className="text-muted text-sm mb-6">
          Review, edit, or remove questions, mentor answers, and comments.
        </p>

        {notice && (
          <p className="text-sm text-ink bg-primary/10 border border-primary/30 rounded-lg px-4 py-2.5 mb-5">
            {notice}
          </p>
        )}
        {error && <p className="text-sm text-red-600 font-semibold mb-5">{error}</p>}

        <div className="flex flex-wrap gap-3 mb-5">
          <button type="button" onClick={() => switchTab("questions")} className={tabClass(tab === "questions")}>
            Questions ({data.questions.length})
          </button>
          <button type="button" onClick={() => switchTab("comments")} className={tabClass(tab === "comments")}>
            Comments ({data.comments.length})
          </button>
          <span className="self-center text-xs text-muted">
            {unanswered} unanswered · {data.answers.length} answers
          </span>
        </div>

        <div className="flex flex-wrap gap-3 mb-2">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShown(PAGE_SIZE);
            }}
            placeholder={
              tab === "questions"
                ? "Search questions, answers, or people…"
                : "Search comments, people, or questions…"
            }
            className="flex-1 min-w-[16rem] border border-border rounded-xl bg-background px-5 py-3 text-ink placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {tab === "questions" && (
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setShown(PAGE_SIZE);
              }}
              className="border border-border rounded-xl bg-background px-4 py-3 text-sm text-ink"
            >
              <option value="all">All questions</option>
              <option value="unanswered">Unanswered</option>
              <option value="answered">Answered</option>
            </select>
          )}
        </div>
        <p className="text-xs text-muted mb-5">
          {loading ? "Loading…" : `${list.length} ${tab === "questions" ? "questions" : "comments"}`}
        </p>

        <div className="space-y-4">
          {tab === "questions" &&
            visibleQuestions.slice(0, shown).map((item) => {
              const answers = answersByQuestion[item.id] || [];
              const subjects = (item.subject || "").split(",").filter(Boolean);
              const countries = (item.country || "").split(",").filter(Boolean);
              return (
                <article key={item.id} className="bg-surface border border-border rounded-xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-xs text-muted">
                        {item.author_name || "Unknown"} · {formatDate(item.created_at)}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {subjects.map((s) => (
                          <Tag key={`s-${s}`}>{s}</Tag>
                        ))}
                        {countries.map((c) => (
                          <Tag key={`c-${c}`}>{c}</Tag>
                        ))}
                        <span
                          className={`font-label text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
                            answers.length ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {answers.length ? `${answers.length} answer${answers.length > 1 ? "s" : ""}` : "Unanswered"}
                        </span>
                        {commentCounts[item.id] > 0 && (
                          <Tag>
                            {commentCounts[item.id]} comment{commentCounts[item.id] > 1 ? "s" : ""}
                          </Tag>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setTagEditId(tagEditId === item.id ? null : item.id)}
                        className="font-label text-[10px] uppercase tracking-wide text-primary hover:underline"
                      >
                        Edit tags
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          remove(
                            "question",
                            item.id,
                            "Delete this question? Its answers, comments, and likes are deleted too. This can't be undone."
                          )
                        }
                        className="font-label text-[10px] uppercase tracking-wide text-red-600 hover:underline disabled:opacity-40"
                      >
                        Delete question
                      </button>
                    </div>
                  </div>

                  {tagEditId === item.id && (
                    <TagEditor
                      item={item}
                      subjectOptions={communityFields.map((f) => f.label)}
                      countryOptions={countryList.map((c) => c.value)}
                      busy={busy}
                      onSave={(subjects, countryTags) => saveTags(item.id, subjects, countryTags)}
                      onCancel={() => setTagEditId(null)}
                    />
                  )}

                  <EditableText
                    text={item.question}
                    busy={busy}
                    onSave={(text) => editText("question", item.id, text)}
                  />

                  {answers.map((a) => (
                    <div key={a.id} className="mt-4 ml-2 pl-4 border-l-2 border-primary/30">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <p className="text-xs text-muted">
                          <span className="font-semibold text-ink">{a.mentor_name || "Mentor"}</span> answered ·{" "}
                          {formatDate(a.created_at)}
                        </p>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            remove("answer", a.id, "Delete this answer? This can't be undone.")
                          }
                          className="font-label text-[10px] uppercase tracking-wide text-red-600 hover:underline disabled:opacity-40"
                        >
                          Delete answer
                        </button>
                      </div>
                      <EditableText
                        text={a.answer}
                        busy={busy}
                        onSave={(text) => editText("answer", a.id, text)}
                      />
                    </div>
                  ))}
                </article>
              );
            })}

          {tab === "comments" &&
            visibleComments.slice(0, shown).map((c) => (
              <article key={c.id} className="bg-surface border border-border rounded-xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted">
                      <span className="font-semibold text-ink">{c.author_name || "Unknown"}</span> ·{" "}
                      {formatDate(c.created_at)}
                    </p>
                    <p className="text-xs text-muted mt-1 line-clamp-2">
                      On: {questionTextById[c.question_id] || "a question that no longer exists"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove("comment", c.id, "Delete this comment? This can't be undone.")}
                    className="font-label text-[10px] uppercase tracking-wide text-red-600 hover:underline disabled:opacity-40"
                  >
                    Delete comment
                  </button>
                </div>
                <EditableText
                  text={c.content}
                  busy={busy}
                  onSave={(text) => editText("comment", c.id, text)}
                />
              </article>
            ))}

          {!loading && list.length === 0 && (
            <p className="text-sm text-muted">Nothing to show.</p>
          )}
        </div>

        {list.length > shown && (
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE_SIZE)}
            className="mt-6 font-label text-xs uppercase tracking-wide px-5 py-3 rounded-lg border border-border text-ink hover:border-primary transition"
          >
            Show more ({list.length - shown} left)
          </button>
        )}
      </div>
    </div>
  );
}