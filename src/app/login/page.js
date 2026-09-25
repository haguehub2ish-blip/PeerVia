"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError("Incorrect email or password. Please try again.");
    } else {
      window.location.href = "/";
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-sm mx-auto px-6 py-20">
        <h1 className="font-display text-2xl text-ink mb-1">Welcome back</h1>
        <p className="text-muted text-sm mb-8">Log in to your PeerVia account.</p>

        {reason === "interact" && (
          <div className="border border-amber-200 bg-amber-50 text-amber-800 rounded-md px-4 py-3 mb-6 text-sm">
            You need an account to like or comment on questions. Log in below to continue.
          </div>
        )}

        <form onSubmit={handleLogin} className="bg-surface border border-border rounded-lg p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-ink bg-background focus:outline-none focus:ring-2 focus:ring-ink/20"
            />
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-1.5">
              <label className="block text-sm font-medium text-ink">
                Password
              </label>
              <a href="/forgot-password" className="text-xs text-muted hover:text-ink transition">
                Forgot password?
              </a>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-ink bg-background focus:outline-none focus:ring-2 focus:ring-ink/20"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-white py-2.5 rounded-md text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="text-sm text-muted text-center mt-6">
          Don't have an account?{" "}
          <a href="/signup" className="text-ink font-medium hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}