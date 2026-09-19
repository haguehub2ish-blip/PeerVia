"use client";
import { useState, useEffect, useRef } from "react";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";
import { getSubjectStyle } from "@/data/mentors";
import RepeatableFieldGroup from "@/Components/RepeatableFieldGroup";

const countries = ["NL", "UK"];
const countryLabels = { NL: "The Netherlands", UK: "The UK" };
const countryFlags = { NL: "🇳🇱", UK: "🇬🇧" };

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const emptyForm = {
  subject: "",
  country: "",
  description: "",
  popularUniversities: "",
  admission: "",
  languageRequirement: "",
  datePublished: "",
  journeySteps: [],
  applicationRules: [],
  entryPaths: [],
  pipelineStages: [],
  specializations: [],
  careerSteps: [],
  glossary: [],
  officialLinks: [],
};

export default function AdminCourseGuides() {
  const [pdfParsing, setPdfParsing] = useState(false);
const [pdfParseError, setPdfParseError] = useState(null);
const [pdfProgress, setPdfProgress] = useState(0);
const [pdfTimeLeft, setPdfTimeLeft] = useState(null);
const pdfProgressIntervalRef = useRef(null);
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [wasEditing, setWasEditing] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  async function handlePdfUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (form.subject || form.description) {
    const confirmed = window.confirm(
      "This will replace the current form content with what's extracted from the PDF. Continue?"
    );
    if (!confirmed) {
      e.target.value = "";
      return;
    }
  }

  setPdfParsing(true);
  setPdfParseError(null);
  setPdfProgress(0);

  // The parse endpoint is a single non-streaming AI call, so we don't get real
  // byte-level progress from the server. Instead, estimate a total duration from
  // the file size and animate toward it, easing off so the bar never claims 100%
  // before the response actually arrives.
  const fileSizeMB = file.size / (1024 * 1024);
  const estimatedMs = Math.min(45000, Math.max(9000, 9000 + fileSizeMB * 4500));
  const startTime = Date.now();
  setPdfTimeLeft(Math.round(estimatedMs / 1000));

  pdfProgressIntervalRef.current = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const eased = 92 * (1 - Math.exp(-elapsed / (estimatedMs * 0.6)));
    setPdfProgress(eased);
    setPdfTimeLeft(Math.max(1, Math.ceil((estimatedMs - elapsed) / 1000)));
  }, 200);

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  const uploadData = new FormData();
  uploadData.append("file", file);

  try {
    const res = await fetch("/api/admin/parse-course-guide-pdf", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: uploadData,
    });

    const result = await res.json();

    clearInterval(pdfProgressIntervalRef.current);
    setPdfProgress(100);
    setPdfTimeLeft(0);

    if (result.error) {
      setPdfParseError(result.error);
    } else {
      const parsed = result.data;
      setForm({
        ...emptyForm,
        ...parsed,
        datePublished: getTodayDateString(),
      });
    }
  } catch (err) {
    clearInterval(pdfProgressIntervalRef.current);
    setPdfParseError("Failed to parse PDF: " + err.message);
  }

  // Briefly hold at 100% so the bar doesn't vanish mid-jump.
  setTimeout(() => {
    setPdfParsing(false);
    setPdfProgress(0);
    setPdfTimeLeft(null);
  }, 400);

  e.target.value = "";
}

