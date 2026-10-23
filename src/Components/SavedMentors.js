"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useSavedMentors, MAX_SAVED_MENTORS } from "@/lib/useSavedMentors";
import { getFlag } from "@/data/mentors";

// The student's saved mentors, with a Remove button on each (and Undo).
export default function SavedMentors() {
  const { user, ready, savedIds, toggleSaved, pendingId, error } = useSavedMentors();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [lastRemoved, setLastRemoved] = useState(null);

  useEffect(() => {
    supabase
      .from("mentorss")
      .select("*")
      .eq("activated", true)
      .then(({ data, error: fetchError }) => {
        if (fetchError) setLoadError(fetchError.message || "Couldn't load mentors.");
        else setMentors(data || []);
        setLoading(false);
      });
  }, []);

  // Keep the order the student saved them in; skip mentors who are no longer active
  const savedMentors = savedIds
    .map((id) => mentors.find((m) => String(m.id) === id))
    .filter(Boolean);

  async function handleRemove(mentor) {
    const ok = await toggleSaved(mentor.id);
    if (ok) setLastRemoved({ id: mentor.id, name: mentor.name });
  }

  async function handleUndo() {
    if (!lastRemoved) return;
    await toggleSaved(lastRemoved.id);
    setLastRemoved(null);
  }

  if (loadError) return <p className="text-red-600 font-semibold">Error: {loadError}</p>;
  if (!ready || loading) return <p className="text-muted">Loading...</p>;

  if (!user) {
    return (
      <div className="border border-border rounded-2xl bg-surface p-8 text-center">
        <p className="font-display text-lg text-ink mb-1">Log in to save mentors</p>
        <Link href="/login" className="text-sm text-primary underline underline-offset-4">
          Log in
        </Link>
      </div>
    );
  }

  if (savedMentors.length === 0) {
    return (
      <div className="border border-border rounded-2xl bg-surface p-8 text-center">
        <p className="font-display text-lg text-ink mb-1">No saved mentors yet</p>
        <p className="text-muted text-sm mb-4">
          Open a mentor's profile and tap Save, or save one from your quiz results below.
        </p>
        <Link href="/mentors" className="text-sm text-primary underline underline-offset-4">
          Browse mentors
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="font-label text-[11px] tracking-[0.08em] uppercase text-muted mb-3">
        {savedMentors.length} of {MAX_SAVED_MENTORS} saved
      </p>

      <div className="space-y-3">
        {savedMentors.map((mentor) => (
          <div
            key={mentor.id}
            className="flex items-center gap-4 bg-surface border border-border rounded-2xl p-3"
          >
            <Link href={`/mentors/${mentor.id}`} className="flex items-center gap-4 min-w-0 flex-1">
              {mentor.photo_url ? (
                <img
                  src={mentor.photo_url}
                  alt={mentor.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl font-display shrink-0">
                  {mentor.initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-display text-ink text-base leading-tight truncate">{mentor.name}</p>
                <p className="font-label text-[10px] tracking-[0.05em] uppercase text-muted truncate">
                  {getFlag(mentor.country)} {mentor.school} · {mentor.subject}
                </p>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold mt-1 ${
                    mentor.available ? "text-primary" : "text-muted"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${mentor.available ? "bg-primary" : "bg-muted"}`}
                  ></span>
                  {mentor.available ? "Open for booking" : "Closed"}
                </span>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => handleRemove(mentor)}
              disabled={pendingId !== null}
              className="text-sm text-muted underline underline-offset-4 hover:text-red-700 shrink-0 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      {lastRemoved && (
        <p className="text-sm text-muted mt-3">
          Removed {lastRemoved.name}.{" "}
          <button
            type="button"
            onClick={handleUndo}
            className="text-primary font-medium underline underline-offset-4"
          >
            Undo
          </button>
        </p>
      )}
    </div>
  );
}