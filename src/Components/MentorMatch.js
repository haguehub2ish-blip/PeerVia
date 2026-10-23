"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useFilterOptions } from "@/lib/useFilterOptions";
import { getFieldGroups } from "@/lib/filterDefaults";
import { getFlag } from "@/data/mentors";
import { useSavedMentors } from "@/lib/useSavedMentors";
import SaveMentorButton from "@/Components/SaveMentorButton";

// What the student wants help with. A mentor scores points when their
// bio / about / support text contains one of the keywords.
const HELP_TOPICS = [
  { label: "Getting admitted", keywords: ["admission", "application", "apply", "selection", "selectie", "numerus", "interview", "motivation", "personal statement", "ucas"] },
  { label: "Choosing the right course", keywords: ["choose", "choice", "course", "programme", "program", "decision", "switch", "career"] },
  { label: "Moving abroad & student life", keywords: ["relocat", "international", "housing", "life", "abroad", "culture", "move", "social"] },
  { label: "Grades & study tips", keywords: ["grade", "exam", "study", "studying", "gpa", "revision", "workload"] },
  { label: "CV, internships & extracurriculars", keywords: ["intern", "extracurricular", "cv", "society", "project", "work experience", "volunteer", "research"] },
  { label: "Money, costs & scholarships", keywords: ["debt", "cost", "fee", "scholarship", "funding", "loan", "money", "budget"] },
];

const EMPTY_ANSWERS = { field: "", country: "", languages: [], help: [], availableOnly: false };

const toList = (value) =>
  typeof value === "string" ? value.split(",").map((l) => l.trim()).filter(Boolean) : value || [];

export function scoreMentor(mentor, answers, fieldDefs) {
  let score = 0;
  let max = 0;
  const reasons = [];

  // Field (40 pts)
  if (answers.field && answers.field !== "Not sure yet") {
    max += 40;
    if (getFieldGroups(mentor.subject, fieldDefs).includes(answers.field)) {
      score += 40;
      reasons.push(`Studies ${mentor.subject}`);
    }
  }

  // Country (20 pts)
  if (answers.country && answers.country !== "Either") {
    max += 20;
    if (mentor.country === answers.country) {
      score += 20;
      reasons.push(`Studies in ${mentor.country}`);
    }
  }

  // Languages (15 pts)
  if (answers.languages.length > 0) {
    max += 15;
    const shared = toList(mentor.languages).filter((l) => answers.languages.includes(l));
    if (shared.length > 0) {
      score += 15;
      reasons.push(`Speaks ${shared.join(", ")}`);
    }
  }

  // Help topics (25 pts, shared across the chosen topics)
  if (answers.help.length > 0) {
    max += 25;
    const text = [mentor.bio, mentor.about_me, mentor.support_guidance, mentor.extracurriculars]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matched = answers.help.filter((label) => {
      const topic = HELP_TOPICS.find((t) => t.label === label);
      return topic && topic.keywords.some((k) => text.includes(k));
    });
    score += Math.round((matched.length / answers.help.length) * 25);
    if (matched.length > 0) reasons.push(`Can help with: ${matched.join(", ").toLowerCase()}`);
  }

  // Availability bonus (5 pts)
  if (answers.availableOnly) {
    max += 5;
    if (mentor.available) {
      score += 5;
      reasons.push("Open for booking");
    }
  }

  const percent = max > 0 ? Math.round((score / max) * 100) : 0;
  return { mentor, percent, reasons };
}

