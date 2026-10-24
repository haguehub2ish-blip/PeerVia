"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";
import { useFilterOptions } from "@/lib/useFilterOptions";
import { getFieldGroups } from "@/lib/filterDefaults";

const norm = (s) => (s || "").trim().replace(/\s+/g, " ").toLowerCase();
const uniq = (list) => [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b));
const languagesOf = (m) =>
  typeof m.languages === "string"
    ? m.languages.split(",").map((l) => l.trim()).filter(Boolean)
    : m.languages || [];

const chipClass = (on) =>
  `font-label text-[10px] tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border transition ${
    on ? "bg-ink text-white border-ink" : "bg-background text-muted border-border hover:text-ink"
  }`;

export default function AdminMentorEmail() {
  const { fields: fieldDefs, countries: countryDefs } = useFilterOptions();

  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Recipient filters (same ones as the Mentors page)
  const [activeFields, setActiveFields] = useState([]);
  const [activeCountries, setActiveCountries] = useState([]);
  const [activeLanguages, setActiveLanguages] = useState([]);
  const [activeSchool, setActiveSchool] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
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
      const res = await fetch("/api/admin/mentors", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.error) setLoadError(json.error);
      else setMentors(json.data || []);
      setLoading(false);
    }
    load();
  }, []);

  // Only mentors who can actually receive an email: activated, have a login, not the hidden test mentor
  const emailable = useMemo(
    () => mentors.filter((m) => m.activated && m.user_id && !m.admin_only),
    [mentors]
  );

  const filtered = useMemo(() => {
    const words = searchText.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return emailable.filter((m) => {
      const matchesField =
        activeFields.length === 0 ||
        getFieldGroups(m.subject, fieldDefs).some((g) => activeFields.includes(g));
      const matchesCountry = activeCountries.length === 0 || activeCountries.includes(m.country);
      const mentorLangs = languagesOf(m);
      const matchesLanguage =
        activeLanguages.length === 0 || activeLanguages.some((l) => mentorLangs.includes(l));
      const matchesSchool = !activeSchool || norm(m.school) === norm(activeSchool);
      const matchesAvailable = !availableOnly || m.available;
      const haystack = [m.name, m.school, m.subject, m.country].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = words.every((w) => haystack.includes(w));
      return (
        matchesField && matchesCountry && matchesLanguage && matchesSchool && matchesAvailable && matchesSearch
      );
    });
  }, [emailable, fieldDefs, activeFields, activeCountries, activeLanguages, activeSchool, availableOnly, searchText]);

  const recipients = filtered.filter((m) => !excludedIds.includes(m.id));

  const hasOther = emailable.some((m) => getFieldGroups(m.subject, fieldDefs).includes("Other"));
  const fieldOptions = [...fieldDefs.map((f) => f.label), ...(hasOther ? ["Other"] : [])];
  const listedCountries = countryDefs.map((c) => c.value);
  const countryOptions = [
    ...listedCountries,
    ...uniq(emailable.map((m) => m.country)).filter((c) => !listedCountries.includes(c)),
  ];
  const languageOptions = uniq(emailable.flatMap(languagesOf));
  const schoolOptions = uniq(emailable.map((m) => m.school));

  const toggle = (setter) => (value) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  const toggleField = toggle(setActiveFields);
  const toggleCountry = toggle(setActiveCountries);
  const toggleLanguage = toggle(setActiveLanguages);
  const toggleExcluded = toggle(setExcludedIds);

  const anyFilter =
    activeFields.length || activeCountries.length || activeLanguages.length || activeSchool || availableOnly || searchText;

  function clearFilters() {
    setActiveFields([]);
    setActiveCountries([]);
    setActiveLanguages([]);
    setActiveSchool("");
    setAvailableOnly(false);
    setSearchText("");
    setExcludedIds([]);
  }

  async function send(testOnly) {
    setResult(null);
    if (!subject.trim()) return setResult({ type: "error", text: "Please write a subject." });
    if (!message.trim()) return setResult({ type: "error", text: "Please write a message." });
    if (!testOnly) {
      if (recipients.length === 0) return setResult({ type: "error", text: "No mentors selected." });
      if (!confirm(`Send this email to ${recipients.length} mentor${recipients.length === 1 ? "" : "s"}? This can't be undone.`)) return;
    }

    setSending(true);
    const token = await getToken();
    try {
      const res = await fetch("/api/admin/mentor-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          mentorIds: recipients.map((m) => m.id),
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
          text: `Sent to ${json.sent} mentor${json.sent === 1 ? "" : "s"}.${json.skipped ? ` (${json.skipped} skipped: no email or turned off announcements.)` : ""}`,
        });
    } catch (err) {
      setResult({ type: "error", text: `Request failed: ${err?.message || err}` });
    }
    setSending(false);
  }

  const inputClass =
    "w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-background focus:outline-none focus:ring-2 focus:ring-primary";
  const labelClass = "font-label text-[10px] tracking-[0.1em] uppercase text-muted block mb-1";

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
          <h1 className="font-display text-3xl md:text-4xl text-ink leading-tight">Email Mentors</h1>
          <p className="text-muted text-sm mt-2">
            Send an announcement in the PeerVia email format to all mentors, or only to a group.
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
                  {recipients.length} of {emailable.length} mentors
                </span>
              </div>

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className={labelClass}>Search</label>
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Name, university, subject..."
                    className={inputClass}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} />
                Only mentors who are currently available
              </label>

              <div className="flex items-center gap-4 flex-wrap">
                <button
                  onClick={() => setShowList((v) => !v)}
                  className="font-label text-[10px] tracking-[0.1em] uppercase text-primary hover:underline underline-offset-4"
                >
                  {showList ? "Hide recipient list" : "Show / untick individual mentors"}
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
                  {filtered.length === 0 && <p className="p-4 text-sm text-muted">No mentors match these filters.</p>}
                  {filtered.map((m) => (
                    <label key={m.id} className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-surface">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={!excludedIds.includes(m.id)}
                        onChange={() => toggleExcluded(m.id)}
                      />
                      <span className="text-sm text-ink">
                        <span className="font-medium">{m.name}</span>
                        <span className="block text-xs text-muted">
                          {[m.school, m.subject, m.country].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </label>
                  ))}
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
                  placeholder={"Each mentor gets \"Hi [first name],\" automatically.\nLeave an empty line to start a new paragraph."}
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
                    placeholder="Open your dashboard →"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Button link (optional)</label>
                  <input
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="/mentor-account/dashboard or https://..."
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
                  {sending ? "Sending..." : `Send to ${recipients.length} mentor${recipients.length === 1 ? "" : "s"}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}