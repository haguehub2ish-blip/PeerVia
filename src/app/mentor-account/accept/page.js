"use client";
import { useState, useEffect } from "react";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";

export default function MentorAcceptInvite() {
  const [tokenHash, setTokenHash] = useState(undefined);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTokenHash(params.get("token_hash"));
  }, []);

  async function handleAccept() {
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "invite",
    });

    if (error) {
      setError(
        "This invite link has expired or was already used. Email info@peervia.org and we'll send you a new one."
      );
      setLoading(false);
      return;
    }

    window.location.href = "/mentor-account/set-password";
  }

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />

      <div className="max-w-md mx-auto px-6 py-16">
        <h1 className="font-display text-3xl text-ink mb-2">
          Welcome To PeerVia
        </h1>
        <p className="text-muted mb-8">
          Press the button below to accept your mentor invite.
        </p>

        {tokenHash === null ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 text-sm">
            This link is incomplete. Please use the link from your invite email.
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
            {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
            <button
              type="button"
              onClick={handleAccept}
              disabled={loading || !tokenHash}
              className="w-full bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition disabled:opacity-50"
            >
              {loading ? "Accepting..." : "Accept Invite & Continue"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}