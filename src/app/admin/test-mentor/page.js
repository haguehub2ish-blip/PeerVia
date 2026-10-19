"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";

const inputClass =
  "w-full border border-border rounded-lg bg-background px-3 py-2 text-sm text-ink placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30";

async function api(method, body) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("You must be logged in as an admin.");

  const res = await fetch("/api/admin/test-mentor", {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Something went wrong");
  return json;
}

export default function AdminTestMentor() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mentor, setMentor] = useState(null);
  const [mentorEmail, setMentorEmail] = useState(null);

  const [name, setName] = useState("Test Mentor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [formError, setFormError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await api("GET");
      setMentor(json.mentor);
      setMentorEmail(json.email);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    setSaving(true);
    try {
      const json = await api("POST", { name, email, password });
      setMentor(json.mentor);
      setMentorEmail(json.email);
      setPassword("");
      setNotice("Test mentor created. Log in with the email and password you just chose.");
    } catch (err) {
      setFormError(err.message);
    }
    setSaving(false);
  }

  async function handleDelete() {
    setFormError(null);
    setNotice(null);
    setSaving(true);
    try {
      const json = await api("DELETE");
      setMentor(null);
      setMentorEmail(null);
      setConfirmDelete(false);
      setNotice(json.warning || "Test mentor deleted.");
    } catch (err) {
      setFormError(err.message);
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="bg-surface border-b border-border px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/admin"
            className="font-label text-[10px] tracking-[0.1em] uppercase text-muted hover:text-ink transition"
          >
            ← Admin Dashboard
          </Link>
          <p className="font-label text-[10px] tracking-[0.15em] uppercase text-primary mt-4 mb-2">Admin</p>
          <h1 className="font-display text-3xl md:text-4xl text-ink leading-tight">Test mentor</h1>
          <p className="text-muted text-sm mt-2">
            A mentor account that only admins can see. Use it to try the mentor dashboard, calendar, answering
            questions and booking requests without asking a real mentor.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        {notice && (
          <div className="rounded-lg border border-green-300 bg-green-50 text-green-900 px-4 py-3 text-sm">
            {notice}
          </div>
        )}
        {formError && (
          <div className="rounded-lg border border-red-300 bg-red-50 text-red-800 px-4 py-3 text-sm">
            {formError}
          </div>
        )}

        {loading ? (
          <p className="text-muted text-sm">Loading...</p>
        ) : error ? (
          <p className="text-red-600 font-semibold">Error: {error}</p>
        ) : mentor ? (
          <>
            <div className="bg-surface border border-border rounded-lg p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
                <div>
                  <p className="font-label text-[10px] tracking-[0.15em] uppercase text-primary mb-1">
                    Hidden from the public
                  </p>
                  <h2 className="font-display text-2xl text-ink">{mentor.name}</h2>
                  <p className="text-sm text-muted">
                    {mentor.school} · {mentor.subject}
                  </p>
                </div>
                <Link
                  href={`/mentors/${mentor.id}`}
                  className="font-label text-[10px] tracking-[0.1em] uppercase px-4 py-2 rounded-full border border-border text-ink hover:border-primary hover:text-primary transition"
                >
                  View public profile
                </Link>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="font-label text-[10px] tracking-[0.1em] uppercase text-muted mb-1">Login email</dt>
                  <dd className="text-ink break-all">{mentorEmail || "—"}</dd>
                </div>
                <div>
                  <dt className="font-label text-[10px] tracking-[0.1em] uppercase text-muted mb-1">Password</dt>
                  <dd className="text-ink">The one you chose when creating it</dd>
                </div>
              </dl>
            </div>

            <div className="bg-surface border border-border rounded-lg p-6">
              <h3 className="font-display text-lg text-ink mb-3">How to use it</h3>
              <ol className="list-decimal pl-5 space-y-2 text-sm text-ink">
                <li>
                  Open a <strong>private / incognito window</strong> (or another browser) so you stay logged in as
                  admin in this one.
                </li>
                <li>
                  Go to <strong>/login</strong> there and sign in with the test mentor&apos;s email and password.
                </li>
                <li>
                  You&apos;ll land in the normal mentor experience: <strong>Mentor Dashboard</strong>, calendar,
                  profile editing, answering community questions, and the welcome tour.
                </li>
                <li>
                  In your admin window, open the test mentor&apos;s profile above to book a call or send a message
                  as a student. The mentor emails go to the test login&apos;s inbox.
                </li>
              </ol>
            </div>

            <div className="bg-surface border border-border rounded-lg p-6">
              <h3 className="font-display text-lg text-ink mb-1">Delete the test mentor</h3>
              <p className="text-sm text-muted mb-4">
                Removes the profile, its login, calendar events, answers and reviews. You can create a fresh one
                afterwards.
              </p>
              {confirmDelete ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleDelete}
                    className="font-label text-[11px] tracking-[0.08em] uppercase px-5 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-60"
                  >
                    {saving ? "Deleting…" : "Yes, delete it"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="font-label text-[11px] tracking-[0.08em] uppercase px-5 py-2 rounded-full border border-border text-ink hover:border-primary transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="font-label text-[11px] tracking-[0.08em] uppercase px-5 py-2 rounded-full border border-red-300 text-red-600 hover:bg-red-50 transition"
                >
                  Delete test mentor
                </button>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleCreate} className="bg-surface border border-border rounded-lg p-6 space-y-5">
            <div>
              <h2 className="font-display text-xl text-ink mb-1">Create the test mentor</h2>
              <p className="text-sm text-muted">
                This makes a real mentor login and profile that only admins can see.
              </p>
            </div>

            <div>
              <label className="font-label text-[10px] tracking-[0.1em] uppercase text-muted block mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className={inputClass}
              />
            </div>

            <div>
              <label className="font-label text-[10px] tracking-[0.1em] uppercase text-muted block mb-1.5">
                Login email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname+testmentor@gmail.com"
                required
                className={inputClass}
              />
              <p className="text-xs text-muted mt-1.5">
                Tip: use a <strong>+ alias</strong> of your own inbox, like yourname+testmentor@gmail.com. It
                counts as a new account, but every email the mentor would normally receive (booking requests,
                notifications) lands in your own inbox.
              </p>
            </div>

            <div>
              <label className="font-label text-[10px] tracking-[0.1em] uppercase text-muted block mb-1.5">
                Password
              </label>
              <div className="flex gap-2">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="font-label text-[10px] tracking-[0.1em] uppercase px-3 rounded-lg border border-border text-muted hover:text-ink transition shrink-0"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="font-label text-[11px] tracking-[0.08em] uppercase px-6 py-2.5 rounded-full bg-primary text-white hover:opacity-90 transition disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create test mentor"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}