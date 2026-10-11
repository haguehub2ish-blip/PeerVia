"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/Components/Navbar";
import DateOfBirthPicker from "@/Components/DateOfBirthPicker";
import { supabase } from "@/lib/supabase";

function ageFrom(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const t = new Date();
  let age = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--;
  return age;
}

export default function VerifyAgePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <VerifyAge />
    </Suspense>
  );
}

function VerifyAge() {
  const searchParams = useSearchParams();
  let next = searchParams.get("next") || "/mentors";
  if (!next.startsWith("/") || next.startsWith("//")) next = "/mentors";

  const [loggedIn, setLoggedIn] = useState(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data?.user));
  }, []);

  const age = ageFrom(dateOfBirth);
  const isMinor = age !== null && age < 18;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const res = await fetch("/api/age-check", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ dateOfBirth, parentEmail: isMinor ? parentEmail : "" }),
    });
    const result = await res.json();
    setLoading(false);

    if (result.error) setError(result.error);
    else setDone(result);
  }

  const inputClass =
    "w-full border border-border rounded-md px-3 py-2.5 text-sm text-ink bg-background focus:outline-none focus:ring-2 focus:ring-ink/20";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-sm mx-auto px-6 py-20">
        <h1 className="font-display text-2xl text-ink mb-1">Confirm your age</h1>
        <p className="text-muted text-sm mb-8">
          To keep PeerVia a safe place, we ask everyone for their date of birth before they book a call.
        </p>

        {loggedIn === false ? (
          <p className="text-sm text-ink">
            Please <a href="/login" className="font-medium underline">log in</a> first.
          </p>
        ) : done ? (
          <div className="border border-border bg-surface rounded-lg p-6 shadow-sm space-y-2">
            {done.minor && done.status !== "approved" ? (
              <>
                <p className="font-semibold text-ink">We've emailed your parent or guardian.</p>
                <p className="text-sm text-muted">
                  Your account can be used once they approve it. After that, they'll also approve each call request.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-ink">Thanks, you're all set.</p>
                <a
                  href={next}
                  className="inline-block bg-ink text-white text-sm font-semibold px-4 py-2 rounded-md hover:opacity-90 transition"
                >
                  Continue
                </a>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-lg p-6 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Date of birth</label>
              <DateOfBirthPicker onChange={setDateOfBirth} />
            </div>

            {isMinor && (
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Parent or guardian's email</label>
                <input
                  type="email"
                  required
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  className={inputClass}
                />
                <p className="text-xs text-muted mt-1.5">
                  We'll email them to approve your account. They'll also approve each call request, and they must be with you during calls.
                </p>
              </div>
            )}

            {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading || loggedIn === null}
              className="w-full bg-ink text-white py-2.5 rounded-md text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Saving..." : "Continue"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}