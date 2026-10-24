"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";

// Where the "Unsubscribe" link in announcement emails leads.
// You have to be logged in, so only the account owner can change the setting.
export default function Unsubscribe() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
      setChecking(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const unsubscribed = user?.user_metadata?.emailPreferences?.announcements === false;

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoggingIn(false);
    if (error) setLoginError("Incorrect email or password. Please try again.");
  }

  async function handleGoogle() {
    setLoginError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/unsubscribe` },
    });
    if (error) setLoginError(error.message);
  }

  async function setAnnouncements(on) {
    setBusy(true);
    setError(null);
    const existing = user?.user_metadata?.emailPreferences || {};
    const { data, error } = await supabase.auth.updateUser({
      data: { emailPreferences: { ...existing, announcements: on } },
    });
    setBusy(false);
    if (error) setError("Something went wrong. Please try again.");
    else if (data?.user) setUser(data.user);
  }

  const inputClass =
    "w-full border border-border rounded-md px-3 py-2.5 text-sm text-ink bg-background focus:outline-none focus:ring-2 focus:ring-ink/20";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-sm mx-auto px-6 py-20">
        <h1 className="font-display text-2xl text-ink mb-1">Email preferences</h1>

        {checking ? (
          <p className="text-muted text-sm mt-4">Loading...</p>
        ) : user ? (
          <div className="bg-surface border border-border rounded-lg p-6 shadow-sm mt-6 space-y-4">
            <p className="text-sm text-muted">
              Logged in as <span className="text-ink font-medium">{user.email}</span>
            </p>

            {unsubscribed ? (
              <>
                <p className="text-sm text-ink">
                  You&apos;re unsubscribed. You won&apos;t get PeerVia news and announcements any more.
                </p>
                <button
                  onClick={() => setAnnouncements(true)}
                  disabled={busy}
                  className="text-sm text-primary underline underline-offset-2 disabled:opacity-50"
                >
                  Changed your mind? Turn them back on
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-ink">
                  Stop receiving PeerVia news and announcements by email? Emails about your own questions and answers are
                  not affected.
                </p>
                <button
                  onClick={() => setAnnouncements(false)}
                  disabled={busy}
                  className="w-full bg-ink text-white rounded-md py-2.5 text-sm font-medium hover:bg-ink/90 transition disabled:opacity-50"
                >
                  {busy ? "Saving..." : "Unsubscribe"}
                </button>
              </>
            )}

            {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

            <p className="text-xs text-muted">
              You can change this any time in{" "}
              <Link href="/settings" className="underline">
                Settings
              </Link>
              , under Notifications.
            </p>
          </div>
        ) : (
          <>
            <p className="text-muted text-sm mt-1 mb-6">Log in to unsubscribe from PeerVia announcements.</p>
            <form onSubmit={handleLogin} className="bg-surface border border-border rounded-lg p-6 shadow-sm space-y-4">
              <button
                type="button"
                onClick={handleGoogle}
                className="w-full border border-border bg-background text-ink rounded-md px-3 py-2.5 text-sm font-medium hover:bg-surface transition"
              >
                Continue with Google
              </button>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </div>

              {loginError && <p className="text-red-600 text-sm font-medium">{loginError}</p>}

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full bg-ink text-white rounded-md py-2.5 text-sm font-medium hover:bg-ink/90 transition disabled:opacity-50"
              >
                {loggingIn ? "Logging in..." : "Log in"}
              </button>

              <p className="text-xs text-muted text-center">
                <Link href="/forgot-password" className="underline">
                  Forgot your password?
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}