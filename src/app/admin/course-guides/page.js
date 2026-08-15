"use client";
import { useState, useEffect } from "react";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";
import { getSubjectStyle } from "@/data/mentors";

const countries = ["NL", "UK"];
const countryLabels = { NL: "The Netherlands", UK: "The UK" };
const countryFlags = { NL: "🇳🇱", UK: "🇬🇧" };

const emptyForm = {
  subject: "",
  country: "",
  description: "",
  popularUniversities: "",
  admission: "",
  languageRequirement: "",
  extracurriculars: "",
  writtenBy: "",
};

export default function AdminCourseGuides() {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [wasEditing, setWasEditing] = useState(false);

  async function loadGuides() {
    setLoading(true);
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      setError("You must be logged in to view this page.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/admin/course-guides", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();

    if (result.error) {
      setError(result.error);
    } else {
      setGuides(result.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadGuides();
  }, []);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleDelete(id, label) {
    if (!window.confirm(`Delete "${label}"? This can't be undone.`)) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const res = await fetch("/api/admin/course-guides-delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id }),
    });

    const result = await res.json();

    if (result.error) {
      alert("Error: " + result.error);
    } else {
      loadGuides();
    }
  }

  function handleEditClick(guide) {
    setEditingId(guide.id);
    setSuccess(false);
    setSubmitError(null);
    setForm({
      subject: guide.subject,
      country: guide.country,
      description: guide.description,
      popularUniversities: (guide.popular_universities || []).join(", "),
      admission: guide.admission,
      languageRequirement: guide.language_requirement || "",
      extracurriculars: (guide.extracurriculars || []).join(", "),
      writtenBy: guide.written_by || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setSubmitError(null);
    setSuccess(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSuccess(false);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const endpoint = editingId ? "/api/admin/course-guides-update" : "/api/admin/course-guides-add";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...form,
        ...(editingId && { id: editingId }),
        countryLabel: countryLabels[form.country],
        flag: countryFlags[form.country],
        popularUniversities: form.popularUniversities
          .split(",")
          .map((u) => u.trim())
          .filter(Boolean),
        extracurriculars: form.extracurriculars
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
      }),
    });

    const result = await res.json();
    setSubmitting(false);

    if (result.error) {
      setSubmitError(result.error);
    } else {
      setWasEditing(!!editingId);
      setSuccess(true);
      setForm(emptyForm);
      setEditingId(null);
      loadGuides();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9F2]">
        <Navbar />
        <p className="text-gray-500 text-center py-16">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FFF9F2]">
        <Navbar />
        <p className="text-red-600 font-semibold text-center py-16">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9F2]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center text-lg shrink-0">
            📚
          </span>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Manage Course Guides
          </h1>
        </div>
        <p className="text-gray-600 mb-8">
          Add a new course guide. It will appear on the public Course Guides page immediately.
        </p>

        {editingId && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-2.5 mb-3 text-sm flex items-center justify-between">
            <span className="flex items-center gap-1.5">✏️ Editing an existing course guide.</span>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-amber-800 font-semibold hover:underline"
            >
              Cancel
            </button>
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-10"
        >
          <div className="h-1.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-400" />
          <div className="p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Basics
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Subject
                </label>
                <input
                  required
                  value={form.subject}
                  onChange={(e) => updateField("subject", e.target.value)}
                  placeholder="e.g. Psychology"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Country
                </label>
                <select
                  required
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                >
                  <option value="">Select country</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>
                      {countryFlags[c]} {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Description
              </label>
              <textarea
                required
                rows={3}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="A short overview of what this course/programme is like..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
          </div>

          <div className="pt-5 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Admission &amp; Activities
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Popular universities <span className="text-gray-400 font-normal">(comma-separated)</span>
                </label>
                <input
                  value={form.popularUniversities}
                  onChange={(e) => updateField("popularUniversities", e.target.value)}
                  placeholder="e.g. TU Delft, University of Amsterdam"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Admission requirements
                </label>
                <textarea
                  required
                  rows={2}
                  value={form.admission}
                  onChange={(e) => updateField("admission", e.target.value)}
                  placeholder="How admissions work for this course..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Language requirement <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  value={form.languageRequirement}
                  onChange={(e) => updateField("languageRequirement", e.target.value)}
                  placeholder="e.g. Dutch C1 proficiency required"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Extracurriculars <span className="text-gray-400 font-normal">(comma-separated)</span>
                </label>
                <input
                  value={form.extracurriculars}
                  onChange={(e) => updateField("extracurriculars", e.target.value)}
                  placeholder="e.g. Debating society, Honours College"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Attribution
            </p>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Written by <span className="text-gray-400 font-normal">(optional attribution)</span>
            </label>
            <input
              value={form.writtenBy}
              onChange={(e) => updateField("writtenBy", e.target.value)}
              placeholder="e.g. Written by a 2nd-year student at..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>

          {submitError && (
            <p className="text-red-600 text-sm font-medium">⚠️ {submitError}</p>
          )}
          {success && (
            <p className="text-green-700 text-sm font-medium">
              {wasEditing ? "✓ Course guide updated." : "✓ Course guide added."}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm hover:bg-green-700 hover:shadow transition disabled:opacity-50"
          >
            {submitting ? "Saving..." : editingId ? "Update Course Guide" : "Add Course Guide"}
          </button>
          </div>
        </form>

        {(form.subject || form.description) && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <h2 className="text-xl font-bold text-gray-900">Live Preview</h2>
            </div>
            <div className="max-w-md">
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-full">
                <div
                  className={`px-6 py-4 flex items-center justify-between gap-3 ${
                    form.subject ? getSubjectStyle(form.subject).color : "bg-gray-100 text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center text-base shrink-0">
                      {form.subject ? getSubjectStyle(form.subject).icon : "📘"}
                    </span>
                    <h3 className="font-bold text-base leading-tight">
                      {form.subject || "Subject"} in {countryLabels[form.country] || "..."}
                    </h3>
                  </div>
                  {form.country && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/70 shrink-0">
                      {countryFlags[form.country]} {form.country}
                    </span>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <p className="text-sm text-gray-600 mb-4">
                    {form.description || "Description will appear here..."}
                  </p>

                  {form.popularUniversities.trim() && (
                    <div className="mb-4 pb-4 border-b border-gray-100">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-xs">🏛️</span>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Popular universities
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {form.popularUniversities.split(",").map((u) => u.trim()).filter(Boolean).map((uni) => (
                          <span
                            key={uni}
                            className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-800"
                          >
                            {uni}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-xs">📋</span>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Admission requirements
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">
                      {form.admission || "Admission details will appear here..."}
                    </p>
                  </div>

                  {form.extracurriculars.trim() && (
                    <div className="mb-4">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-xs">🎯</span>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Extracurriculars
                        </p>
                      </div>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {form.extracurriculars.split(",").map((a) => a.trim()).filter(Boolean).map((activity) => (
                          <li key={activity} className="flex items-start gap-2">
                            <span className="text-green-600 mt-0.5">•</span>
                            <span>{activity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {form.languageRequirement.trim() && (
                    <div className="mb-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                        <p className="text-xs font-semibold text-amber-800">
                          ⚠️ Important: {form.languageRequirement}
                        </p>
                      </div>
                    </div>
                  )}

                  {form.writtenBy.trim() && (
                    <p className="text-xs text-gray-400 italic mt-auto pt-3 border-t border-gray-100">
                      {form.writtenBy}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Existing Course Guides ({guides.length})
        </h2>
        <div className="space-y-2">
          {guides.map((g) => (
            <div
              key={g.id}
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 hover:border-gray-300 hover:shadow-sm transition"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getSubjectStyle(g.subject).color}`}
                >
                  {getSubjectStyle(g.subject).icon} {g.subject}
                </span>
                <span className="text-sm text-gray-600">
                  {g.flag} {g.country_label}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleEditClick(g)}
                  title="Edit this course guide"
                  className="text-gray-400 hover:text-green-700 hover:bg-green-50 p-1.5 rounded-md transition"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(g.id, `${g.subject} in ${g.country_label}`)}
                  title="Delete this course guide"
                  className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}