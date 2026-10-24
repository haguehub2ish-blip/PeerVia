"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

// Quick-message box shown under "Book a Call" on a mentor's profile.
export default function MentorChat({ mentorId, mentorFirstName, available = true }) {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(null); // null = still checking
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [needsAge, setNeedsAge] = useState(false);
  const listRef = useRef(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportError, setReportError] = useState("");

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  }

  async function loadMessages({ silent = false } = {}) {
    const token = await getToken();
    if (!token) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/messages?mentorId=${encodeURIComponent(mentorId)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) setMessages(json.messages || []);
      else if (!silent) setError(json.error || "Couldn't load your messages.");
    } catch {
      if (!silent) setError("Couldn't load your messages.");
    }
    if (!silent) setLoading(false);
  }

  // Load when opened, then check for a reply every 15 seconds while it's open
  useEffect(() => {
    if (!open) return;
    loadMessages();
    const timer = setInterval(() => loadMessages({ silent: true }), 15000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mentorId]);

  // Keep the newest message in view
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  async function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setError("");
    setNeedsAge(false);

    const token = await getToken();
    if (!token) {
      setSignedIn(false);
      setSending(false);
      return;
    }

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mentorId, message: text }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Couldn't send your message.");
        if (json.code === "needs_age") setNeedsAge(true);
        if (json.code === "signin") setSignedIn(false);
      } else {
        setMessages((list) => [...list, json.message]);
        setDraft("");
      }
    } catch {
      setError("Couldn't send your message. Please try again.");
    }
    setSending(false);
  }

    async function handleReport() {
    setReporting(true);
    setReportError("");
    const token = await getToken();
    if (!token) {
      setSignedIn(false);
      setReporting(false);
      return;
    }
    try {
      const res = await fetch("/api/messages/report", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mentorId, reason: reportReason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReportError(json.error || "Couldn't send your report.");
      } else {
        setReportDone(true);
        setReportReason("");
      }
    } catch {
      setReportError("Couldn't send your report. Please try again.");
    }
    setReporting(false);
  }
  function formatTime(iso) {
    return new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!available}
          className="w-full text-left border border-border rounded-lg p-3 bg-background hover:border-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="block font-semibold text-ink text-sm">Send a message</span>
          <span className="block text-xs text-ink/70 mt-0.5">
            Got a quick question? No call needed.
          </span>
        </button>
      ) : (
        <div className="border border-border rounded-lg p-3 bg-surface">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg text-ink">Message {mentorFirstName}</h3>
            <div className="flex items-center gap-4">
              {signedIn && messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setReportOpen((o) => !o);
                    setReportDone(false);
                    setReportError("");
                  }}
                  className="font-label text-[10px] uppercase tracking-wide text-muted hover:text-red-600"
                >
                  Report
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-label text-[10px] uppercase tracking-wide text-muted hover:text-primary"
              >
                Close
              </button>
            </div>
          </div>

          {signedIn === false ? (
            <p className="text-sm text-ink/70">
              <a
                href={`/login?redirect=/mentors/${mentorId}`}
                className="underline font-semibold text-primary"
              >
                Sign in
              </a>{" "}
              to message {mentorFirstName}.
            </p>
          ) : (
            <>
              <div
                ref={listRef}
                className="max-h-64 overflow-y-auto space-y-2 mb-3 border border-border rounded-lg bg-background p-3"
              >
                {loading ? (
                  <p className="text-xs text-muted">Loading...</p>
                ) : messages.length === 0 ? (
                  <p className="text-xs text-muted">
                    No messages yet. Ask {mentorFirstName} anything short, like a course, a city or an application tip.
                  </p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender === "student" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-line break-words ${
                          m.sender === "student"
                            ? "bg-primary text-background"
                            : "bg-surface border border-border text-ink"
                        }`}
                      >
                        {m.body}
                        <p
                          className={`font-label text-[9px] uppercase tracking-wide mt-1 ${
                            m.sender === "student" ? "text-background/70" : "text-muted"
                          }`}
                        >
                          {m.sender === "student" ? "You" : mentorFirstName} · {formatTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {reportOpen && (
                <div className="mb-3 border border-border rounded-lg bg-background p-3 space-y-2">
                  {reportDone ? (
                    <p className="text-xs text-ink">
                      Thank you. We&apos;ve received your report and the PeerVia team will look at this conversation.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-ink/80">
                        Something wrong? Tell us what happened (optional). The PeerVia team will read this conversation.
                      </p>
                      <textarea
                        rows={2}
                        maxLength={500}
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        placeholder="What's the problem?"
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-surface"
                      />
                      {reportError && <p className="text-xs text-red-600">{reportError}</p>}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleReport}
                          disabled={reporting}
                          className="bg-red-600 text-white text-xs font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50"
                        >
                          {reporting ? "Sending..." : "Send report"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setReportOpen(false)}
                          className="text-xs text-muted hover:text-ink px-2"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <form onSubmit={handleSend} className="space-y-2">
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a short question..."
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-background"
                />
                {error && (
                  <p className="text-red-600 text-xs">
                    {error}{" "}
                    {needsAge && (
                      <a
                        href={`/verify-age?next=${encodeURIComponent(`/mentors/${mentorId}`)}`}
                        className="underline font-semibold"
                      >
                        Confirm your age
                      </a>
                    )}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="w-full bg-primary text-background font-semibold py-2.5 rounded-lg hover:bg-primary-dark transition disabled:opacity-50 text-sm"
                >
                  {sending ? "Sending..." : "Send message"}
                </button>
                <p className="text-[11px] text-muted leading-snug">
                  Keep it to quick questions. Please don&apos;t share your phone number, address or other personal
                  details. {mentorFirstName} will reply here and you&apos;ll get an email.
                </p>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}