"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Navbar from "@/Components/Navbar";
import GradeInput from "@/Components/GradeInput";
import { supabase } from "@/lib/supabase";
import { useFilterOptions } from "@/lib/useFilterOptions";
import { ALL_UNIVERSITIES, ALL_LANGUAGES } from "@/data/options";
import { getLanguageStyle } from "@/data/mentors";
import { YEARS } from "@/lib/filterDefaults";

const COMMON_LANGUAGES = ALL_LANGUAGES.slice(0, 20);

const emptyForm = {
  name: "",
  school: "",
  year: "",
  subject: "",
  country: "",
  languages: [],
  bio: "",
  support_guidance: "",
  extracurriculars: "",
  final_grade: "",
  linkedin: "",
  about_me: "",
  photo_url: "",
  sessions: 0,
  answers: 0,
  rating: 0,
  available: true,
  verified: true,
};

const inputClass =
  "w-full border border-border rounded-lg bg-background px-3 py-2 text-sm text-ink placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30";

async function adminFetch(method, body) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const res = await fetch("/api/admin/mentors", {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Something went wrong");
  return json;
}

function mentorToForm(m) {
  const form = { ...emptyForm };
  for (const key of Object.keys(emptyForm)) {
    if (m[key] !== undefined && m[key] !== null) form[key] = m[key];
  }
  const langs = Array.isArray(m.languages) ? m.languages : String(m.languages || "").split(",");
  form.languages = langs.map((l) => String(l).trim()).filter(Boolean);
  return form;
}

// The same rules the apply form enforces.
function validate(form) {
  if (!form.name.trim()) return "Please enter the mentor's name.";
  if (!form.school.trim()) return "Please select the university.";
  if (!form.year) return "Please choose the year of study.";
  if (!form.subject.trim()) return "Please select the career field.";
  if (!form.country.trim()) return "Please select the country.";
  if (!form.bio.trim() || !form.support_guidance.trim() || !form.extracurriculars.trim()) {
    return "Please fill in the bio, support and guidance, and extracurriculars.";
  }
  if (!form.final_grade.trim()) {
    return "Please choose a grading system and enter a valid final grade.";
  }
  if (form.languages.length === 0) return "Please select at least one language.";
  if (!form.photo_url) return "Please upload a profile photo.";
  return null;
}

function Field({ label, hint, wide, children }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="block text-sm font-semibold text-ink mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted mt-1.5">{hint}</p>}
    </div>
  );
}

