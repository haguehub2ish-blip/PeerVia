"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";

// ---------- Formatting ----------

const fmt = (n) =>
  n === null || n === undefined || Number.isNaN(n) ? "—" : Number(n).toLocaleString("en-GB");
const fmtPct = (n) => (n === null || n === undefined ? "—" : `${n}%`);

function fmtHours(h) {
  if (h === null || h === undefined) return "—";
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} days`;
}

function shortDay(day) {
  return new Date(day + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function longDay(day) {
  return new Date(day + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// ---------- Building blocks ----------

function Delta({ current, previous, days }) {
  if (previous === undefined || previous === null || current === undefined || current === null) return null;
  if (previous === 0 && current === 0) {
    return <span className="text-muted">no change vs previous {days} days</span>;
  }
  if (previous === 0) {
    return <span className="text-green-700">new vs previous {days} days</span>;
  }
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return <span className="text-muted">same as previous {days} days</span>;
  return (
    <span className={change > 0 ? "text-green-700" : "text-red-600"}>
      {change > 0 ? "▲" : "▼"} {Math.abs(change)}% vs previous {days} days
    </span>
  );
}

function StatCard({ label, value, sub, delta, days }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <p className="font-label text-[10px] tracking-[0.1em] uppercase text-muted mb-2">{label}</p>
      <p className="font-display text-3xl text-ink">{value}</p>
      {delta && (
        <p className="text-[11px] mt-1.5">
          <Delta current={delta.current} previous={delta.previous} days={days} />
        </p>
      )}
      {sub && <p className="text-[11px] text-muted mt-1.5">{sub}</p>}
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <section className="mb-12">
      <div className="mb-4">
        <h2 className="font-label text-[11px] tracking-[0.15em] uppercase text-primary">{title}</h2>
        {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5 md:p-6">
      <h3 className="font-display text-lg text-ink">{title}</h3>
      {subtitle ? <p className="text-xs text-muted mt-0.5 mb-4">{subtitle}</p> : <div className="mb-4" />}
      {children}
    </div>
  );
}

function BarChart({ title, subtitle, data, height = 130 }) {
  // data: [{ key, label, short, value, tip? }]
  const max = Math.max(1, ...data.map((d) => d.value));
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));
  const showValues = data.length <= 10;
  const barArea = height - (showValues ? 18 : 0);

  return (
    <Panel title={title} subtitle={subtitle}>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {data.map((d) => (
          <div
            key={d.key}
            className="flex-1 min-w-0 flex flex-col items-center justify-end group"
            title={`${d.label}: ${fmt(d.value)}${d.tip ? ` (${d.tip})` : ""}`}
          >
            {showValues && <span className="text-[11px] font-semibold text-ink mb-0.5">{d.value}</span>}
            <div
              className="w-full rounded-t-sm bg-primary/80 group-hover:bg-primary transition-colors"
              style={{
                height: d.value > 0 ? Math.max(4, Math.round((d.value / max) * barArea)) : 2,
                opacity: d.value > 0 ? 1 : 0.25,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-[3px] mt-2">
        {data.map((d, i) => (
          <div key={d.key} className="flex-1 min-w-0 relative h-3">
            {i % labelEvery === 0 && (
              <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-label text-[9px] tracking-[0.03em] uppercase text-muted">
                {d.short}
              </span>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function RankList({ items, empty = "No data yet.", valueLabel }) {
  if (!items || items.length === 0) return <p className="text-muted text-sm">{empty}</p>;
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="space-y-3.5">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between text-sm mb-1 gap-4">
            <span className="text-ink font-medium truncate">{item.label}</span>
            <span className="text-muted shrink-0">
              {fmt(item.count)}
              {item.sub ? <span className="text-[11px]"> · {item.sub}</span> : valueLabel ? ` ${valueLabel}` : ""}
            </span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RangeButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-label text-[10px] tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border transition ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-ink hover:border-primary hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

const grid = (cols) =>
  ({
    2: "grid grid-cols-2 gap-4",
    3: "grid grid-cols-2 md:grid-cols-3 gap-4",
    4: "grid grid-cols-2 md:grid-cols-4 gap-4",
  })[cols];

// ---------- Page ----------

export default function AdminAnalytics() {
  const [stats, setStats] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const loadStats = useCallback(async (range) => {
    const myRequest = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        if (myRequest === requestId.current) {
          setError("You must be logged in to view this page.");
          setLoading(false);
        }
        return;
      }

      const res = await fetch(`/api/admin/analytics?days=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const result = await res.json();

      // Ignore stale responses if the range was changed while loading
      if (myRequest !== requestId.current) return;

      if (!res.ok || result.error) {
        setError(result.error || "Something went wrong loading analytics.");
      } else {
        setStats(result);
      }
    } catch (e) {
      if (myRequest === requestId.current) setError(e.message || "Network error.");
    }
    if (myRequest === requestId.current) setLoading(false);
  }, []);

  useEffect(() => {
    loadStats(days);
  }, [days, loadStats]);

  const t = stats?.traffic;
  const u = stats?.users;
  const s = stats?.students;
  const m = stats?.mentors;
  const a = stats?.applications;
  const c = stats?.community;
  const r = stats?.reviews;
  const content = stats?.content;
  const calls = stats?.calls;
  const period = stats?.days || days;

  const series = (field, tipFn) =>
    (stats?.daily || []).map((d) => ({
      key: d.day,
      label: longDay(d.day),
      short: shortDay(d.day),
      value: d[field],
      tip: tipFn ? tipFn(d) : undefined,
    }));

  const hourData = (t?.byHour || []).map((n, h) => ({
    key: `h${h}`,
    label: `${String(h).padStart(2, "0")}:00`,
    short: h % 3 === 0 ? `${String(h).padStart(2, "0")}h` : "",
    value: n,
  }));
  const weekdayData = (t?.byWeekday || []).map((d) => ({
    key: d.label,
    label: d.label,
    short: d.label,
    value: d.count,
  }));
  const communityDaily = (stats?.daily || []).map((d) => ({
    key: d.day,
    label: longDay(d.day),
    short: shortDay(d.day),
    value: d.questions + d.answers + d.comments,
    tip: `${d.questions} questions, ${d.answers} answers, ${d.comments} comments`,
  }));

  const rangeLabel = `last ${period} days`;

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
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-display text-3xl md:text-4xl text-ink leading-tight">Analytics</h1>
              {stats && (
                <p className="text-xs text-muted mt-2">
                  Updated{" "}
                  {new Date(stats.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}{" "}
                  · Days are counted in Amsterdam time · Admin pages are excluded from traffic
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {[7, 30, 90].map((n) => (
                <RangeButton key={n} active={days === n} onClick={() => setDays(n)}>
                  {n} days
                </RangeButton>
              ))}
              <button
                type="button"
                onClick={() => loadStats(days)}
                className="font-label text-[10px] tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border border-border text-ink hover:border-primary hover:text-primary transition"
              >
                {loading ? "Loading…" : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {error ? (
          <p className="text-red-600 font-semibold">Error: {error}</p>
        ) : !stats ? (
          <p className="text-muted text-sm">Loading...</p>
        ) : (
          <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
            {stats.warnings?.length > 0 && (
              <div className="mb-8 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3 text-sm">
                <p className="font-semibold mb-1">Some data couldn&apos;t be loaded</p>
                <ul className="list-disc pl-5 space-y-0.5 text-xs">
                  {stats.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ---------------- At a glance ---------------- */}
            <Section title="At a glance" hint={`Compared with the previous ${period} days.`}>
              <div className={grid(4)}>
                <StatCard
                  label="Unique visitors"
                  value={fmt(t.visitorsPeriod)}
                  delta={{ current: t.visitorsPeriod, previous: t.visitorsPrev }}
                  days={period}
                />
                <StatCard
                  label="Page views"
                  value={fmt(t.viewsPeriod)}
                  delta={{ current: t.viewsPeriod, previous: t.viewsPrev }}
                  days={period}
                />
                <StatCard
                  label="New sign-ups"
                  value={fmt(u.newInPeriod)}
                  delta={{ current: u.newInPeriod, previous: u.newPrev }}
                  days={period}
                />
                <StatCard
                  label="Mentor applications"
                  value={fmt(a.newInPeriod)}
                  delta={{ current: a.newInPeriod, previous: a.newPrev }}
                  days={period}
                />
                <StatCard label="Total users" value={fmt(u.total)} />
                <StatCard label="Live mentors" value={fmt(m.total)} sub={`${fmt(m.available)} open for booking`} />
                <StatCard
                  label="Pending applications"
                  value={fmt(a.pending)}
                  sub={a.oldestPendingDays !== null ? `Oldest waiting ${a.oldestPendingDays} days` : "Nothing waiting"}
                />
                <StatCard
                  label="Average rating"
                  value={r.avg === null ? "—" : `${r.avg}★`}
                  sub={`${fmt(r.total)} reviews`}
                />
              </div>
            </Section>

            {/* ---------------- Traffic ---------------- */}
            <Section title="Traffic" hint={`Page views and visitors for the ${rangeLabel}.`}>
              {!t.richTracking && (
                <div className="mb-4 rounded-lg border border-border bg-surface px-4 py-3 text-xs text-muted">
                  Traffic sources, devices and countries start filling in once the new tracker is live (see the setup
                  steps). Sessions below are estimated from page views until then.
                </div>
              )}
              <div className={`${grid(4)} mb-4`}>
                <StatCard label="Visitors today" value={fmt(t.visitorsToday)} sub={`${fmt(t.viewsToday)} page views`} />
                <StatCard
                  label="Sessions"
                  value={fmt(t.sessionsPeriod)}
                  sub="A visit ends after 30 minutes of inactivity"
                />
                <StatCard
                  label="Bounce rate"
                  value={fmtPct(t.bounceRate)}
                  sub="Sessions that viewed only one page"
                />
                <StatCard label="Pages per session" value={t.pagesPerSession ?? "—"} />
              </div>
              <div className={`${grid(4)} mb-4`}>
                <StatCard label="Pages per visitor" value={t.pagesPerVisitor ?? "—"} />
                <StatCard
                  label="Returning visitors"
                  value={fmt(t.returningVisitors)}
                  sub={`${fmtPct(t.returningPct)} came on 2+ different days`}
                />
                <StatCard
                  label="Logged-in visitors"
                  value={fmt(t.loggedInVisitors)}
                  sub={`${fmtPct(t.loggedInVisitorsPct)} of visitors · counted once across devices`}
                />
                <StatCard label="All-time page views" value={fmt(t.allTimeViews)} sub="Admin pages excluded" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <BarChart
                  title="Page views per day"
                  subtitle={`${fmt(t.viewsPeriod)} views from ${fmt(t.visitorsPeriod)} visitors`}
                  data={series("views", (d) => `${d.visitors} visitors`)}
                />
                <BarChart
                  title="Unique visitors per day"
                  subtitle="People who opened at least one page that day"
                  data={series("visitors")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <BarChart title="Busiest hours" subtitle="Page views by hour of day (Amsterdam time)" data={hourData} />
                <BarChart title="Busiest weekdays" subtitle={`Page views by weekday, ${rangeLabel}`} data={weekdayData} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Panel title="Top pages" subtitle="Mentor profiles and course guides are grouped together">
                  <RankList
                    items={(t.topPages || []).map((p) => ({
                      label: p.path,
                      count: p.count,
                      sub: `${fmt(p.visitors)} visitors`,
                    }))}
                    empty="No page views yet."
                  />
                </Panel>
                <Panel title="Where visitors go" subtitle="Share of visitors who reached each area">
                  <RankList
                    items={(t.reach || []).map((x) => ({
                      label: x.label,
                      count: x.visitors,
                      sub: `${x.pct}%`,
                    }))}
                  />
                </Panel>
                <Panel title="Most viewed mentors" subtitle={`Profile views, ${rangeLabel}`}>
                  <RankList items={t.topMentorProfiles} empty="No mentor profile views yet." valueLabel="views" />
                </Panel>
                <Panel title="Most viewed course guides" subtitle={`Guide views, ${rangeLabel}`}>
                  <RankList items={t.topGuides} empty="No course guide views yet." valueLabel="views" />
                </Panel>
                <Panel title="Where visitors come from" subtitle="Traffic source of each session">
                  <RankList items={t.sources} empty="No source data yet." valueLabel="sessions" />
                </Panel>
                <Panel title="Entry pages" subtitle="The first page of each session">
                  <RankList items={t.entryPages} empty="No sessions yet." valueLabel="sessions" />
                </Panel>
                <Panel title="Devices" subtitle="Sessions by device type">
                  <RankList items={t.devices} empty="No device data yet." valueLabel="sessions" />
                </Panel>
                <Panel title="Countries" subtitle="Sessions by country">
                  <RankList items={t.countries} empty="No country data yet." valueLabel="sessions" />
                </Panel>
                <Panel title="Browsers" subtitle="Sessions by browser">
                  <RankList items={t.browsers} empty="No browser data yet." valueLabel="sessions" />
                </Panel>
                <Panel title="Operating systems" subtitle="Sessions by system">
                  <RankList items={t.systems} empty="No system data yet." valueLabel="sessions" />
                </Panel>
              </div>
            </Section>

            {/* ---------------- Users ---------------- */}
            <Section title="Users & sign-ups">
              <div className={`${grid(4)} mb-4`}>
                <StatCard label="Total users" value={fmt(u.total)} />
                <StatCard label="Students" value={fmt(u.students)} />
                <StatCard label="Mentor accounts" value={fmt(u.mentorAccounts)} />
                <StatCard
                  label="Email confirmed"
                  value={fmt(u.confirmed)}
                  sub={u.total ? `${Math.round((u.confirmed / u.total) * 100)}% of users` : undefined}
                />
                <StatCard label="Active last 7 days" value={fmt(u.active7d)} sub="Signed in at least once" />
                <StatCard label="Active last 30 days" value={fmt(u.active30d)} sub="Signed in at least once" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BarChart
                  title="Sign-ups per day"
                  subtitle={`${fmt(u.newInPeriod)} new users in the ${rangeLabel}`}
                  data={series("signups")}
                />
                <Panel title="How people sign in" subtitle="Sign-in method across all users">
                  <RankList items={u.providers} empty="No users yet." />
                </Panel>
              </div>
            </Section>

            {/* ---------------- Students & safety ---------------- */}
            <Section title="Students & parental consent">
              <div className={`${grid(4)} mb-4`}>
                <StatCard label="Student profiles" value={fmt(s.profiles)} />
                <StatCard
                  label="Under 18"
                  value={fmt(s.minors)}
                  sub={s.profiles ? `${Math.round((s.minors / s.profiles) * 100)}% of profiles` : undefined}
                />
                <StatCard label="Parental requests" value={fmt(s.requestsTotal)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Panel title="Consent status" subtitle="Student profiles">
                  <RankList items={s.consent} empty="No student profiles yet." />
                </Panel>
                <Panel title="Request status" subtitle="Parental requests">
                  <RankList items={s.requestsByStatus} empty="No parental requests yet." />
                </Panel>
                <Panel title="Request type" subtitle="Parental requests">
                  <RankList items={s.requestsByKind} empty="No parental requests yet." />
                </Panel>
              </div>
            </Section>

            {/* ---------------- Mentors ---------------- */}
            <Section title="Mentors">
              <div className={`${grid(4)} mb-4`}>
                <StatCard label="Live profiles" value={fmt(m.total)} sub={`${fmt(m.verified)} verified`} />
                <StatCard label="Open for booking" value={fmt(m.available)} />
                <StatCard label="Reviews" value={fmt(r.total)} sub={`${fmt(m.withoutReviews)} mentors have none yet`} />
                <StatCard label="Average rating" value={r.avg === null ? "—" : `${r.avg}★`} />
                <StatCard
                  label="Answers given"
                  value={fmt(c.answers)}
                  sub="Counted from the answers table"
                />
                <StatCard
                  label="Calls requested"
                  value={fmt(calls.total)}
                  sub="All time, from the call requests table"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Panel title="Mentors by field" subtitle="A mentor can count in more than one field">
                  <RankList items={m.byField} empty="No mentors yet." />
                </Panel>
                <Panel title="Mentors by country">
                  <RankList items={m.byCountry} empty="No mentors yet." />
                </Panel>
                <Panel title="Mentors by university" subtitle="Top 8">
                  <RankList items={m.bySchool} empty="No mentors yet." />
                </Panel>
                <Panel title="Languages spoken" subtitle="Top 8">
                  <RankList items={m.languages} empty="No mentors yet." />
                </Panel>
                <Panel title="Top rated mentors" subtitle="Average of their reviews">
                  {m.topRated.length === 0 ? (
                    <p className="text-muted text-sm">No reviews yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {m.topRated.map((x, i) => (
                        <div key={`${x.name}-${i}`} className="flex items-center justify-between gap-4 text-sm">
                          <div className="min-w-0">
                            <p className="text-ink font-medium truncate">{x.name}</p>
                            <p className="text-[11px] text-muted truncate">{x.school}</p>
                          </div>
                          <span className="text-ink shrink-0">
                            {x.avg}★ <span className="text-muted text-[11px]">({x.count})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
                <Panel title="Most active answerers" subtitle="By answers posted">
                  <RankList items={m.topAnswerers} empty="No answers yet." valueLabel="answers" />
                </Panel>
                <Panel title="Rating distribution" subtitle="All reviews">
                  <RankList
                    items={[5, 4, 3, 2, 1].map((star) => ({
                      label: `${star} ${star === 1 ? "star" : "stars"}`,
                      count: r.distribution[star - 1],
                    }))}
                  />
                </Panel>
              </div>
            </Section>

            {/* ---------------- Call requests ---------------- */}
            <Section
              title="Call requests"
              hint="Calls that reached a mentor: sent directly (18+) or after a parent approved."
            >
              <div className={`${grid(4)} mb-4`}>
                <StatCard
                  label="Requests this period"
                  value={fmt(calls.inPeriod)}
                  delta={{ current: calls.inPeriod, previous: calls.prev }}
                  days={period}
                />
                <StatCard label="All time" value={fmt(calls.total)} />
                <StatCard
                  label="Students who asked"
                  value={fmt(calls.uniqueStudents)}
                  sub={`${fmt(calls.repeatStudents)} asked more than once`}
                />
                <StatCard
                  label="Requests per 100 profile views"
                  value={calls.perHundredProfileViews ?? "—"}
                  sub={`Profile views and requests, ${rangeLabel}`}
                />
                <StatCard label="Parent requests (under 18)" value={fmt(calls.parentTotal)} />
                <StatCard label="Waiting for a parent" value={fmt(calls.parentPending)} />
                <StatCard label="Approved by parents" value={fmt(calls.parentApproved)} />
                <StatCard
                  label="Parent approval rate"
                  value={fmtPct(calls.parentApprovalRate)}
                  sub={`${fmt(calls.parentDeclined)} declined`}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BarChart
                  title="Call requests per day"
                  subtitle={`${fmt(calls.inPeriod)} in the ${rangeLabel}`}
                  data={series("callRequests")}
                />
                <Panel title="Most requested mentors" subtitle="All time">
                  <RankList items={calls.topMentors} empty="No call requests recorded yet." valueLabel="requests" />
                </Panel>
              </div>
            </Section>

            {/* ---------------- Applications ---------------- */}
            <Section title="Mentor applications">
              <div className={`${grid(4)} mb-4`}>
                <StatCard label="Total" value={fmt(a.total)} />
                <StatCard
                  label="Pending"
                  value={fmt(a.pending)}
                  sub={a.oldestPendingDays !== null ? `Oldest waiting ${a.oldestPendingDays} days` : undefined}
                />
                <StatCard label="Approved" value={fmt(a.approved)} />
                <StatCard label="Rejected" value={fmt(a.rejected)} />
                <StatCard
                  label="Approval rate"
                  value={fmtPct(a.approvalRate)}
                  sub="Of applications decided so far"
                />
                {a.other > 0 && <StatCard label="Other status" value={fmt(a.other)} />}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BarChart
                  title="Applications per day"
                  subtitle={`${fmt(a.newInPeriod)} in the ${rangeLabel}`}
                  data={series("applications")}
                />
                <Panel title="Top applicant fields">
                  <RankList items={a.topFields} empty="No applications yet." />
                </Panel>
                <Panel title="Top applicant universities">
                  <RankList items={a.topUniversities} empty="No applications yet." />
                </Panel>
                <Panel title="Top applicant countries">
                  <RankList items={a.topCountries} empty="No applications yet." />
                </Panel>
              </div>
            </Section>

            {/* ---------------- Community ---------------- */}
            <Section title="Community">
              <div className={`${grid(4)} mb-4`}>
                <StatCard label="Questions asked" value={fmt(c.questions)} />
                <StatCard
                  label="Answered"
                  value={fmt(c.answered)}
                  sub={c.answerRate !== null ? `${c.answerRate}% answer rate` : undefined}
                />
                <StatCard
                  label="Waiting for an answer"
                  value={fmt(c.unanswered)}
                  sub={c.oldestUnansweredDays !== null ? `Oldest waiting ${c.oldestUnansweredDays} days` : "All caught up"}
                />
                <StatCard
                  label="Median time to first answer"
                  value={fmtHours(c.medianFirstAnswerHours)}
                />
                <StatCard label="Answers" value={fmt(c.answers)} />
                <StatCard label="Comments" value={fmt(c.comments)} sub={`${fmt(c.commenters)} different people`} />
                <StatCard label="Likes" value={fmt(c.likes)} />
                <StatCard label="Question views" value={fmt(c.views)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BarChart
                  title="Community activity per day"
                  subtitle="Questions, answers and comments combined"
                  data={communityDaily}
                />
                <Panel title="Most asked subjects">
                  <RankList items={c.topSubjects} empty="No questions yet." />
                </Panel>
                <Panel title="Most asked countries">
                  <RankList items={c.topCountries} empty="No questions yet." />
                </Panel>
                <BarChart
                  title="Reviews per day"
                  subtitle={`New mentor reviews in the ${rangeLabel}`}
                  data={series("reviews")}
                  height={100}
                />
              </div>
            </Section>

            {/* ---------------- Content ---------------- */}
            <Section title="Content">
              <div className={`${grid(3)} mb-4`}>
                <StatCard label="Course guides" value={fmt(content.guides)} />
                <StatCard label="Calendar events" value={fmt(content.calendarEvents)} sub="Across all mentors" />
                <StatCard label="Upcoming events" value={fmt(content.calendarUpcoming)} sub="From today onwards" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Panel title="Guides by country">
                  <RankList items={content.guidesByCountry} empty="No guides yet." />
                </Panel>
                <Panel title="Guides by subject">
                  <RankList items={content.guidesBySubject} empty="No guides yet." />
                </Panel>
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}