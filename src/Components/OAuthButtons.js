"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const buttonClass =
  "w-full flex items-center justify-center gap-3 border border-border bg-background text-ink rounded-md px-3 py-2.5 text-sm font-medium hover:bg-surface transition disabled:opacity-50";
// Set to true once Microsoft sign-in is set up in Azure and Supabase.
const SHOW_MICROSOFT = false;

// "Continue with Google / Microsoft" buttons, plus an "or" divider.
// After signing in, people land on /auth/continue, which sends new students to the age check.
export default function OAuthButtons() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(null);

  async function signIn(provider) {
    setError(null);
    setLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider, // "google" or "azure" (Microsoft)
      options: {
        redirectTo: `${window.location.origin}/auth/continue`,
        ...(provider === "azure" ? { scopes: "email" } : {}),
      },
    });
    if (error) {
      setError(error.message);
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => signIn("google")} disabled={loading !== null} className={buttonClass}>
        <svg viewBox="0 0 48 48" className="w-4 h-4" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.4-4.7 7.1l7.3 5.7c4.3-4 6.8-9.9 6.8-17.3z" />
          <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.7 2.3-8.6 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
        {loading === "google" ? "Opening Google..." : "Continue with Google"}
      </button>

      {SHOW_MICROSOFT && (
        <button type="button" onClick={() => signIn("azure")} disabled={loading !== null} className={buttonClass}>
          <svg viewBox="0 0 23 23" className="w-4 h-4" aria-hidden="true">
            <path fill="#F25022" d="M1 1h10v10H1z" />
            <path fill="#7FBA00" d="M12 1h10v10H12z" />
            <path fill="#00A4EF" d="M1 12h10v10H1z" />
            <path fill="#FFB900" d="M12 12h10v10H12z" />
          </svg>
          {loading === "azure" ? "Opening Microsoft..." : "Continue with Microsoft"}
        </button>
      )}

      {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

            <p className="text-xs text-muted text-center">
        By continuing, you agree to our{" "}
        <a
          href="/documents/PeerVia-Terms-of-Service.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Terms
        </a>{" "}
        and{" "}
        <a
          href="/documents/PeerVia-Privacy-Policy.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Privacy Policy
        </a>
        .
      </p>

      <div className="flex items-center gap-3 pt-1">
        <span className="flex-1 border-t border-border" />
        <span className="text-xs text-muted">or use your email</span>
        <span className="flex-1 border-t border-border" />
      </div>
    </div>
  );
}