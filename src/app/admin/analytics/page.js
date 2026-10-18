"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";

function dayLabel(day) {
  return new Date(day + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
  });
}

function StatCard({ label, value }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <p className="font-label text-[10px] tracking-[0.1em] uppercase text-muted mb-2">{label}</p>
      <p className="font-display text-3xl text-ink">{value ?? 0}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-4">{title}</h2>
      {children}
    </section>
  );
}

function DayBars({ title, data }) {
  const entries = Object.entries(data || {});
  const max = Math.max(1, ...entries.map(([, n]) => n));
  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <h3 className="font-display text-xl text-ink mb-5">{title}</h3>
      <div className="flex items-end gap-3 h-40">
        {entries.map(([day, n]) => (
          <div key={day} className="flex-1 flex flex-col items-center justify-end">
            <span className="text-xs font-semibold text-ink mb-1">{n}</span>
            <div
              className="w-full bg-primary rounded-t"
              style={{ height: n > 0 ? Math.max(6, Math.round((n / max) * 112)) : 2 }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-2">
        {entries.map(([day]) => (
          <span
            key={day}
            className="flex-1 text-center font-label text-[10px] tracking-[0.05em] uppercase text-muted"
          >
            {dayLabel(day)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadStats() {
    setLoading(true);
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      setError("You must be logged in to view this page.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/admin/analytics", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();

    if (result.error) {
      setError(result.error);
    } else {
      setStats(result);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadStats();
  }, []);

  const topMax = Math.max(1, ...(stats?.topPages || []).map((p) => p.count));

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
          <p className="font-label text-[10px] tracking-[0.15em] uppercase text-primary mt-4 mb-2">
            Admin
          </p>
          <div className="flex items-end justify-between flex-wrap gap-3">
            <h1 className="font-display text-3xl md:text-4xl text-ink leading-tight">Analytics</h1>
            <button
              type="button"
              onClick={loadStats}
              className="font-label text-[10px] tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border border-border text-ink hover:border-primary hover:text-primary transition"
            >
              Refresh
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {loading ? (
          <p className="text-muted text-sm">Loading...</p>
        ) : error ? (
          <p className="text-red-600 font-semibold">Error: {error}</p>
        ) : (
          <>
            <Section title="People">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard label="Total users" value={stats.totalUsers} />
                <StatCard label="Mentor accounts" value={stats.totalMentorUsers} />
                <StatCard label="Live mentor profiles" value={stats.mentorCount} />
              </div>
            </Section>

            <Section title="Mentor applications">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total" value={stats.applicationStats?.total} />
                <StatCard label="Pending" value={stats.applicationStats?.pending} />
                <StatCard label="Approved" value={stats.applicationStats?.approved} />
                <StatCard label="Rejected" value={stats.applicationStats?.rejected} />
              </div>
            </Section>

            <Section title="Community">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Questions" value={stats.questionCount} />
                <StatCard label="Answers" value={stats.answerCount} />
                <StatCard label="Likes" value={stats.likeCount} />
                <StatCard label="Comments" value={stats.commentCount} />
              </div>
            </Section>

            <Section title="Traffic">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <StatCard label="Page views" value={stats.totalPageViews} />
                <StatCard label="Unique visitors" value={stats.uniqueVisitorCount} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DayBars title="Page views, last 7 days" data={stats.viewsByDay} />
                <DayBars title="Signups, last 7 days" data={stats.signupsByDay} />
              </div>
            </Section>

            <Section title="Top pages">
              <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
                {(stats.topPages || []).length === 0 ? (
                  <p className="text-muted text-sm">No page views yet.</p>
                ) : (
                  stats.topPages.map((p) => (
                    <div key={p.path}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-ink font-medium truncate pr-4">{p.path}</span>
                        <span className="text-muted shrink-0">{p.count}</span>
                      </div>
                      <div className="h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(p.count / topMax) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}