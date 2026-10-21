"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";

const ROLE_LABELS = {
  spokesperson: "Spokesperson",
  "course-guides": "Course Guide Contributor",
  "mentor-recruiting": "Mentor Recruiter",
  "social-content": "Content & Social Media",
  "school-outreach": "School Outreach",
  events: "Events",
  "design-tech": "Design, Tech & Translation",
  other: "Something else",
};

const STATUSES = ["new", "contacted", "active", "declined"];

const statusDots = {
  new: "bg-primary",
  contacted: "bg-blue-600",
  active: "bg-green-600",
  declined: "bg-red-600",
};

function Detail({ label, children }) {
  return (
    <div>
      <p className="font-label text-[10px] tracking-[0.1em] uppercase text-muted mb-0.5">{label}</p>
      <p className="text-sm text-ink font-medium">{children}</p>
    </div>
  );
}

export default function AdminVolunteers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token;
  }

  async function load() {
    setLoading(true);
    setError(null);
    const token = await getToken();
    if (!token) {
      setError("You must be logged in to view this page.");
      setLoading(false);
      return;
    }
    const res = await fetch("/api/admin/volunteers", { headers: { Authorization: `Bearer ${token}` } });
    const result = await res.json();
    if (result.error) setError(result.error);
    else setRows(result.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function patch(id, changes) {
    setBusyId(id);
    const token = await getToken();
    const res = await fetch("/api/admin/volunteers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, ...changes }),
    });
    const result = await res.json();
    setBusyId(null);
    if (result.error) alert("Error: " + result.error);
    else setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)));
  }

  async function remove(row) {
    if (!confirm(`Delete the sign-up from ${row.first_name} ${row.last_name}? This can't be undone.`)) return;
    setBusyId(row.id);
    const token = await getToken();
    const res = await fetch("/api/admin/volunteers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: row.id }),
    });
    const result = await res.json();
    setBusyId(null);
    if (result.error) alert("Error: " + result.error);
    else setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const newCount = rows.filter((r) => r.status === "new").length;

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
          <div className="flex items-end justify-between flex-wrap gap-3">
            <h1 className="font-display text-3xl md:text-4xl text-ink leading-tight">Volunteers</h1>
            {!loading && !error && rows.length > 0 && (
              <span className="font-label text-[10px] tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border border-border text-ink bg-background">
                {newCount} New · {rows.length} Total
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            {["all", ...STATUSES].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`font-label text-[10px] tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border transition ${
                  filter === s
                    ? "bg-ink text-white border-ink"
                    : "bg-background text-muted border-border hover:text-ink"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        {loading && <p className="text-muted text-sm">Loading...</p>}
        {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
        {!loading && !error && visible.length === 0 && (
          <p className="text-muted text-sm">No volunteer sign-ups here yet.</p>
        )}

        {visible.map((row) => (
          <div key={row.id} className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div>
                <h2 className="font-display text-xl text-ink">
                  {row.first_name} {row.last_name}
                </h2>
                <a
                  href={`mailto:${row.email}`}
                  className="text-sm text-primary underline underline-offset-2 hover:text-primary-dark"
                >
                  {row.email}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${statusDots[row.status] || "bg-muted"}`} />
                <select
                  value={row.status}
                  disabled={busyId === row.id}
                  onChange={(e) => patch(row.id, { status: e.target.value })}
                  className="font-label text-[11px] tracking-[0.05em] uppercase border border-border rounded-lg px-3 py-1.5 bg-background text-ink"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <Detail label="Stage">{row.stage}</Detail>
              <Detail label="School">{row.school || "-"}</Detail>
              <Detail label="Time">{row.hours || "-"}</Detail>
              <Detail label="Signed up">{new Date(row.created_at).toLocaleDateString()}</Detail>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {(row.roles || []).map((r) => (
                <span
                  key={r}
                  className="font-label text-[10px] tracking-[0.05em] uppercase px-2.5 py-1 rounded-full bg-primary/10 text-primary"
                >
                  {ROLE_LABELS[r] || r}
                </span>
              ))}
            </div>

            <div className="mb-3">
              <p className="font-label text-[10px] tracking-[0.1em] uppercase text-muted mb-1">Why they want to help</p>
              <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-line">{row.motivation}</p>
            </div>
            {row.experience && (
              <div className="mb-3">
                <p className="font-label text-[10px] tracking-[0.1em] uppercase text-muted mb-1">Experience</p>
                <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-line">{row.experience}</p>
              </div>
            )}
            {row.additional_comments && (
              <div className="mb-3">
                <p className="font-label text-[10px] tracking-[0.1em] uppercase text-muted mb-1">Additional comments</p>
                <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-line">{row.additional_comments}</p>
              </div>
            )}
            {row.link && (
              <p className="text-sm mb-3">
                <span className="font-label text-[10px] tracking-[0.1em] uppercase text-muted mr-2">Link</span>
                <span className="text-ink/80 break-all">{row.link}</span>
              </p>
            )}

            <div className="mt-4">
              <label className="font-label text-[10px] tracking-[0.1em] uppercase text-muted block mb-1">
                Your notes
              </label>
              <textarea
                rows={2}
                defaultValue={row.admin_notes || ""}
                onBlur={(e) => {
                  if (e.target.value !== (row.admin_notes || "")) patch(row.id, { admin_notes: e.target.value });
                }}
                placeholder="Private notes, saved when you click away."
                className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />
            </div>

            <div className="mt-4 text-right">
              <button
                onClick={() => remove(row)}
                disabled={busyId === row.id}
                className="font-label text-[10px] tracking-[0.1em] uppercase text-red-600 hover:underline disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}