// A dropdown with an "Other" choice that reveals a text box, like the apply form.
function SelectWithOther({ value, onChange, options, placeholder, otherPlaceholder }) {
  const [otherMode, setOtherMode] = useState(
    !!value && !options.some((o) => o.value === value)
  );

  return (
    <>
      <select
        required={!otherMode}
        className={inputClass}
        value={otherMode ? "__other" : value}
        onChange={(e) => {
          if (e.target.value === "__other") {
            setOtherMode(true);
            onChange("");
          } else {
            setOtherMode(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        <option value="__other">Other</option>
      </select>
      {otherMode && (
        <input
          required
          className={`${inputClass} mt-2`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={otherPlaceholder}
        />
      )}
    </>
  );
}

// Searchable university list with an "Other" option, like the apply form.
function UniversityPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [otherMode, setOtherMode] = useState(!!value && !ALL_UNIVERSITIES.includes(value));
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = ALL_UNIVERSITIES.filter((name) =>
    name.toLowerCase().includes(search.trim().toLowerCase())
  );

  function pick(name) {
    setOtherMode(false);
    onChange(name);
    setOpen(false);
    setSearch("");
  }

  function pickOther(prefill = "") {
    setOtherMode(true);
    onChange(prefill);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={ref} className="relative">
      <input
        required={!otherMode}
        autoComplete="off"
        className={inputClass}
        value={open ? search : otherMode ? "Other" : value}
        placeholder="Search or select the university"
        onFocus={() => {
          setSearch("");
          setOpen(true);
        }}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (filtered.length > 0) pick(filtered[0]);
            else pickOther(search.trim());
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-surface border border-border rounded-lg shadow-lg">
          {filtered.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => pick(name)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-border/40 transition ${
                value === name && !otherMode ? "font-semibold text-primary" : "text-ink"
              }`}
            >
              {name}
            </button>
          ))}
          {filtered.length === 0 && search.trim() && (
            <p className="px-4 py-2 text-xs text-muted">
              No match in our list. Choose Other to type it.
            </p>
          )}
          <button
            type="button"
            onClick={() => pickOther(search.trim())}
            className="w-full text-left px-4 py-2 text-sm font-semibold text-ink border-t border-border hover:bg-border/40 transition"
          >
            Other
          </button>
        </div>
      )}

      {otherMode && (
        <input
          required
          className={`${inputClass} mt-2`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter the university"
        />
      )}
    </div>
  );
}

// The language pills, "show more", and "Other" with suggestions, like the apply form.
function LanguagePicker({ selected, onChange }) {
  const [showAll, setShowAll] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState("");

  const custom = selected.filter((l) => !ALL_LANGUAGES.includes(l));
  const visible = [
    ...(showAll
      ? ALL_LANGUAGES
      : [
          ...COMMON_LANGUAGES,
          ...ALL_LANGUAGES.slice(COMMON_LANGUAGES.length).filter((l) => selected.includes(l)),
        ]),
    ...custom,
  ];

  function addOther(value) {
    const clean = value.replace(/,/g, " ").trim();
    if (!clean) return;
    const match = ALL_LANGUAGES.find((l) => l.toLowerCase() === clean.toLowerCase());
    const name = match || clean.charAt(0).toUpperCase() + clean.slice(1);
    if (!selected.includes(name)) onChange([...selected, name]);
    setOtherText("");
  }

  const query = otherText.trim().toLowerCase();
  const alphabetical = (a, b) => a.localeCompare(b);
  const suggestions = query
    ? [
        ...ALL_LANGUAGES.filter((l) => l.toLowerCase().startsWith(query)).sort(alphabetical),
        ...ALL_LANGUAGES.filter(
          (l) => !l.toLowerCase().startsWith(query) && l.toLowerCase().includes(query)
        ).sort(alphabetical),
      ]
        .filter((l) => !selected.includes(l))
        .slice(0, 8)
    : [];
  const alreadySelected = selected.some((l) => l.toLowerCase() === query);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {visible.map((lang) => {
          const style = getLanguageStyle(lang);
          const isSelected = selected.includes(lang);
          return (
            <button
              key={lang}
              type="button"
              onClick={() =>
                onChange(isSelected ? selected.filter((l) => l !== lang) : [...selected, lang])
              }
              className={`text-xs font-semibold px-3 py-1 rounded-full transition ${style.color} ${
                isSelected ? "ring-2 ring-primary" : "hover:opacity-80"
              }`}
            >
              {style.icon} {lang}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setOtherOpen((o) => !o)}
          className={`text-xs font-semibold px-3 py-1 rounded-full transition bg-surface text-ink ${
            otherOpen ? "ring-2 ring-primary" : "hover:opacity-80"
          }`}
        >
          ➕ Other
        </button>
      </div>

      {otherOpen && (
        <div className="mt-2">
          <div className="flex gap-2">
            <input
              autoFocus
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOther(suggestions[0] || otherText);
                }
              }}
              maxLength={30}
              placeholder="Start typing a language"
              className="flex-1 border border-border rounded-lg px-4 py-2 text-sm text-ink placeholder-muted/60 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => addOther(suggestions[0] || otherText)}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-ink text-white hover:opacity-90 transition"
            >
              Add
            </button>
          </div>

          {query && (
            <div className="mt-1 border border-border rounded-lg bg-surface shadow-sm overflow-hidden">
              {suggestions.length > 0 ? (
                suggestions.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => addOther(lang)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-ink hover:bg-border/40 transition"
                  >
                    <span>{getLanguageStyle(lang).icon}</span>
                    {lang}
                  </button>
                ))
              ) : (
                <p className="px-4 py-2 text-xs text-muted">
                  {alreadySelected
                    ? "Already selected."
                    : `No match in our list. Press Add to use "${otherText.trim()}".`}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowAll((s) => !s)}
        className="mt-2 text-xs font-semibold text-primary hover:underline"
      >
        {showAll
          ? "Show fewer languages"
          : `Show ${ALL_LANGUAGES.length - COMMON_LANGUAGES.length} more languages`}
      </button>

      {selected.length === 0 && (
        <p className="text-red-600 text-xs mt-1.5">Select at least one language.</p>
      )}
    </div>
  );
}

export default function AdminMentors() {
  const { countries, careerFields } = useFilterOptions();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState(null); // null = form closed
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [deleting, setDeleting] = useState(null); // the mentor being removed
  const [deleteLogin, setDeleteLogin] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const json = await adminFetch("GET");
      setMentors(json.data || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError(null);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEdit(mentor) {
    setEditingId(mentor.id);
    setForm(mentorToForm(mentor));
    setFormError(null);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setForm(null);
    setEditingId(null);
    setFormError(null);
  }

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const bind = (key) => ({
    value: form[key] ?? "",
    onChange: (e) => setField(key, e.target.value),
  });

  async function handlePhoto(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Please upload an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError("Image must be under 5MB.");
      return;
    }

    setFormError(null);
    setPhotoUploading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("mentor-photos")
      .upload(fileName, file);

    if (uploadError) {
      setFormError("Photo upload failed: " + uploadError.message);
      setPhotoUploading(false);
      return;
    }

    const { data } = supabase.storage.from("mentor-photos").getPublicUrl(fileName);
    setField("photo_url", data.publicUrl);
    setPhotoUploading(false);
  }

  async function save(e) {
    e.preventDefault();
    const problem = validate(form);
    if (problem) {
      setFormError(problem);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editingId) await adminFetch("PATCH", { ...form, id: editingId });
      else await adminFetch("POST", form);
      setNotice(editingId ? "Mentor updated." : "Mentor added.");
      closeForm();
      await load();
    } catch (err) {
      setFormError(err.message);
    }
    setSaving(false);
  }

  function askDelete(mentor) {
    setDeleting(mentor);
    setDeleteLogin(false);
  }

  async function doDelete() {
    setDeleteBusy(true);
    try {
      const json = await adminFetch("DELETE", { id: deleting.id, deleteLogin });
      setNotice(json.warning || `${deleting.name} was removed.`);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(err.message);
      setDeleting(null);
    }
    setDeleteBusy(false);
  }

  const q = search.trim().toLowerCase();
  const visible = mentors.filter(
    (m) =>
      !q ||
      [m.name, m.school, m.subject, m.country].filter(Boolean).join(" ").toLowerCase().includes(q)
  );

  const countryOptions = countries.map((c) => ({ value: c.value, label: c.label }));
  const careerFieldOptions = careerFields.map((f) => ({ value: f, label: f }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-12">
        <Link
          href="/admin"
          className="font-label text-xs uppercase tracking-wide text-muted hover:text-primary transition mb-6 inline-block"
        >
          ← Admin dashboard
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="font-label text-[10px] tracking-[0.15em] uppercase text-primary mb-2">Admin</p>
            <h1 className="font-display text-3xl text-ink mb-1">Mentors</h1>
            <p className="text-muted text-sm">
              Add, edit, or remove mentors. Changes show on the site straight away.
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="bg-primary text-background font-label text-xs uppercase tracking-wide px-5 py-3 rounded-lg hover:bg-primary-dark transition"
          >
            + Add mentor
          </button>
        </div>

        {notice && (
          <p className="text-sm text-ink bg-primary/10 border border-primary/30 rounded-lg px-4 py-2.5 mb-6">
            {notice}
          </p>
        )}
        {error && <p className="text-sm text-red-600 font-semibold mb-6">{error}</p>}

        {form && (
          <form
            key={editingId || "new"}
            onSubmit={save}
            className="bg-surface border border-border rounded-xl p-5 mb-8 shadow-sm"
          >
            <h2 className="font-display text-xl text-ink mb-4">
              {editingId ? "Edit mentor" : "Add a mentor"}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full name" wide>
                <input required className={inputClass} {...bind("name")} />
              </Field>

              <Field label="University">
                <UniversityPicker value={form.school} onChange={(v) => setField("school", v)} />
              </Field>

              <Field label="Year of Study">
                <select required className={inputClass} {...bind("year")}>
                  <option value="">Select year</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Career Field">
                <SelectWithOther
                  key={careerFieldOptions.map((o) => o.value).join("|")}
                  value={form.subject}
                  onChange={(v) => setField("subject", v)}
                  options={careerFieldOptions}
                  placeholder="Select Field"
                  otherPlaceholder="Enter the career field"
                />
              </Field>

              <Field label="Country focus">
                <SelectWithOther
                  key={countryOptions.map((c) => c.value).join(",")}
                  value={form.country}
                  onChange={(v) => setField("country", v)}
                  options={countryOptions}
                  placeholder="Select Country"
                  otherPlaceholder="Enter the country"
                />
              </Field>

              <Field label="Languages spoken (select at least one)" wide>
                <LanguagePicker
                  selected={form.languages}
                  onChange={(v) => setField("languages", v)}
                />
              </Field>

              <Field label="Bio (why they want to mentor)" wide>
                <textarea
                  required
                  rows={3}
                  className={`${inputClass} resize-y`}
                  placeholder="What do you wish you knew before starting your degree?"
                  {...bind("bio")}
                />
              </Field>

              <Field label="How can they support and guide students?" wide>
                <textarea
                  required
                  rows={3}
                  className={`${inputClass} resize-y`}
                  placeholder="What topics, questions, or experiences could they help a student with?"
                  {...bind("support_guidance")}
                />
              </Field>

              <Field label="Extracurriculars" wide>
                <textarea
                  required
                  rows={2}
                  className={`${inputClass} resize-y`}
                  placeholder="Clubs, sports, volunteering, leadership roles, or other activities."
                  {...bind("extracurriculars")}
                />
              </Field>

              <Field label="Final High School Grade" wide>
                <GradeInput
                  value={form.final_grade}
                  onChange={(v) => setField("final_grade", v)}
                />
              </Field>

              <Field label="LinkedIn profile (optional)">
                <input
                  className={inputClass}
                  placeholder="linkedin.com/in/yourname"
                  {...bind("linkedin")}
                />
              </Field>

              <Field label="About me (optional)">
                <input className={inputClass} {...bind("about_me")} />
              </Field>

              <Field label="Profile photo" hint="An image file under 5MB." wide>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-display shrink-0">
                    {form.photo_url ? (
                      <img src={form.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      form.name?.charAt(0)
                    )}
                  </div>
                  <label className="font-label text-[10px] uppercase tracking-wide px-4 py-2.5 rounded-lg border border-border text-ink hover:border-primary hover:text-primary transition cursor-pointer">
                    {photoUploading ? "Uploading…" : form.photo_url ? "Replace photo" : "Upload photo"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhoto}
                      disabled={photoUploading}
                      className="hidden"
                    />
                  </label>
                  {form.photo_url && (
                    <button
                      type="button"
                      onClick={() => setField("photo_url", "")}
                      className="font-label text-[10px] uppercase tracking-wide text-muted hover:text-primary transition"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </Field>
            </div>

            <div className="border-t border-border mt-6 pt-5">
              <p className="font-label text-[10px] uppercase tracking-[0.15em] text-muted mb-3">
                Admin only
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Sessions">
                  <input type="number" min="0" className={inputClass} {...bind("sessions")} />
                </Field>
                <Field label="Answers">
                  <input type="number" min="0" className={inputClass} {...bind("answers")} />
                </Field>
                <Field label="Rating (0 to 5)">
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    className={inputClass}
                    {...bind("rating")}
                  />
                </Field>
              </div>
              <div className="flex flex-wrap gap-6 mt-4">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={!!form.available}
                    onChange={(e) => setField("available", e.target.checked)}
                  />
                  Open for booking
                </label>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={!!form.verified}
                    onChange={(e) => setField("verified", e.target.checked)}
                  />
                  Verified
                </label>
              </div>
            </div>

            {!editingId && (
              <p className="text-xs text-muted mt-4">
                Mentors added here have no login. Use Applications if they need one.
              </p>
            )}

            {formError && <p className="text-sm text-red-600 font-semibold mt-3">{formError}</p>}

            <div className="flex gap-3 mt-5">
              <button
                type="submit"
                disabled={saving || photoUploading}
                className="bg-primary text-background font-label text-xs uppercase tracking-wide px-5 py-2.5 rounded-lg hover:bg-primary-dark transition disabled:opacity-50"
              >
                {saving ? "Saving…" : editingId ? "Save changes" : "Add mentor"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="font-label text-xs uppercase tracking-wide px-5 py-2.5 rounded-lg border border-border text-ink hover:border-primary transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, university, subject or country…"
          className="w-full border border-border rounded-xl bg-background px-5 py-3 text-ink placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 mb-2"
        />
        <p className="text-xs text-muted mb-5">
          {loading ? "Loading…" : `${visible.length} of ${mentors.length} mentors`}
        </p>

        <div className="space-y-3">
          {visible.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center gap-4 bg-surface border border-border rounded-xl p-4"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-display shrink-0">
                {m.photo_url ? (
                  <img src={m.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  m.initials || m.name?.charAt(0)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink truncate">{m.name}</p>
                <p className="text-sm text-muted truncate">
                  {[m.school, m.subject, m.country].filter(Boolean).join(" · ")}
                </p>
                <div className="flex gap-2 mt-1.5">
                  <span
                    className={`font-label text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
                      m.available ? "bg-green-100 text-green-800" : "bg-border text-muted"
                    }`}
                  >
                    {m.available ? "Open" : "Closed"}
                  </span>
                  {m.verified && (
                    <span className="font-label text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Verified
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/mentors/${m.id}`}
                  target="_blank"
                  className="font-label text-[10px] uppercase tracking-wide text-muted hover:text-primary transition"
                >
                  View ↗
                </Link>
                <button
                  type="button"
                  onClick={() => openEdit(m)}
                  className="font-label text-[10px] uppercase tracking-wide text-primary hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => askDelete(m)}
                  className="font-label text-[10px] uppercase tracking-wide text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <div className="bg-background rounded-xl border border-border p-6 max-w-md w-full shadow-xl">
            <h3 className="font-display text-xl text-ink mb-2">Remove {deleting.name}?</h3>
            <p className="text-sm text-muted mb-4">
              Their profile disappears from the site straight away. This can&apos;t be undone.
            </p>
            {deleting.user_id && (
              <label className="flex items-start gap-2 text-sm text-ink mb-4">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={deleteLogin}
                  onChange={(e) => setDeleteLogin(e.target.checked)}
                />
                <span>Also delete their login account</span>
              </label>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={doDelete}
                disabled={deleteBusy}
                className="bg-red-600 text-white font-label text-xs uppercase tracking-wide px-5 py-2.5 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleteBusy ? "Removing…" : "Remove mentor"}
              </button>
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="font-label text-xs uppercase tracking-wide px-5 py-2.5 rounded-lg border border-border text-ink hover:border-primary transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}