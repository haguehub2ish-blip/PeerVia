"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// "Report" pill that sits next to Save and Share on a mentor's profile.
export default function ReportMentorButton({ mentorId, mentorName }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleOpen() {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) {
      router.push(`/login?redirect=/mentors/${mentorId}`);
      return;
    }
    setDone(false);
    setError("");
    setOpen(true);
  }

  async function handleSend() {
    setSending(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      const res = await fetch("/api/messages/report", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mentorId, reason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error || "Couldn't send your report.");
      else {
        setDone(true);
        setReason("");
      }
    } catch {
      setError("Couldn't send your report. Please try again.");
    }
    setSending(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title="Report this mentor"
        className="flex items-center gap-1.5 font-label text-[10px] tracking-[0.05em] uppercase px-3 py-1.5 rounded-full border border-border text-muted bg-surface hover:border-red-600 hover:text-red-600 transition"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
        Report
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <>
                <h2 className="font-display text-xl text-ink mb-2">Thank you</h2>
                <p className="text-sm text-ink/70 mb-5">
                  We&apos;ve received your report and the PeerVia team will look into it.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full bg-primary text-background font-semibold py-2.5 rounded-lg hover:bg-primary-dark transition text-sm"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <h2 className="font-display text-xl text-ink mb-1">Report {mentorName}</h2>
                <p className="text-sm text-ink/70 mb-3">
                  Tell us what happened. The PeerVia team will read your report, and any messages between you and this
                  mentor, to keep everyone safe.
                </p>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="What's the problem?"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-background"
                />
                {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending}
                    className="flex-1 bg-red-600 text-white font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50 text-sm"
                  >
                    {sending ? "Sending..." : "Send report"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-4 text-sm text-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}