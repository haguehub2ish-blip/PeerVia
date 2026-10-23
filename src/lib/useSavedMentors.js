"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// How many mentors one student can save.
export const MAX_SAVED_MENTORS = 20;

// Saved mentors are stored as a list of mentor ids in the student's
// Supabase user_metadata (key: savedMentors). This is separate from the
// notification settings (emailPreferences.mentors), so nothing there changes.
const clean = (value) =>
  Array.isArray(value) ? [...new Set(value.map(String))] : [];

export function useSavedMentors() {
  const [user, setUser] = useState(null);
  const [savedIds, setSavedIds] = useState([]);
  const [ready, setReady] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [error, setError] = useState("");

  const idsRef = useRef([]);
  const busyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: userError } = await supabase.auth.getUser();
      if (cancelled) return;

      const currentUser = userError ? null : data?.user || null;
      setUser(currentUser);

      // Don't overwrite the list while a save is in flight
      if (!busyRef.current) {
        const ids = clean(currentUser?.user_metadata?.savedMentors);
        idsRef.current = ids;
        setSavedIds(ids);
      }
      setReady(true);
    }

    load();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const isSaved = useCallback((id) => savedIds.includes(String(id)), [savedIds]);

  // Saves the mentor if they aren't saved yet, removes them if they are.
  const toggleSaved = useCallback(
    async (id) => {
      const key = String(id);
      if (!user || busyRef.current) return false;

      const previous = idsRef.current;
      const wasSaved = previous.includes(key);

      if (!wasSaved && previous.length >= MAX_SAVED_MENTORS) {
        setError(`You can save up to ${MAX_SAVED_MENTORS} mentors. Remove one first.`);
        return false;
      }

      const next = wasSaved ? previous.filter((x) => x !== key) : [...previous, key];

      busyRef.current = true;
      setPendingId(key);
      setError("");
      idsRef.current = next;
      setSavedIds(next);

      const { error: updateError } = await supabase.auth.updateUser({
        data: { savedMentors: next },
      });

      if (updateError) {
        idsRef.current = previous;
        setSavedIds(previous);
        setError("Couldn't update your saved mentors. Please try again.");
      }

      busyRef.current = false;
      setPendingId(null);
      return !updateError;
    },
    [user]
  );

  return { user, ready, savedIds, isSaved, toggleSaved, pendingId, error };
}