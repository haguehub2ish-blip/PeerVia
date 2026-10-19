"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";
import {
  DEFAULT_FIELDS,
  DEFAULT_COUNTRIES,
  DEFAULT_CAREER_FIELDS,
  DEFAULT_COMMUNITY_FIELDS,
} from "@/lib/filterDefaults";

const inputClass =
  "border border-border rounded-lg bg-background px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30";
const smallButton =
  "font-label text-[10px] uppercase tracking-wide px-3 py-2 rounded-lg border border-border text-ink hover:border-primary hover:text-primary transition disabled:opacity-40";

const fieldDefaults = DEFAULT_FIELDS.map((f) => ({ label: f.label, keywords: f.keywords.join(", ") }));
const countryDefaults = DEFAULT_COUNTRIES.map((c) => ({ ...c }));
const careerFieldDefaults = DEFAULT_CAREER_FIELDS.map((label) => ({ label }));
const communityFieldDefaults = DEFAULT_COMMUNITY_FIELDS.map((f) => ({
  label: f.label,
  keywords: f.keywords.join(", "),
}));

async function api(method, body) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const res = await fetch("/api/admin/filters", {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Something went wrong");
  return json;
}

export default function AdminFilters() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("site_filters")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });
    if (error) {
      setError(
        `Could not load filters: ${error.message}. Has the site_filters table been created in Supabase?`
      );
    } else {
      setRows(data || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link
          href="/admin"
          className="font-label text-xs uppercase tracking-wide text-muted hover:text-primary transition mb-6 inline-block"
        >
          ← Admin dashboard
        </Link>
        <p className="font-label text-[10px] tracking-[0.15em] uppercase text-primary mb-2">Admin</p>
        <h1 className="font-display text-3xl text-ink mb-1">Filters</h1>
        <p className="text-muted text-sm mb-8">
          Control the filter options and dropdown choices used across the site.
        </p>

        {error && <p className="text-sm text-red-600 font-semibold mb-6">{error}</p>}

        {loading ? (
          <p className="text-muted text-sm">Loading…</p>
        ) : (
          <>
            <FilterSection
              kind="field"
              title="Mentor fields"
              help="The Field filter on the Mentors page. A mentor appears under a field when their subject contains one of its keywords (comma separated, e.g. medic, nursing). Start a keyword with = to match the whole word only, e.g. =law. Mentors that match no field show under Other automatically."
              rows={rows.filter((r) => r.kind === "field")}
              defaults={fieldDefaults}
              onChanged={load}
            />
            <FilterSection
              kind="country"
              title="Countries"
              help="The Country filter on the Mentors, Course Guides and Community pages, and the country dropdown on the apply form and the admin mentor form. The code is what gets stored on mentors and guides (for example NL, UK); the name is what people see."
              rows={rows.filter((r) => r.kind === "country")}
              defaults={countryDefaults}
              onChanged={load}
            />
            <FilterSection
              kind="career_field"
              title="Career fields"
              help="The Career Field dropdown on the apply form and the admin mentor form. This is the subject saved on a mentor's profile. Other is always offered as the last choice."
              rows={rows.filter((r) => r.kind === "career_field")}
              defaults={careerFieldDefaults}
              onChanged={load}
            />
                        <FilterSection
              kind="community_field"
              title="Community fields"
              help="The Career Field sidebar on the Community page, and the subject tags people can pick when they ask a question. Keywords are matched against the subject of each built-in question, so with the keyword engineer, a Mechanical Engineering question appears under Engineering. Start a keyword with = to match the whole word only."
              rows={rows.filter((r) => r.kind === "community_field")}
              defaults={communityFieldDefaults}
              onChanged={load}
            />
          </>
        )}
      </div>
    </div>
  );
}