useEffect(() => {
  return () => {
    if (pdfProgressIntervalRef.current) clearInterval(pdfProgressIntervalRef.current);
  };
}, []);

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

  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
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
      journeySteps: guide.journey_steps || [],
      applicationRules: guide.application_rules || [],
      entryPaths: (guide.entry_paths || []).map((p) => ({ ...p, points: Array.isArray(p.points) ? p.points.join("\n") : p.points || "" })),
      pipelineStages: guide.pipeline_stages || [],
      specializations: guide.specializations || [],
      careerSteps: guide.career_steps || [],
      glossary: guide.glossary || [],
      officialLinks: guide.official_links || [],
      datePublished: guide.date_published || getTodayDateString(),
    });
    setImageFile(null);
    setImagePreview(guide.image_url || null);
    setExistingImageUrl(guide.image_url || null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm({ ...emptyForm, datePublished: getTodayDateString() });
    setSubmitError(null);
    setSuccess(false);
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSuccess(false);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    let uploadedImageUrl = existingImageUrl;

    if (imageFile) {
      setUploadingImage(true);
      const imageForm = new FormData();
      imageForm.append("file", imageFile);

      const uploadRes = await fetch("/api/admin/course-guides-upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: imageForm,
      });
      const uploadResult = await uploadRes.json();
      setUploadingImage(false);

      if (uploadResult.error) {
        setSubmitError(uploadResult.error);
        setSubmitting(false);
        return;
      }
      uploadedImageUrl = uploadResult.url;
    }

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
        imageUrl: uploadedImageUrl,
        popularUniversities: form.popularUniversities
          .split(",")
          .map((u) => u.trim())
          .filter(Boolean),
        journeySteps: form.journeySteps,
        applicationRules: form.applicationRules,
        entryPaths: form.entryPaths.map((p) => ({ ...p, points: (p.points || "").split("\n").map((s) => s.trim()).filter(Boolean) })),
        pipelineStages: form.pipelineStages,
        specializations: form.specializations,
        careerSteps: form.careerSteps,
        glossary: form.glossary,
        officialLinks: form.officialLinks,
      }),
    });

    const result = await res.json();
    setSubmitting(false);

    if (result.error) {
      setSubmitError(result.error);
    } else {
      setWasEditing(!!editingId);
      setSuccess(true);
      setForm({ ...emptyForm, datePublished: getTodayDateString() });
      setEditingId(null);
      setImageFile(null);
      setImagePreview(null);
      setExistingImageUrl(null);
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

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-6">
  <div className="flex items-center gap-2 mb-2">
    <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm shrink-0">
      ✨
    </span>
    <h2 className="text-base font-bold text-gray-900">Auto-fill from a PDF</h2>
  </div>
  <p className="text-sm text-gray-600 mb-3">
    Upload a course/career guide PDF and AI will fill out the form below for you — review and edit before saving.
  </p>
  <label className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer hover:bg-indigo-100 transition">
    {pdfParsing ? "Reading PDF..." : "📄 Choose PDF"}
    <input
      type="file"
      accept="application/pdf"
      onChange={handlePdfUpload}
      disabled={pdfParsing}
      className="hidden"
    />
  </label>
  {pdfParsing && (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
        <span>Analyzing PDF with AI…</span>
        <span>
          {pdfProgress >= 100
            ? "Done!"
            : pdfTimeLeft
            ? `~${pdfTimeLeft}s left`
            : "Starting…"}
        </span>
      </div>
      <div className="w-full bg-indigo-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 bg-indigo-600 rounded-full transition-[width] duration-200 ease-out"
          style={{ width: `${pdfProgress}%` }}
        />
      </div>
      <p className="text-right text-xs text-gray-400 mt-1">{Math.round(pdfProgress)}%</p>
    </div>
  )}
  {pdfParseError && (
    <p className="text-red-600 text-sm font-medium mt-3">⚠️ {pdfParseError}</p>
  )}
</div>

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

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Cover image
              </label>
              <div className="flex items-center gap-4">
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-20 h-24 object-cover rounded-lg border border-gray-200"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-600 file:text-white file:font-semibold file:text-sm hover:file:bg-green-700 file:cursor-pointer cursor-pointer"
                />
              </div>
              {uploadingImage && (
                <p className="text-xs text-gray-500 mt-1.5">Uploading image...</p>
              )}
            </div>
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
              Admission
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
            </div>
          </div>

          <RepeatableFieldGroup
            title="Journey / Timeline Steps"
            description='e.g. "Years 1–3: Bachelor of Medicine" — shown as a quick step-by-step summary at the top of the guide.'
            items={form.journeySteps}
            onChange={(items) => updateField("journeySteps", items)}
            fields={[
              { key: "title", label: "Step Title", placeholder: "e.g. Years 1–3: Bachelor of Medicine" },
              { key: "description", label: "Description", type: "textarea", placeholder: "Learn the basics of science and human anatomy..." },
            ]}
            emptyItem={{ title: "", description: "" }}
            addLabel="Add Step"
          />

          <RepeatableFieldGroup
            title="Application Rules"
            description='Key rules students need to know, e.g. "One Portal", "Early Deadline".'
            items={form.applicationRules}
            onChange={(items) => updateField("applicationRules", items)}
            fields={[
              { key: "title", label: "Rule Title", placeholder: "e.g. Early Deadline" },
              { key: "description", label: "Description", type: "textarea", placeholder: "Applications close exceptionally early on..." },
            ]}
            emptyItem={{ title: "", description: "" }}
            addLabel="Add Rule"
          />

          <RepeatableFieldGroup
            title="Entry Paths"
            description='Different ways to qualify for entry, e.g. "Entry via VWO" vs "Entry via IB".'
            items={form.entryPaths}
            onChange={(items) => updateField("entryPaths", items)}
            fields={[
              { key: "title", label: "Path Title", placeholder: "e.g. Entry via the International Baccalaureate (IB)" },
              { key: "points", label: "Requirements (one per line)", type: "list", placeholder: "Biology, Chemistry, and Physics at HL...\nDeficiency exams via Boswell-Bèta..." },
            ]}
            emptyItem={{ title: "", points: "" }}
            addLabel="Add Entry Path"
          />

          <RepeatableFieldGroup
            title="Pipeline Stages"
            description='The detailed academic stages, e.g. "The Bachelor Stage (Years 1–3)".'
            items={form.pipelineStages}
            onChange={(items) => updateField("pipelineStages", items)}
            fields={[
              { key: "title", label: "Stage Title", placeholder: "e.g. The Master Stage (Years 4–6)" },
              { key: "description", label: "Description", type: "textarea", placeholder: "This is where you step out of the classroom..." },
            ]}
            emptyItem={{ title: "", description: "" }}
            addLabel="Add Stage"
          />

          <RepeatableFieldGroup
            title="Specializations Table"
            description="The specialty/career track breakdown table."
            items={form.specializations}
            onChange={(items) => updateField("specializations", items)}
            fields={[
              { key: "category", label: "Category", placeholder: "e.g. Cluster 2: Acute & Hospital Care" },
              { key: "examples", label: "Examples", placeholder: "e.g. General Surgery, Cardiology, Pediatrics" },
              { key: "duration", label: "Duration", placeholder: "e.g. 5 to 6 years" },
              { key: "competitiveness", label: "Competitiveness", placeholder: "e.g. High to Extreme" },
            ]}
            emptyItem={{ category: "", examples: "", duration: "", competitiveness: "" }}
            addLabel="Add Specialization Row"
          />

          <RepeatableFieldGroup
            title="Career Path Steps"
            description='Post-graduation career steps, e.g. "Step 1 - The ANIOS Phase".'
            items={form.careerSteps}
            onChange={(items) => updateField("careerSteps", items)}
            fields={[
              { key: "title", label: "Step Title", placeholder: "e.g. Step 2 - The AIOS Phase (Residency)" },
              { key: "description", label: "Description", type: "textarea", placeholder: "When your resume is strong, you apply for..." },
            ]}
            emptyItem={{ title: "", description: "" }}
            addLabel="Add Career Step"
          />

          <RepeatableFieldGroup
            title="Glossary"
            description="Key terms and their definitions."
            items={form.glossary}
            onChange={(items) => updateField("glossary", items)}
            fields={[
              { key: "term", label: "Term", placeholder: "e.g. Numerus Fixus" },
              { key: "definition", label: "Definition", type: "textarea", placeholder: "A cap on student spots to keep classes from getting overcrowded." },
            ]}
            emptyItem={{ term: "", definition: "" }}
            addLabel="Add Term"
          />

          <RepeatableFieldGroup
            title="Official Links"
            description="External resources students should check out."
            items={form.officialLinks}
            onChange={(items) => updateField("officialLinks", items)}
            fields={[
              { key: "label", label: "Link Label", placeholder: "e.g. Studielink Portal" },
              { key: "url", label: "URL", placeholder: "https://..." },
            ]}
            emptyItem={{ label: "", url: "" }}
            addLabel="Add Link"
          />

          <div className="pt-5 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Publishing
            </p>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Date Published
            </label>
            <input
              type="date"
              required
              value={form.datePublished}
              onChange={(e) => updateField("datePublished", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <p className="text-xs text-gray-400 mt-1">Defaults to today — change it only if you're backdating an older guide.</p>
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
                 <div className="mb-10 -mx-6" style={{ width: "100vw", marginLeft: "calc(-50vw + 50%)" }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <h2 className="text-xl font-bold text-gray-900">Live Preview</h2>
              <span className="text-xs text-gray-400">(matches the full course guide page)</span>
            </div>

            <div className="bg-[#F1E7CC] rounded-3xl p-6 sm:p-8">
              {/* Hero */}
              <div className="rounded-2xl overflow-hidden mb-6">
                {imagePreview ? (
                  <div className="h-40 sm:h-48 relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-40 sm:h-48 flex items-center justify-center bg-gradient-to-br from-[#F8EFD9] to-[#E3D2AE]/60">
                    <span className="text-6xl text-[#BC6C25]/30" style={{ fontFamily: "var(--font-display)" }}>
                      {form.subject ? form.subject.charAt(0) : "?"}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#BC6C25]"></span>
                <p className="text-xs uppercase tracking-[0.2em] text-[#BC6C25]">Course Guide</p>
              </div>
              <h1 className="text-3xl sm:text-4xl text-[#241A12] leading-tight mb-2" style={{ fontFamily: "var(--font-display)" }}>
                {form.subject || "Subject"}{" "}
                <span className="text-[#7A6952] font-normal">in {countryLabels[form.country] || "..."}</span>
              </h1>
              <p className="text-[#7A6952] flex items-center gap-2 mb-8 text-sm">
                {countryFlags[form.country] || ""} {countryLabels[form.country] || "Select a country"}
                {form.popularUniversities.trim() && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-[#E3D2AE]"></span>
                    {form.popularUniversities.split(",").map((u) => u.trim()).filter(Boolean).length} popular universities
                  </>
                )}
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main content */}
                <div className="lg:col-span-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#7A6952] mb-2">Overview</p>
                  <p className="text-[#241A12]/80 mb-6 leading-relaxed whitespace-pre-line text-sm">
                    {form.description || "Description will appear here..."}
                  </p>

                  {form.journeySteps.length > 0 && (
                    <div className="mb-6 pb-6 border-b border-[#E3D2AE]">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#7A6952] mb-3">Quick Summary</p>
                      <div className="space-y-3">
                        {form.journeySteps.map((step, i) => (
                          <div key={i} className="flex gap-3">
                            <span className="shrink-0 w-6 h-6 rounded-full bg-[#BC6C25]/10 text-[#BC6C25] text-xs font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-[#241A12] text-sm">{step.title}</p>
                              {step.description && (
                                <p className="text-sm text-[#241A12]/70">{step.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {form.applicationRules.length > 0 && (
                    <div className="mb-6 pb-6 border-b border-[#E3D2AE]">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#7A6952] mb-3">Application Rules</p>
                      <ul className="space-y-2.5">
                        {form.applicationRules.map((rule, i) => (
                          <li key={i}>
                            <p className="font-semibold text-[#241A12] text-sm">{rule.title}</p>
                            {rule.description && (
                              <p className="text-sm text-[#241A12]/70">{rule.description}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {form.entryPaths.length > 0 && (
                    <div className="mb-6 pb-6 border-b border-[#E3D2AE]">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#7A6952] mb-3">Entry Paths</p>
                      <div className="space-y-4">
                        {form.entryPaths.map((path, i) => (
                          <div key={i}>
                            <p className="font-semibold text-[#241A12] text-sm mb-1.5">{path.title}</p>
                            {(path.points || "").split("\n").map((s) => s.trim()).filter(Boolean).length > 0 && (
                              <ul className="text-sm text-[#241A12]/70 space-y-1">
                                {(path.points || "").split("\n").map((s) => s.trim()).filter(Boolean).map((point, j) => (
                                  <li key={j} className="flex items-start gap-2">
                                    <span className="mt-1.5 w-1 h-1 rounded-full bg-[#BC6C25] shrink-0"></span>
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {form.popularUniversities.trim() && (
                    <div className="mb-6 pb-6 border-b border-[#E3D2AE]">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#7A6952] mb-2.5">Popular Universities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {form.popularUniversities.split(",").map((u) => u.trim()).filter(Boolean).map((uni) => (
                          <span key={uni} className="text-xs font-medium px-3 py-1 rounded-full border border-[#E3D2AE] text-[#241A12] bg-[#F8EFD9]">
                            {uni}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-6 pb-6 border-b border-[#E3D2AE]">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#7A6952] mb-2">Admission Requirements</p>
                    <p className="text-[#241A12]/80 leading-relaxed whitespace-pre-line text-sm">
                      {form.admission || "Admission details will appear here..."}
                    </p>
                  </div>

                  {form.pipelineStages.length > 0 && (
                    <div className="mb-6 pb-6 border-b border-[#E3D2AE]">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#7A6952] mb-3">Your Academic Pipeline</p>
                      <div className="space-y-4">
                        {form.pipelineStages.map((stage, i) => (
                          <div key={i}>
                            <p className="font-semibold text-[#241A12] text-sm mb-1">{stage.title}</p>
                            {stage.description && (
                              <p className="text-sm text-[#241A12]/70">{stage.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {form.languageRequirement.trim() && (
                    <div className="mb-6 border-l-2 border-[#BC6C25] pl-3">
                      <p className="text-[11px] uppercase tracking-[0.15em] text-[#BC6C25] mb-0.5">Note</p>
                      <p className="text-sm text-[#241A12]/80">{form.languageRequirement}</p>
                    </div>
                  )}

                  {form.specializations.length > 0 && (
                    <div className="mb-6 pb-6 border-b border-[#E3D2AE]">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#7A6952] mb-3">Specializations</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-[#E3D2AE] text-left">
                              <th className="py-2 pr-3 uppercase tracking-wide text-[#7A6952] font-semibold">Category</th>
                              <th className="py-2 pr-3 uppercase tracking-wide text-[#7A6952] font-semibold">Examples</th>
                              <th className="py-2 pr-3 uppercase tracking-wide text-[#7A6952] font-semibold">Duration</th>
                              <th className="py-2 uppercase tracking-wide text-[#7A6952] font-semibold">Competitiveness</th>
                            </tr>
                          </thead>
                          <tbody>
                            {form.specializations.map((row, i) => (
                              <tr key={i} className="border-b border-[#E3D2AE]/60 align-top">
                                <td className="py-2 pr-3 font-semibold text-[#241A12]">{row.category}</td>
                                <td className="py-2 pr-3 text-[#241A12]/70">{row.examples}</td>
                                <td className="py-2 pr-3 text-[#241A12]/70">{row.duration}</td>
                                <td className="py-2 text-[#241A12]/70">{row.competitiveness}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {form.careerSteps.length > 0 && (
                    <div className="mb-6 pb-6 border-b border-[#E3D2AE]">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#7A6952] mb-3">Career Path After Graduating</p>
                      <div className="space-y-4">
                        {form.careerSteps.map((step, i) => (
                          <div key={i}>
                            <p className="font-semibold text-[#241A12] text-sm mb-1">{step.title}</p>
                            {step.description && (
                              <p className="text-sm text-[#241A12]/70">{step.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {form.glossary.length > 0 && (
                    <div className="mb-6 pb-6 border-b border-[#E3D2AE]">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#7A6952] mb-3">Glossary</p>
                      <dl className="space-y-2">
                        {form.glossary.map((entry, i) => (
                          <div key={i} className="text-sm">
                            <dt className="font-semibold text-[#241A12] inline">{entry.term}: </dt>
                            <dd className="text-[#241A12]/70 inline">{entry.definition}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}

                  {form.officialLinks.length > 0 && (
                    <div className="mb-6">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#7A6952] mb-2.5">Official Resources</p>
                      <ul className="space-y-1">
                        {form.officialLinks.map((link, i) => (
                          <li key={i} className="text-sm font-medium text-[#BC6C25]">
                            {link.label || "Untitled link"} ↗
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {form.datePublished && (
                    <p className="text-[11px] uppercase tracking-wide text-[#7A6952] pt-1">
                      Published{" "}
                      {new Date(form.datePublished + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1">
                  <div className="bg-[#F8EFD9] border border-[#E3D2AE] rounded-2xl p-5">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-[#BC6C25] mb-1">
                      {countryFlags[form.country] || ""} {countryLabels[form.country] || "..."}
                    </p>
                    <h2 className="text-lg text-[#241A12] mb-3" style={{ fontFamily: "var(--font-display)" }}>
                      Talk to a {form.subject || "Subject"} mentor
                    </h2>
                    <p className="text-xs text-[#241A12]/70 leading-relaxed mb-4">
                      Everything above is a general guide. For questions about your specific situation,
                      message a verified student already on this path.
                    </p>
                    <div className="block text-center bg-[#BC6C25] text-[#F1E7CC] text-xs uppercase tracking-wide px-4 py-2.5 rounded-lg">
                      Find {form.subject || "Subject"} Mentors →
                    </div>
                  </div>
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