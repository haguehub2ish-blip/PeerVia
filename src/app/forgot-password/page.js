"use client";
import { useState } from "react";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />

      <div className="max-w-md mx-auto px-6 py-16">
        <h1 className="font-display text-3xl text-ink mb-2">
          Reset Your Password
        </h1>
        <p className="text-muted mb-8">
          Enter your email and we'll send you a link to reset your password.
        </p>

        {sent ? (
          <div className="bg-primary/10 border border-primary/30 text-ink rounded-lg p-4 text-sm">
            If an account exists for that email, a reset link has been sent. Check your inbox. If not successful, please check your spam folder or try again later.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-border bg-background rounded-lg px-4 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <p className="text-sm text-muted text-center">
              Remembered your Password?{" "}
              <a href="/login" className="text-primary font-medium hover:underline">
                Log in
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}