// Pass `mentors` if the page already has them loaded (Mentors page).
// Without it, the component loads them itself (Settings page).
export default function MentorMatch({ mentors: mentorsProp }) {
  const { fields: fieldDefs, countries: countryDefs } = useFilterOptions();
  const [fetchedMentors, setFetchedMentors] = useState([]);
  const [loading, setLoading] = useState(!mentorsProp);
  const [fetchError, setFetchError] = useState(null);
  const mentors = mentorsProp || fetchedMentors;

  const [user, setUser] = useState(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const mentorSaver = useSavedMentors();
  const [showAll, setShowAll] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(EMPTY_ANSWERS);
  const [results, setResults] = useState(null);

  // Load mentors (only when the parent didn't pass them in)
  useEffect(() => {
    if (mentorsProp) return;
    supabase
      .from("mentorss")
      .select("*")
      .eq("activated", true)
      .then(({ data, error }) => {
        if (error) setFetchError(error.message || JSON.stringify(error));
        else setFetchedMentors(data || []);
        setLoading(false);
      });
  }, [mentorsProp]);

  // Load saved answers for a logged-in user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const currentUser = data?.user || null;
      setUser(currentUser);
      const savedAnswers = currentUser?.user_metadata?.matchAnswers;
      if (savedAnswers) {
        setAnswers({ ...EMPTY_ANSWERS, ...savedAnswers });
        setHasSaved(true);
      }
    });
  }, []);

  const languageOptions = [...new Set(mentors.flatMap((m) => toList(m.languages)))].sort((a, b) =>
    a.localeCompare(b)
  );

  const toggleIn = (key, value) =>
    setAnswers((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((v) => v !== value) : [...prev[key], value],
    }));

  const optionClass = (active) =>
    `font-label text-[11px] tracking-[0.05em] uppercase px-4 py-2 rounded-full border transition ${
      active
        ? "border-primary text-primary bg-primary/10"
        : "border-border text-muted bg-background hover:border-ink/30"
    }`;

  const steps = [
    {
      title: "Which field are you interested in?",
      hint: "Pick the one that fits best.",
      canContinue: Boolean(answers.field),
      body: (
        <div className="flex flex-wrap gap-2">
          {[...fieldDefs.map((f) => f.label), "Not sure yet"].map((f) => (
            <button key={f} type="button" onClick={() => setAnswers((p) => ({ ...p, field: f }))} className={optionClass(answers.field === f)}>
              {f}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Where do you want to study?",
      hint: "Pick one.",
      canContinue: Boolean(answers.country),
      body: (
        <div className="flex flex-wrap gap-2">
          {[...countryDefs.map((c) => ({ value: c.value, label: c.label })), { value: "Either", label: "Either / not sure" }].map((c) => (
            <button key={c.value} type="button" onClick={() => setAnswers((p) => ({ ...p, country: c.value }))} className={optionClass(answers.country === c.value)}>
              {c.label}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Which languages do you speak?",
      hint: "Select all that apply. Skip if it doesn't matter.",
      canContinue: true,
      body: (
        <div className="flex flex-wrap gap-2">
          {languageOptions.map((l) => (
            <button key={l} type="button" onClick={() => toggleIn("languages", l)} className={optionClass(answers.languages.includes(l))}>
              {l}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "What do you want help with?",
      hint: "Select all that apply.",
      canContinue: answers.help.length > 0,
      body: (
        <div className="flex flex-wrap gap-2">
          {HELP_TOPICS.map((t) => (
            <button key={t.label} type="button" onClick={() => toggleIn("help", t.label)} className={optionClass(answers.help.includes(t.label))}>
              {t.label}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Do you want to book a call soon?",
      hint: "We can prioritise mentors who are open for booking right now.",
      canContinue: true,
      body: (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setAnswers((p) => ({ ...p, availableOnly: true }))} className={optionClass(answers.availableOnly)}>
            Yes, only open mentors
          </button>
          <button type="button" onClick={() => setAnswers((p) => ({ ...p, availableOnly: false }))} className={optionClass(!answers.availableOnly)}>
            No, show everyone
          </button>
        </div>
      ),
    },
  ];

  function findMatches(useAnswers = answers) {
    const pool = useAnswers.availableOnly ? mentors.filter((m) => m.available) : mentors;
    const scored = pool
      .map((m) => scoreMentor(m, useAnswers, fieldDefs))
      .sort((a, b) => b.percent - a.percent || (Number(b.mentor.rating) || 0) - (Number(a.mentor.rating) || 0));
    setShowAll(false);
    setResults(scored.slice(0, 6));
  }

  function restart() {
    setResults(null);
    setStep(0);
    setSaved(false);
  }

  async function handleSaveAnswers() {
    setSaving(true);
    setSaved(false);
    const { error } = await supabase.auth.updateUser({ data: { matchAnswers: answers } });
    setSaving(false);
    if (!error) {
      setSaved(true);
      setHasSaved(true);
    }
  }

  const current = steps[step];
  const isLast = step === steps.length - 1;

  if (fetchError) return <p className="text-red-600 font-semibold">Error: {fetchError}</p>;
  if (loading) return <p className="text-muted">Loading...</p>;

  // RESULTS
  if (results) {
    return (
      <div>
        <h3 className="font-display text-xl text-ink mb-1">Your top matches</h3>
        <p className="text-muted text-sm mb-4">
          {mentorSaver.user
            ? "Tap Save on any mentor you like. You can save them one at a time and find them under Saved Mentors."
            : "Log in to save the mentors you like."}
        </p>
        {mentorSaver.error && <p className="text-sm text-red-600 mb-3">{mentorSaver.error}</p>}
        {results.length === 0 ? (
          <div className="border border-border rounded-2xl bg-surface p-8 text-center">
            <p className="font-display text-lg text-ink mb-1">No mentors found</p>
            <p className="text-muted text-sm">Try again with different answers.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(showAll ? results : results.slice(0, 3)).map(({ mentor, percent, reasons }, i) => (
              <Link
                key={mentor.id}
                href={`/mentors/${mentor.id}`}
                className="flex gap-4 bg-surface border border-border rounded-2xl p-4 hover:shadow-md transition"
              >
                {mentor.photo_url ? (
                  <img src={mentor.photo_url} alt={mentor.name} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-display shrink-0">
                    {mentor.initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-label text-[10px] tracking-[0.1em] uppercase text-primary">
                        {i === 0 ? "Best match" : `Match #${i + 1}`}
                      </p>
                      <p className="font-display text-ink text-base leading-tight truncate">{mentor.name}</p>
                      <p className="font-label text-[10px] tracking-[0.05em] uppercase text-muted truncate">
                        {getFlag(mentor.country)} {mentor.school} · {mentor.subject}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="font-display text-primary text-lg">{percent}%</span>
                      <SaveMentorButton
                        variant="pill"
                        loggedIn={Boolean(mentorSaver.user)}
                        saved={mentorSaver.isSaved(mentor.id)}
                        busy={mentorSaver.pendingId !== null}
                        onToggle={() => mentorSaver.toggleSaved(mentor.id)}
                      />
                    </div>
                  </div>
                  {reasons.length > 0 && (
                    <ul className="mt-2 text-xs text-muted space-y-0.5">
                      {reasons.map((r) => (
                        <li key={r}>✓ {r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
        {results.length > 3 && !showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-4 text-sm text-primary font-medium underline underline-offset-4"
          >
            Show more matches
          </button>
        )}
        <div className="flex items-center flex-wrap gap-4 mt-6">
          <button type="button" onClick={restart} className="text-sm text-muted underline underline-offset-4 hover:text-ink">
            Change my answers
          </button>
          {user && (
            <button
              type="button"
              onClick={handleSaveAnswers}
              disabled={saving}
              className="bg-ink text-white px-4 py-1.5 rounded-md text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save my answers"}
            </button>
          )}
          {saved && <span className="text-sm text-primary font-medium">Saved</span>}
        </div>
      </div>
    );
  }

  // QUIZ
  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      {hasSaved && step === 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 mb-5">
          <p className="text-sm text-ink">You have saved answers.</p>
          <button
            type="button"
            onClick={() => findMatches(answers)}
            className="text-sm font-semibold text-primary underline underline-offset-4"
          >
            See my matches
          </button>
        </div>
      )}
      <p className="font-label text-[11px] tracking-[0.08em] uppercase text-muted mb-1">
        Question {step + 1} of {steps.length}
      </p>
      <div className="w-full h-1.5 bg-border rounded-full mb-6">
        <div className="h-1.5 bg-primary rounded-full transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>
      <h3 className="font-display text-xl text-ink mb-1">{current.title}</h3>
      <p className="text-muted text-sm mb-5">{current.hint}</p>
      {current.body}
      <div className="flex items-center justify-between mt-8">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="text-sm text-muted underline underline-offset-4 hover:text-ink disabled:opacity-30"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => (isLast ? findMatches() : setStep((s) => s + 1))}
          disabled={!current.canContinue}
          className="bg-primary text-white font-label text-[11px] tracking-[0.08em] uppercase px-6 py-2.5 rounded-full disabled:opacity-40"
        >
          {isLast ? "Find my mentors" : "Next"}
        </button>
      </div>
    </div>
  );
}