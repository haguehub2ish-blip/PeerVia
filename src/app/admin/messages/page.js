"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";

function formatTime(iso) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminMessages() {
  const [data, setData] = useState({ conversations: [], reports: [], blocks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("reports");
  const [busy, setBusy] = useState(false);
  const [openKey, setOpenKey] = useState(null);
  const [thread, setThread] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);

  async function getToken() {
    const { data: session } = await supabase.auth.getSession();
    return session?.session?.access_token;
  }

  async function load() {
    const token = await getToken();
    if (!token) {
      setError("You must be logged in to view this page.");
      setLoading(false);
      return;
    }
    const res = await fetch("/api/admin/messages", { headers: { Authorization: `Bearer ${token}` } });
    const result = await res.json();
    if (result.error) setError(result.error);
    else {
      setData(result);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function send(method, body) {
    setBusy(true);
    const token = await getToken();
    const res = await fetch("/api/admin/messages", {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    if (result.error) alert("Error: " + result.error);
    await load();
    setBusy(false);
  }

  function blockUser(target, row) {
    const who = target === "student" ? row.student_name : row.mentor_name;
    if (!confirm(`Block ${who} from messaging anyone on PeerVia?`)) return;
    send("POST", { action: "block", target, studentId: row.student_id, mentorId: row.mentor_id });
  }

  function unblockUser(target, row) {
    send("POST", { action: "unblock", target, studentId: row.student_id, mentorId: row.mentor_id });
  }

  function dismissReport(report) {
    if (!confirm("Dismiss this report? It will be removed from the list.")) return;
    send("DELETE", { reportId: report.id });
  }

  async function toggleConversation(row) {
    const key = `${row.mentor_id}|${row.student_id}`;
    if (openKey === key) {
      setOpenKey(null);
      return;
    }
    setOpenKey(key);
    setThread([]);
    setThreadLoading(true);
    const token = await getToken();
    const res = await fetch(
      `/api/admin/messages?mentorId=${encodeURIComponent(row.mentor_id)}&studentId=${encodeURIComponent(row.student_id)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const result = await res.json();
    setThread(result.messages || []);
    setThreadLoading(false);
  }

  // Block / unblock buttons for both people in a conversation
  function BlockButtons({ row }) {
    const btn = "font-label text-[10px] tracking-[0.08em] uppercase px-3 py-1.5 rounded-full border transition disabled:opacity-50";
    return (
      <div className="flex flex-wrap gap-2">
        {row.student_blocked_site || (row.student_blocked && !row.student_blocked_site) ? (
          row.student_blocked_site ? (
            <button
              disabled={busy}
              onClick={() => unblockUser("student", row)}
              className={`${btn} border-green-600 text-green-700 hover:bg-green-50`}
            >
              Unblock student
            </button>
          ) : (
            <span className="font-label text-[10px] uppercase text-muted px-2 py-1.5">Student blocked by this mentor</span>
          )
        ) : (
          <button
            disabled={busy}
            onClick={() => blockUser("student", row)}
            className={`${btn} border-red-600 text-red-600 hover:bg-red-50`}
          >
            Block student
          </button>
        )}
        {row.mentor_blocked ? (
          <button
            disabled={busy}
            onClick={() => unblockUser("mentor", row)}
            className={`${btn} border-green-600 text-green-700 hover:bg-green-50`}
          >
            Unblock mentor
          </button>
        ) : (
          <button
            disabled={busy}
            onClick={() => blockUser("mentor", row)}
            className={`${btn} border-red-600 text-red-600 hover:bg-red-50`}
          >
            Block mentor
          </button>
        )}
      </div>
    );
  }

  function ConversationThread({ row }) {
    const key = `${row.mentor_id}|${row.student_id}`;
    if (openKey !== key) return null;
    return (
      <div className="mt-4 border-t border-border pt-4">
        {threadLoading ? (
          <p className="text-xs text-muted">Loading...</p>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2">
            {thread.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "mentor" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-line break-words ${
                    m.sender === "mentor" ? "bg-primary text-background" : "bg-background border border-border text-ink"
                  }`}
                >
                  {m.body}
                  <p
                    className={`font-label text-[9px] uppercase tracking-wide mt-1 ${
                      m.sender === "mentor" ? "text-background/70" : "text-muted"
                    }`}
                  >
                    {m.sender === "mentor" ? row.mentor_name : row.student_name} · {formatTime(m.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const tabs = [
    { id: "reports", label: `Reports (${data.reports.length})` },
    { id: "conversations", label: `All conversations (${data.conversations.length})` },
    { id: "blocked", label: `Blocked (${data.blocks.length})` },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="bg-surface border-b border-border px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/admin"
            className="font-label text-[10px] tracking-[0.1em] uppercase text-muted hover:text-ink transition"
          >
            ← Admin Dashboard
          </Link>
          <p className="font-label text-[10px] tracking-[0.15em] uppercase text-primary mt-4 mb-2">Admin</p>
          <h1 className="font-display text-3xl md:text-4xl text-ink leading-tight">Messages</h1>
          <p className="text-muted text-sm mt-2">
            Review reported conversations, read any conversation, and block people from messaging.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <p className="text-muted text-sm">Loading...</p>
        ) : error ? (
          <p className="text-red-600 text-sm">{error}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`font-label text-[10px] tracking-[0.1em] uppercase px-4 py-2 rounded-full border transition ${
                    tab === t.id
                      ? "bg-primary text-background border-primary"
                      : "bg-surface text-ink border-border hover:border-primary/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "reports" && (
              <div className="space-y-4">
                {data.reports.length === 0 && <p className="text-muted text-sm">No reports. All quiet.</p>}
                {data.reports.map((r) => (
                  <div key={r.id} className="bg-surface border border-border rounded-lg p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {r.reported_by === "student"
                            ? `${r.student_name} reported ${r.mentor_name}`
                            : `${r.mentor_name} reported ${r.student_name}`}
                        </p>
                        <p className="font-label text-[10px] uppercase tracking-wide text-muted mt-1">
                          {formatTime(r.created_at)}
                        </p>
                        <p className="text-sm text-ink/80 mt-2">
                          {r.reason ? r.reason : <em className="text-muted">No reason given</em>}
                        </p>
                      </div>
                      <button
                        disabled={busy}
                        onClick={() => dismissReport(r)}
                        className="font-label text-[10px] tracking-[0.08em] uppercase text-muted hover:text-ink"
                      >
                        Dismiss
                      </button>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => toggleConversation(r)}
                        className="font-label text-[10px] tracking-[0.08em] uppercase px-3 py-1.5 rounded-full border border-border text-ink hover:border-primary/50"
                      >
                        {openKey === `${r.mentor_id}|${r.student_id}` ? "Hide conversation" : "Read conversation"}
                      </button>
                      <BlockButtons row={r} />
                    </div>
                    <ConversationThread row={r} />
                  </div>
                ))}
              </div>
            )}

            {tab === "conversations" && (
              <div className="space-y-3">
                {data.conversations.length === 0 && <p className="text-muted text-sm">No conversations yet.</p>}
                {data.conversations.map((c) => (
                  <div key={`${c.mentor_id}|${c.student_id}`} className="bg-surface border border-border rounded-lg p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">
                          {c.student_name} ↔ {c.mentor_name}
                        </p>
                        <p className="text-xs text-muted truncate mt-1">
                          {c.last_sender === "mentor" ? "Mentor: " : "Student: "}
                          {c.last_body}
                        </p>
                      </div>
                      <p className="font-label text-[10px] uppercase tracking-wide text-muted shrink-0">
                        {c.count} messages · {formatTime(c.last_at)}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => toggleConversation(c)}
                        className="font-label text-[10px] tracking-[0.08em] uppercase px-3 py-1.5 rounded-full border border-border text-ink hover:border-primary/50"
                      >
                        {openKey === `${c.mentor_id}|${c.student_id}` ? "Hide conversation" : "Read conversation"}
                      </button>
                      <BlockButtons row={c} />
                    </div>
                    <ConversationThread row={c} />
                  </div>
                ))}
              </div>
            )}

            {tab === "blocked" && (
              <div className="space-y-3">
                {data.blocks.length === 0 && <p className="text-muted text-sm">Nobody is blocked.</p>}
                {data.blocks.map((b) => (
                  <div
                    key={b.id}
                    className="bg-surface border border-border rounded-lg p-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {b.name}{" "}
                        <span className="font-label text-[9px] uppercase tracking-wide text-muted ml-1">{b.role}</span>
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {b.scope === "all" ? "Blocked from all messaging" : `Blocked by ${b.scope} only`}
                        {b.reason ? ` · ${b.reason}` : ""} · {formatTime(b.created_at)}
                      </p>
                    </div>
                    <button
                      disabled={busy}
                      onClick={() => send("POST", { action: "unblock", blockId: b.id })}
                      className="font-label text-[10px] tracking-[0.08em] uppercase px-3 py-1.5 rounded-full border border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-50"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}