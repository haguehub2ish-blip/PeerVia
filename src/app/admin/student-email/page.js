"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";
import { useFilterOptions } from "@/lib/useFilterOptions";
import { getFieldGroups } from "@/lib/filterDefaults";

const norm = (s) => (s || "").trim().replace(/\s+/g, " ").toLowerCase();
const uniq = (list) => [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b));

const chipClass = (on) =>
  `font-label text-[10px] tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border transition ${
    on ? "bg-ink text-white border-ink" : "bg-background text-muted border-border hover:text-ink"
  }`;

export default function AdminStudentEmail() {
  const { fields: fieldDefs } = useFilterOptions();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Recipient filters (based on what students chose in their settings / at sign-up)
  const [activeFields, setActiveFields] = useState([]);
  const [activeCountries, setActiveCountries] = useState([]);
  const [activeLanguages, setActiveLanguages] = useState([]);
  const [activeSchool, setActiveSchool] = useState("");
  const [ageGroup, setAgeGroup] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [excludedIds, setExcludedIds] = useState([]);
  const [showList, setShowList] = useState(false);

  // The email
  const [subject, setSubject] = useState("");
  const [heading, setHeading] = useState("");
  const [message, setMessage] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token;
  }

  useEffect(() => {
    async function load() {
      const token = await getToken();
      if (!token) {
        setLoadError("You must be logged in to view this page.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/admin/student-email", { headers: { Authorization: `Bearer ${token}` } });
        const raw = await res.text();
        let json;
        try {
          json = JSON.parse(raw);
        } catch {
          json = { error: `Server error ${res.status}: ${raw.slice(0, 200)}` };
        }
        if (json.error) setLoadError(json.error);
        else setStudents(json.data || []);
      } catch (err) {
        setLoadError(`Request failed: ${err?.message || err}`);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const words = searchText.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return students.filter((s) => {
      const groups = s.fields.flatMap((f) => getFieldGroups(f, fieldDefs));
      const matchesField = activeFields.length === 0 || groups.some((g) => activeFields.includes(g));
      const matchesCountry = activeCountries.length === 0 || s.countries.some((c) => activeCountries.includes(c));
      const matchesLanguage = activeLanguages.length === 0 || s.languages.some((l) => activeLanguages.includes(l));
      const matchesSchool = !activeSchool || s.schools.some((x) => norm(x) === norm(activeSchool));
      const matchesAge = ageGroup === "all" || (ageGroup === "minor" ? s.is_minor : !s.is_minor);
      const haystack = `${s.name} ${s.email}`.toLowerCase();
      const matchesSearch = words.every((w) => haystack.includes(w));
      return matchesField && matchesCountry && matchesLanguage && matchesSchool && matchesAge && matchesSearch;
    });
  }, [students, fieldDefs, activeFields, activeCountries, activeLanguages, activeSchool, ageGroup, searchText]);

  const recipients = filtered.filter((s) => !excludedIds.includes(s.id));

  const hasOther = students.some((s) => s.fields.flatMap((f) => getFieldGroups(f, fieldDefs)).includes("Other"));
  const fieldOptions = [...fieldDefs.map((f) => f.label), ...(hasOther ? ["Other"] : [])];
  const countryOptions = uniq(students.flatMap((s) => s.countries));
  const languageOptions = uniq(students.flatMap((s) => s.languages));
  const schoolOptions = uniq(students.flatMap((s) => s.schools));

  const toggle = (setter) => (value) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  const toggleField = toggle(setActiveFields);
  const toggleCountry = toggle(setActiveCountries);
  const toggleLanguage = toggle(setActiveLanguages);
  const toggleExcluded = toggle(setExcludedIds);

  const anyFilter =
    activeFields.length || activeCountries.length || activeLanguages.length || activeSchool || ageGroup !== "all" || searchText;

  function clearFilters() {
    setActiveFields([]);
    setActiveCountries([]);
    setActiveLanguages([]);
    setActiveSchool("");
    setAgeGroup("all");
    setSearchText("");
    setExcludedIds([]);
  }

  async function send(testOnly) {
    setResult(null);
    if (!subject.trim()) return setResult({ type: "error", text: "Please write a subject." });
    if (!message.trim()) return setResult({ type: "error", text: "Please write a message." });
    if (!testOnly) {
      if (recipients.length === 0) return setResult({ type: "error", text: "No students selected." });
      if (!confirm(`Send this email to ${recipients.length} student${recipients.length === 1 ? "" : "s"}? This can't be undone.`)) return;
    }

    setSending(true);
    const token = await getToken();
    try {
      const res = await fetch("/api/admin/student-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          studentIds: recipients.map((s) => s.id),
          subject,
          heading,
          message,
          ctaLabel,
          ctaUrl,
          testOnly,
        }),
      });
      const raw = await res.text();
      let json;
      try {
        json = JSON.parse(raw);
      } catch {
        json = { error: `Server error ${res.status}: ${raw.slice(0, 200)}` };
      }
      if (json.error) setResult({ type: "error", text: json.error });
      else if (json.test) setResult({ type: "ok", text: `Test email sent to ${json.to}.` });
      else if (json.failed > 0)
        setResult({ type: "error", text: `Sent to ${json.sent}, but ${json.failed} failed. Check the Vercel logs.` });
      else
        setResult({
          type: "ok",
          text: `Sent to ${json.sent} student${json.sent === 1 ? "" : "s"}.${json.skipped ? ` (${json.skipped} skipped.)` : ""}`,
        });
    } catch (err) {
      setResult({ type: "error", text: `Request failed: ${err?.message || err}` });
    }
    setSending(false);
  }

  const inputClass =
    "w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-background focus:outline-none focus:ring-2 focus:ring-primary";
  const labelClass = "font-label text-[10px] tracking-[0.1em] uppercase text-muted block mb-1";
  const listShown = filtered.slice(0, 300);

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
          <h1 className="font-display text-3xl md:text-4xl text-ink leading-tight">Email Students</h1>
          <p className="text-muted text-sm mt-2">
            Send an announcement in the PeerVia email format to every student account (everyone who isn&apos;t a mentor), or
            only a group.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {loading && <p className="text-muted text-sm">Loading...</p>}
        {loadError && <p className="text-red-600 text-sm font-medium">{loadError}</p>}

        {!loading && !loadError && (
          <>
            {/* 1. Recipients */}
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="font-display text-xl text-ink">1. Who gets it?</h2>
                <span className="font-label text-[10px] tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border border-border text-ink bg-background">
                  {recipients.length} of {students.length} students
                </span>
              </div>

              <p className="text-xs text-muted leading-relaxed">
                Field, country, university and language use what each student picked in their settings or at sign-up.
                Students who never picked anything only receive the email when those filters are off. Unverified accounts
                and under-18s without parent approval are never included, nor are students who turned off announcements.
              </p>

              {fieldOptions.length > 0 && (
                <div>
                  <span className={labelClass}>Field</span>
                  <div className="flex flex-wrap gap-2">
                    {fieldOptions.map((f) => (
                      <button key={f} onClick={() => toggleField(f)} className={chipClass(activeFields.includes(f))}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {countryOptions.length > 0 && (
                <div>
                  <span className={labelClass}>Country</span>
                  <div className="flex flex-wrap gap-2">
                    {countryOptions.map((c) => (
                      <button key={c} onClick={() => toggleCountry(c)} className={chipClass(activeCountries.includes(c))}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {languageOptions.length > 0 && (
                <div>
                  <span className={labelClass}>Language</span>
                  <div className="flex flex-wrap gap-2">
                    {languageOptions.map((l) => (
                      <button key={l} onClick={() => toggleLanguage(l)} className={chipClass(activeLanguages.includes(l))}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>University</label>
                  <select value={activeSchool} onChange={(e) => setActiveSchool(e.target.value)} className={inputClass}>
                    <option value="">All universities</option>
                    {schoolOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Age group</label>
                  <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className={inputClass}>
                    <option value="all">Everyone</option>
                    <option value="adult">18 and over</option>
                    <option value="minor">Under 18 (parent approved)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Search</label>
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Name or email..."
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <button
                  onClick={() => setShowList((v) => !v)}
                  className="font-label text-[10px] tracking-[0.1em] uppercase text-primary hover:underline underline-offset-4"
                >
                  {showList ? "Hide recipient list" : "Show / untick individual students"}
                </button>
                {(anyFilter || excludedIds.length > 0) && (
                  <button
                    onClick={clearFilters}
                    className="font-label text-[10px] tracking-[0.1em] uppercase text-muted hover:text-ink"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {showList && (
                <div className="border border-border rounded-lg divide-y divide-border max-h-80 overflow-y-auto bg-background">
                  {filtered.length === 0 && <p className="p-4 text-sm text-muted">No students match these filters.</p>}
                  {listShown.map((s) => (
                    <label key={s.id} className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-surface">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={!excludedIds.includes(s.id)}
                        onChange={() => toggleExcluded(s.id)}
                      />
                      <span className="text-sm text-ink">
                        <span className="font-medium">{s.name || "Unnamed"}</span>
                        <span className="block text-xs text-muted">{s.email}</span>
                      </span>
                    </label>
                  ))}
                  {filtered.length > listShown.length && (
                    <p className="p-4 text-xs text-muted">
                      Showing the first {listShown.length} of {filtered.length}. Everyone not unticked still receives the
                      email.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 2. The email */}
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
              <h2 className="font-display text-xl text-ink">2. Write the email</h2>

              <div>
                <label className={labelClass}>Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={150}
                  placeholder="What shows in the inbox"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Big headline (optional, defaults to the subject)</label>
                <input
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  maxLength={120}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Message</label>
                <textarea
                  rows={9}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={"Each student gets \"Hi [first name],\" automatically.\nLeave an empty line to start a new paragraph."}
                  className={`${inputClass} resize-y`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Button text (optional)</label>
                  <input
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                    maxLength={60}
                    placeholder="Browse mentors →"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Button link (optional)</label>
                  <input
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="/mentors or https://..."
                    className={inputClass}
                  />
                </div>
              </div>

              {result && (
                <p className={`text-sm font-medium ${result.type === "ok" ? "text-green-700" : "text-red-600"}`}>
                  {result.text}
                </p>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => send(true)}
                  disabled={sending}
                  className="font-label text-[11px] tracking-[0.1em] uppercase px-5 py-2.5 rounded-full border border-border text-ink bg-background hover:border-primary transition disabled:opacity-50"
                >
                  Send me a test
                </button>
                <button
                  onClick={() => send(false)}
                  disabled={sending || recipients.length === 0}
                  className="font-label text-[11px] tracking-[0.1em] uppercase px-5 py-2.5 rounded-full bg-primary text-white hover:bg-primary-dark transition disabled:opacity-50"
                >
                  {sending ? "Sending..." : `Send to ${recipients.length} student${recipients.length === 1 ? "" : "s"}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}