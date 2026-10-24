"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Mentor-side inbox for student messages. Shown inside a card on the mentor dashboard.
export default function MentorMessages() {
  const [conversations, setConversations] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [sendingId, setSendingId] = useState(null);
  const [sendError, setSendError] = useState("");
  const [reportFor, setReportFor] = useState(null); // student_id being reported
  const [reportReason, setReportReason] = useState("");
  const [reportStatus, setReportStatus] = useState(""); // "" | "sending" | "done"
  const [reportError, setReportError] = useState("");

  async function api(method, body) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    const isReport = method === "POST_REPORT";
    const res = await fetch(isReport ? "/api/messages/report" : "/api/mentor/messages", {
      method: isReport ? "POST" : method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Something went wrong");
    return json;
  }

  async function load() {
    try {
      const json = await api("GET");
      setConversations(json.conversations || []);
      setError("");
    } catch (err) {
      setError(err.message);
    }
    setLoaded(true);
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendReply(studentId) {
    const text = (drafts[studentId] || "").trim();
    if (!text || sendingId) return;
    setSendingId(studentId);
    setSendError("");
    try {
      const json = await api("POST", { studentId, message: text });
      setConversations((list) =>
        list.map((c) =>
          c.student_id === studentId
            ? { ...c, needs_reply: false, last_at: json.message.created_at, messages: [...c.messages, json.message] }
            : c
        )
      );
      setDrafts((d) => ({ ...d, [studentId]: "" }));
    } catch (err) {
      setSendError(err.message);
    }
    setSendingId(null);
  }

  async function sendReport(studentId) {
    setReportStatus("sending");
    setReportError("");
    try {
      await api("POST_REPORT", { studentId, reason: reportReason });
      setReportStatus("done");
      setReportReason("");
    } catch (err) {
      setReportError(err.message);
      setReportStatus("");
    }
  }

  async function toggleBlock(studentId, shouldBlock) {
    if (shouldBlock && !window.confirm("Block this student? They won't be able to message you anymore.")) return;
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/mentor/messages/block", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data?.session?.access_token}` },
        body: JSON.stringify({ studentId, blocked: shouldBlock }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Something went wrong");
      setConversations((list) =>
        list.map((c) =>
          c.student_id === studentId
            ? { ...c, blocked: shouldBlock, needs_reply: shouldBlock ? false : c.messages[c.messages.length - 1]?.sender === "student" }
            : c
        )
      );
    } catch (err) {
      setSendError(err.message);
    }
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (error) return <p className="text-sm text-red-600">Couldn&apos;t load messages: {error}</p>;
  if (!loaded) return <p className="text-sm text-muted">Loading...</p>;
  if (conversations.length === 0) {
    return (
      <p className="text-sm text-muted">
        No messages yet. When a student sends you a quick question from your profile, it will show up here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map((c) => {
        const isOpen = openId === c.student_id;
        const last = c.messages[c.messages.length - 1];
        return (
          <div
            key={c.student_id}
            className={`border border-border rounded-lg ${c.needs_reply ? "bg-background" : "opacity-80"}`}
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : c.student_id)}
              className="w-full text-left p-4 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink flex items-center gap-2">
                  {c.student_name}
                  {c.needs_reply && (
                    <span className="font-label text-[9px] uppercase tracking-wide bg-primary text-background px-2 py-0.5 rounded-full">
                      Needs reply
                    </span>
                  )}
                  {c.blocked && (
                    <span className="font-label text-[9px] uppercase tracking-wide bg-red-600 text-white px-2 py-0.5 rounded-full">
                      Blocked
                    </span>
                  )}
                </p>
                {!isOpen && last && (
                  <p className="text-xs text-muted truncate mt-1">
                    {last.sender === "mentor" ? "You: " : ""}
                    {last.body}
                  </p>
                )}
              </div>
              <p className="font-label text-[10px] tracking-[0.05em] uppercase text-muted shrink-0">
                {formatTime(c.last_at)}
              </p>
            </button>

            {isOpen && (
              <div className="px-4 pb-4">
                <div className="max-h-72 overflow-y-auto space-y-2 mb-3">
                  {c.messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender === "mentor" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-line break-words ${
                          m.sender === "mentor"
                            ? "bg-primary text-background"
                            : "bg-surface border border-border text-ink"
                        }`}
                      >
                        {m.body}
                        <p
                          className={`font-label text-[9px] uppercase tracking-wide mt-1 ${
                            m.sender === "mentor" ? "text-background/70" : "text-muted"
                          }`}
                        >
                          {formatTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {c.blocked ? (
                  <p className="text-xs text-muted">
                    You blocked this student, so they can&apos;t send you messages. Unblock them below to reply again.
                  </p>
                ) : (
                  <>
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={drafts[c.student_id] || ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [c.student_id]: e.target.value }))}
                  placeholder="Write a reply..."
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-surface"
                />
                {sendError && <p className="text-xs text-red-600 mt-1">{sendError}</p>}
                <button
                  type="button"
                  onClick={() => sendReply(c.student_id)}
                  disabled={sendingId === c.student_id || !(drafts[c.student_id] || "").trim()}
                  className="mt-2 font-label text-[10px] tracking-[0.08em] uppercase px-4 py-1.5 rounded-full bg-primary text-white hover:opacity-90 transition disabled:opacity-50"
                >
                  {sendingId === c.student_id ? "Sending..." : "Send reply"}
                </button>

                  </>
                )}

                <button
                  type="button"
                  onClick={() => toggleBlock(c.student_id, !c.blocked)}
                  className="mt-3 font-label text-[10px] uppercase tracking-wide text-muted hover:text-red-600"
                >
                  {c.blocked ? "Unblock this student" : "Block this student"}
                </button>

                <div className="mt-3 pt-3 border-t border-border">
                  {reportFor !== c.student_id ? (
                    <button
                      type="button"
                      onClick={() => {
                        setReportFor(c.student_id);
                        setReportStatus("");
                        setReportError("");
                      }}
                      className="font-label text-[10px] uppercase tracking-wide text-muted hover:text-red-600"
                    >
                      Report this conversation
                    </button>
                  ) : reportStatus === "done" ? (
                    <p className="text-xs text-ink">
                      Thank you. We&apos;ve received your report and the PeerVia team will look at this conversation.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-ink/80">
                        Tell us what&apos;s wrong (optional). The PeerVia team will read this conversation.
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
                          onClick={() => sendReport(c.student_id)}
                          disabled={reportStatus === "sending"}
                          className="bg-red-600 text-white text-xs font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50"
                        >
                          {reportStatus === "sending" ? "Sending..." : "Send report"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setReportFor(null)}
                          className="text-xs text-muted hover:text-ink px-2"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}