function FilterSection({ kind, title, help, rows, defaults, onChanged }) {
  const isCountry = kind === "country";
    const hasKeywords = kind === "field" || kind === "community_field";
  const blank = isCountry
    ? { value: "", label: "", flag: "" }
    : hasKeywords
      ? { label: "", keywords: "" }
      : { label: "" };
  const [draft, setDraft] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function run(action) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await onChanged();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  const customise = () =>
    run(() =>
      api("POST", { items: defaults.map((d, i) => ({ ...d, kind, sort_order: i * 10 })) })
    );

  const add = (e) => {
    e.preventDefault();
    run(async () => {
      const next = rows.reduce((max, r) => Math.max(max, r.sort_order || 0), 0) + 10;
      await api("POST", { ...draft, kind, sort_order: next });
      setDraft(blank);
    });
  };

  const resetToDefaults = () => {
    if (!window.confirm(`Delete your custom ${title.toLowerCase()} and go back to the built-in list?`)) return;
    run(() => api("DELETE", { kind }));
  };

  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const list = [...rows];
    [list[index], list[target]] = [list[target], list[index]];
    run(() => api("PATCH", { order: list.map((r, i) => ({ id: r.id, sort_order: i * 10 })) }));
  };

  const save = (row, changes) => run(() => api("PATCH", { ...row, ...changes }));

  const remove = (row) => {
    if (!window.confirm(`Delete "${row.label}"?`)) return;
    run(() => api("DELETE", { id: row.id }));
  };

  return (
    <section className="bg-surface border border-border rounded-xl p-5 mb-8 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h2 className="font-display text-xl text-ink">{title}</h2>
        {rows.length > 0 && (
          <button type="button" onClick={resetToDefaults} disabled={busy} className={smallButton}>
            Reset to defaults
          </button>
        )}
      </div>
      <p className="text-sm text-muted mb-4 max-w-2xl leading-relaxed">{help}</p>
      {error && <p className="text-sm text-red-600 font-semibold mb-3">{error}</p>}

      {rows.length === 0 ? (
        <div>
          <p className="text-sm text-ink mb-2">Right now the site uses its built-in list:</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {defaults.map((d) => (
              <span
                key={d.label}
                className="text-xs px-3 py-1 rounded-full border border-border bg-background text-ink"
              >
                {isCountry ? `${d.flag} ${d.value} · ${d.label}` : d.label}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={customise}
            disabled={busy}
            className="bg-primary text-background font-label text-xs uppercase tracking-wide px-5 py-2.5 rounded-lg hover:bg-primary-dark transition disabled:opacity-50"
          >
            {busy ? "Working…" : "Customise this list"}
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-5">
            {rows.map((row, i) => (
              <FilterRow
                key={row.id}
                row={row}
                isCountry={isCountry}
                hasKeywords={hasKeywords}
                busy={busy}
                isFirst={i === 0}
                isLast={i === rows.length - 1}
                onMove={(direction) => move(i, direction)}
                onSave={(changes) => save(row, changes)}
                onDelete={() => remove(row)}
              />
            ))}
          </div>

          <form onSubmit={add} className="border-t border-border pt-4 flex flex-wrap items-end gap-3">
            {isCountry && (
              <input
                className={`${inputClass} w-20`}
                placeholder="Code"
                value={draft.value}
                onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
                required
              />
            )}
            <input
              className={`${inputClass} w-44`}
              placeholder="Name"
              value={draft.label}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              required
            />
            {isCountry && (
              <input
                className={`${inputClass} w-20`}
                placeholder="Flag"
                value={draft.flag}
                onChange={(e) => setDraft((d) => ({ ...d, flag: e.target.value }))}
              />
            )}
            {hasKeywords && (
              <input
                className={`${inputClass} flex-1 min-w-[14rem]`}
                placeholder="Keywords, comma separated"
                value={draft.keywords}
                onChange={(e) => setDraft((d) => ({ ...d, keywords: e.target.value }))}
              />
            )}
            <button
              type="submit"
              disabled={busy}
              className="bg-primary text-background font-label text-xs uppercase tracking-wide px-5 py-2.5 rounded-lg hover:bg-primary-dark transition disabled:opacity-50"
            >
              + Add
            </button>
          </form>
        </>
      )}
    </section>
  );
}

function FilterRow({ row, isCountry, hasKeywords, busy, isFirst, isLast, onMove, onSave, onDelete }) {
  const [draft, setDraft] = useState({
    label: row.label || "",
    keywords: row.keywords || "",
    value: row.value || "",
    flag: row.flag || "",
  });
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  const dirty =
    draft.label !== (row.label || "") ||
    (isCountry && (draft.value !== (row.value || "") || draft.flag !== (row.flag || ""))) ||
    (hasKeywords && draft.keywords !== (row.keywords || ""));

  return (
    <div className="flex flex-wrap items-center gap-2 bg-background border border-border rounded-lg p-2">
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={busy || isFirst}
          className="text-xs text-muted hover:text-primary disabled:opacity-30 leading-none px-1"
          aria-label="Move up"
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={busy || isLast}
          className="text-xs text-muted hover:text-primary disabled:opacity-30 leading-none px-1 mt-1"
          aria-label="Move down"
        >
          ▼
        </button>
      </div>

      {isCountry && <input className={`${inputClass} w-20`} value={draft.value} onChange={set("value")} />}
      <input className={`${inputClass} w-44`} value={draft.label} onChange={set("label")} />
      {isCountry && <input className={`${inputClass} w-20`} value={draft.flag} onChange={set("flag")} />}
      {hasKeywords && (
        <input
          className={`${inputClass} flex-1 min-w-[14rem]`}
          value={draft.keywords}
          onChange={set("keywords")}
        />
      )}

      <button
        type="button"
        onClick={() => onSave(draft)}
        disabled={busy || !dirty}
        className="bg-primary text-background font-label text-[10px] uppercase tracking-wide px-3 py-2 rounded-lg hover:bg-primary-dark transition disabled:opacity-40"
      >
        Save
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="font-label text-[10px] uppercase tracking-wide px-3 py-2 text-red-600 hover:underline disabled:opacity-40"
      >
        Delete
      </button>
    </div>
  );
}