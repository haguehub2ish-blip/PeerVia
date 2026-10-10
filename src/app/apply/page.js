"use client";
import { useState, useEffect } from "react";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";
import { courseGuides } from "@/data/courseGuides";
import { getLanguageStyle, languageFlags, getSubjectStyle, getFlag } from "@/data/mentors";
import Link from "next/link";

const fields = ["Medicine", "Mechanical Engineering", "Business", "Computer Science", "Law", "Psychology", "Other"];
const years = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Graduate"];
const countries = ["Netherlands", "United Kingdom", "Other"];
const universityOptions = [
  ...new Set(courseGuides.flatMap((c) => c.popularUniversities)),
].sort();
const languageOptions = Object.keys(languageFlags);

const knownUniversityDomains = [
  "uva.nl",                  // University of Amsterdam
  "vu.nl",                   // VU Amsterdam
  "leidenuniv.nl",           // Leiden
  "uu.nl",                   // Utrecht
  "eur.nl",                  // Erasmus Rotterdam
  "eur.student.nl",
  "tudelft.nl",              // TU Delft
  "tue.nl",                  // TU Eindhoven
  "utwente.nl",              // Twente
  "rug.nl",                  // Groningen
  "ru.nl",                   // Radboud Nijmegen
  "maastrichtuniversity.nl", // Maastricht
  "tilburguniversity.edu",   // Tilburg
  "uvt.nl",                  // Tilburg (older address)
  "wur.nl",                  // Wageningen
  "ou.nl",                   // Open University
  "nyenrode.nl",             // Nyenrode
  "uvh.nl",                  // Humanistic Studies
  "pthu.nl",                 // Protestant Theological University
  "ox.ac.uk",                // Oxford
];

const mentorSteps = [
  {
    numeral: "i.",
    image: "https://yknxdyuanwsuemgtredi.supabase.co/storage/v1/object/public/mentor-page-images/step-1-message.jpg",
    title: "Answer real questions",
    text: "A student posts a question on the community page, and you answer it in your own words. No scripts, no commitment — every relationship begins here.",
  },
  {
    numeral: "ii.",
    image: "https://yknxdyuanwsuemgtredi.supabase.co/storage/v1/object/public/mentor-page-images/step-2-profile.jpg",
    title: "Share your story",
    text: "Your profile shows your journey — course, university, and what you wish you knew. Setting it up is the easy part; students want to hear the personal details.",
  },
  {
    numeral: "iii.",
    image: "https://yknxdyuanwsuemgtredi.supabase.co/storage/v1/object/public/mentor-page-images/step-3-call.jpg",
    title: "Take a call, if you want to",
    text: "Talk course choices, campus life, and what success actually looks like. Walk a student through their options — whatever they need, you've lived it.",
  },
  {
    numeral: "iv.",
    image: "https://yknxdyuanwsuemgtredi.supabase.co/storage/v1/object/public/mentor-page-images/step-4-portfolio.jpg",
    title: "Build your portfolio",
    text: "Every answer you write becomes part of your public mentor profile, rated by real students — something you can point to, beyond just volunteering.",
  },
];

function MessageIllustration() {
  return (
    <svg viewBox="0 0 200 160" className="w-40 h-32">
      <rect x="20" y="20" width="120" height="80" rx="16" fill="#ffffff" fillOpacity="0.95" />
      <path d="M40 100 L40 120 L65 100 Z" fill="#ffffff" fillOpacity="0.95" />
      <circle cx="55" cy="60" r="6" fill="var(--color-primary)" />
      <circle cx="80" cy="60" r="6" fill="var(--color-primary)" />
      <circle cx="105" cy="60" r="6" fill="var(--color-primary)" />
      <rect x="90" y="30" width="90" height="60" rx="14" fill="var(--color-primary)" />
      <path d="M170 90 L170 108 L148 90 Z" fill="var(--color-primary)" />
      <rect x="105" y="48" width="60" height="6" rx="3" fill="#ffffff" fillOpacity="0.8" />
      <rect x="105" y="60" width="40" height="6" rx="3" fill="#ffffff" fillOpacity="0.8" />
    </svg>
  );
}

function ProfileIllustration() {
  return (
    <svg viewBox="0 0 200 160" className="w-40 h-32">
      <rect x="40" y="20" width="120" height="120" rx="12" fill="#ffffff" fillOpacity="0.95" />
      <circle cx="100" cy="62" r="22" fill="var(--color-primary)" />
      <path d="M65 118c0-19 16-30 35-30s35 11 35 30" fill="var(--color-primary)" fillOpacity="0.5" />
      <rect x="65" y="10" width="70" height="14" rx="4" fill="var(--color-primary)" />
      <rect x="80" y="0" width="40" height="16" fill="var(--color-primary)" />
    </svg>
  );
}

function CallIllustration() {
  return (
    <svg viewBox="0 0 200 160" className="w-40 h-32">
      <rect x="55" y="15" width="90" height="130" rx="16" fill="#ffffff" fillOpacity="0.95" />
      <rect x="65" y="35" width="70" height="80" rx="8" fill="var(--color-primary)" />
      <circle cx="100" cy="130" r="6" fill="var(--color-primary)" fillOpacity="0.4" />
      <path d="M85 65a15 15 0 0 1 30 0v20a15 15 0 0 1-30 0z" fill="#ffffff" fillOpacity="0.9" />
      <circle cx="100" cy="60" r="10" fill="#ffffff" fillOpacity="0.9" />
    </svg>
  );
}

function PortfolioIllustration() {
  return (
    <svg viewBox="0 0 200 160" className="w-40 h-32">
      <rect x="30" y="30" width="140" height="100" rx="14" fill="#ffffff" fillOpacity="0.95" />
      <path
        d="M100 55l7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z"
        fill="var(--color-primary)"
      />
      <rect x="50" y="100" width="100" height="8" rx="4" fill="var(--color-primary)" fillOpacity="0.5" />
      <rect x="50" y="115" width="70" height="8" rx="4" fill="var(--color-primary)" fillOpacity="0.3" />
    </svg>
  );
}

const APPLY_HERO_PHOTO_URL = "/images/PV_ApplyPage.jpg"; // swap to a real photo when you have one for this page

function PhotoBlock({ src, alt = "", className = "", tint = 55, opacity = 100 }) {
  if (!src) return null;
  return (
    <div className={`overflow-hidden ${className}`} style={{ opacity: opacity / 100 }}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover grayscale contrast-[1.08]"
      />
      <div className="absolute inset-0 bg-primary mix-blend-multiply" style={{ opacity: tint / 100 }} />
    </div>
  );
}

const honestQuestions = [
  {
    question: "Is this legit — and how am I verified?",
    answer:
      "Yes. Every mentor application is manually reviewed by our team before approval — we check your university email, your course, and your application answers. Once approved, your profile carries a verified badge so students know they're talking to a real, vetted university student.",
  },
  {
    question: "How much time does it really take?",
    answer:
      "As much or as little as you want. Answering a community question takes a few minutes whenever it suits you — there's no schedule to keep. 1-on-1 calls are entirely optional and only happen if you choose to accept a booking.",
  },
  {
    question: "Who would I actually be helping?",
    answer:
      "High schoolers who are trying to figure out what they want to study or where — the same decisions you had to make, usually with far less honest information than they deserve. You'll answer their real questions about your course, university, and what the day-to-day is actually like.",
  },
];

export default function Apply() {
  const [showForm, setShowForm] = useState(false);
  const [openQuestions, setOpenQuestions] = useState(new Set());

  function toggleQuestion(index) {
    setOpenQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }
  const [teamMentors, setTeamMentors] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);

  const [checkingStatus, setCheckingStatus] = useState(true);
  const [existingApplication, setExistingApplication] = useState(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    university: "",
    year: "",
    field: "",
    course: "",
    country: "",
    why: "",
    support_guidance: "",
    extracurriculars: "",
    final_grade: "",
    linkedin: "",
        backup_email: "",
  });
  const [selectedLanguages, setSelectedLanguages] = useState(["English"]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [otherUniversity, setOtherUniversity] = useState(false);
  const [otherField, setOtherField] = useState(false);
  const [otherCountry, setOtherCountry] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [guideOpened, setGuideOpened] = useState(false);
  const [policyOpened, setPolicyOpened] = useState(false);
  const [agreeGuide, setAgreeGuide] = useState(false);
  const [agreePolicy, setAgreePolicy] = useState(false);

  const [allMentors, setAllMentors] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    async function fetchTeam() {
      const { data } = await supabase
        .from("mentorss")
        .select("*")
        .order("rating", { ascending: false })
        .limit(6);
      if (data) setTeamMentors(data);
      setTeamLoading(false);
    }
    fetchTeam();

    async function fetchAllMentors() {
      const { data } = await supabase.from("mentorss").select("*");
      if (data) setAllMentors(data);
      setStatsLoading(false);
    }
    fetchAllMentors();
  }, []);

  const verifiedMentorsCount = allMentors.filter((m) => m.verified).length;
  const schoolsCount = new Set(allMentors.map((m) => m.school)).size;
  const countriesCount = new Set(allMentors.map((m) => m.country)).size;
  const ratedMentors = allMentors.filter((m) => m.rating > 0);
  const avgRating =
    ratedMentors.length > 0
      ? (ratedMentors.reduce((sum, m) => sum + m.rating, 0) / ratedMentors.length).toFixed(1)
      : "—";

  const applyStats = [
    { value: verifiedMentorsCount, label: "Current Mentors" },
    { value: schoolsCount, label: "Universities" },
    { value: countriesCount, label: "Countries" },
    { value: `${avgRating}★`, label: "Avg. Mentor Rating" },
  ];

  useEffect(() => {
    async function checkExistingApplication() {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user;

      if (!currentUser?.email) {
        setCheckingStatus(false);
        return;
      }

      setForm((prev) => ({
        ...prev,
        email: currentUser.email,
        first_name: currentUser.user_metadata?.name?.split(" ")[0] || prev.first_name,
        last_name: currentUser.user_metadata?.name?.split(" ").slice(1).join(" ") || prev.last_name,
      }));

      const { data, error } = await supabase
        .from("mentor_applications")
        .select("*")
        .eq("email", currentUser.email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Application status check failed:", error);
      }

      if (data) {
        setExistingApplication(data);
        setShowForm(false);
      }
      setCheckingStatus(false);
    }
    checkExistingApplication();
  }, []);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }

    setError(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (selectedLanguages.length === 0) {
      setError("Please select at least one language.");
      return;
    }
    if (!photoFile) {
      setError("Please upload a profile photo.");
      return;
          if (!agreeGuide || !agreePolicy) {
      setError("Please open and accept both the Ambassador Guide and the Privacy Policy.");
      return;
    }
    }

        if (universityOptions.includes(form.university) && form.year !== "Graduate") {
      const domain = form.email.split("@")[1]?.toLowerCase() || "";
      const ok = knownUniversityDomains.some((d) => domain === d || domain.endsWith("." + d));
      if (!ok) {
        setError("That doesn't look like a university email address we recognise. Please check it for typos, for example @student.eur.nl rather than @eur.student.nl. If you're sure it's right, write to info.peervia@gmail.com.");
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    setPhotoUploading(true);

    const fileExt = photoFile.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("mentor-photos")
      .upload(fileName, photoFile);

    setPhotoUploading(false);

    if (uploadError) {
      setError("Photo upload failed: " + uploadError.message);
      setSubmitting(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("mentor-photos")
      .getPublicUrl(fileName);

    const { error } = await supabase.from("mentor_applications").insert([
      {
        ...form,
        languages: selectedLanguages.join(","),
        photo_url: urlData.publicUrl,
        status: "pending",
                terms_accepted_at: new Date().toISOString(),
      },
    ]);

    setSubmitting(false);

    if (error) {
      setError(error.message);
    } else {
      setSubmitted(true);

      fetch("/api/notify-new-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.first_name,
          lastName: form.last_name,
          email: form.email,
          university: form.university,
          field: form.field,
          course: form.course,
          country: form.country,
        }),
      }).catch((err) => console.error("Admin notification error:", err));
    }
  }

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-cream">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-24 text-center text-gray-500">
          Checking Your Application Status...
        </div>
      </div>
    );
  }

  if (existingApplication?.status === "pending") {
    return (
      <div className="min-h-screen bg-cream">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Your Application Is Pending Approval
          </h1>
          <p className="text-gray-600">
            Thank you for applying! We review every application and aim to get back within 48 hours.
          </p>
        </div>
      </div>
    );
  }

  if (existingApplication?.status === "rejected") {
    return (
      <div className="min-h-screen bg-cream">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Your Application Wasn't Approved This Time
          </h1>
          <p className="text-gray-600 mb-6">
            Thank you for your interest in becoming a PeerVia mentor. Unfortunately, we couldn't
            approve your application at this time.
          </p>
          <button
            onClick={() => setExistingApplication(null)}
            className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            Apply Again
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-cream">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Application Submitted
          </h1>
          <p className="text-gray-600">
            Thank you for applying! We review every application and aim to get back within 48 hours.
          </p>
        </div>
      </div>
    );
  }

  // ===================== FORM VIEW =====================
  if (showForm) {
    return (
      <div className="min-h-screen bg-cream">
        <Navbar />
        <div className="max-w-3xl mx-auto px-6 py-12">
          <button
            onClick={() => setShowForm(false)}
            className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition mb-4 flex items-center gap-1"
          >
            ← Back
          </button>

          <h1 className="text-3xl md:text-4xl font-extrabold text-primary mb-2">
            Apply To Be A PeerVia Mentor
          </h1>
          <p className="text-ink mb-8">
            It takes just 5 minutes of your time. We review every application and aim to get back within 48 hours.
          </p>

          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Profile Photo <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-4">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-20 h-20 rounded-full object-cover border border-gray-300"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs text-center">
                    No Photo
                  </div>
                )}
                <label className="cursor-pointer bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 transition">
                  {photoFile ? "Change Photo" : "Upload Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                A Clear, Recent Photo Of Yourself. Max 5MB.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">First name</label>
                <input
                  required
                  value={form.first_name}
                  onChange={(e) => updateField("first_name", e.target.value)}
                  placeholder="Emma"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Last name</label>
                <input
                  required
                  value={form.last_name}
                  onChange={(e) => updateField("last_name", e.target.value)}
                  placeholder="Johnson"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">University Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="e.emma@student.uva.nl"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
                            <p className="text-xs text-muted mt-1.5">
                Use an address you check regularly. Some university inboxes block outside email, so if you don't hear from us within a few days, check your spam folder or write to info.peervia@gmail.com.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Backup Email</label>
              <input
                type="email"

                value={form.backup_email}
                onChange={(e) => updateField("backup_email", e.target.value)}
                placeholder="you@gmail.com"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <p className="text-xs text-muted mt-1.5">
                A personal address (Gmail, Outlook, iCloud). We only use it if an email to your university address doesn't get through.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">University</label>
                <select
                  required={!otherUniversity}
                  value={otherUniversity ? "Other" : form.university}
                  onChange={(e) => {
                    if (e.target.value === "Other") {
                      setOtherUniversity(true);
                      updateField("university", "");
                    } else {
                      setOtherUniversity(false);
                      updateField("university", e.target.value);
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                >
                  <option value="">Select University</option>
                  {universityOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
                {otherUniversity && (
                  <input
                    required
                    value={form.university}
                    onChange={(e) => updateField("university", e.target.value)}
                    placeholder="Enter your University"
                    className="mt-2 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Year of Study</label>
                <select
                  required
                  value={form.year}
                  onChange={(e) => updateField("year", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                >
                  <option value="">Select Year</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Career field</label>
              <select
                required={!otherField}
                value={otherField ? "Other" : form.field}
                onChange={(e) => {
                  if (e.target.value === "Other") {
                    setOtherField(true);
                    updateField("field", "");
                  } else {
                    setOtherField(false);
                    updateField("field", e.target.value);
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
              >
                <option value="">Select Field</option>
                {fields.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              {otherField && (
                <input
                  required
                  value={form.field}
                  onChange={(e) => updateField("field", e.target.value)}
                  placeholder="Enter your Career Field"
                  className="mt-2 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Your Course At University
              </label>
              <input
                required
                value={form.course}
                onChange={(e) => updateField("course", e.target.value)}
                placeholder="e.g. Biomedical Sciences, LLB Law, Mechanical Engineering (BEng)"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                The exact name of the degree you study. This is shown on your public profile.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Country focus</label>
              <select
                required={!otherCountry}
                value={otherCountry ? "Other" : form.country}
                onChange={(e) => {
                  if (e.target.value === "Other") {
                    setOtherCountry(true);
                    updateField("country", "");
                  } else {
                    setOtherCountry(false);
                    updateField("country", e.target.value);
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
              >
                <option value="">Select Country</option>
                {countries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {otherCountry && (
                <input
                  required
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  placeholder="Enter your Country"
                  className="mt-2 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Languages you speak <span className="text-gray-400 font-normal">(select at least one)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {languageOptions.map((lang) => {
                  const style = getLanguageStyle(lang);
                  const isSelected = selectedLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() =>
                        setSelectedLanguages((prev) =>
                          isSelected ? prev.filter((l) => l !== lang) : [...prev, lang]
                        )
                      }
                      className={`text-xs font-semibold px-3 py-1 rounded-full transition ${style.color} ${
                        isSelected ? "ring-2 ring-gray-900" : "hover:opacity-80"
                      }`}
                    >
                      {style.icon} {lang}
                    </button>
                  );
                })}
              </div>
              {selectedLanguages.length === 0 && (
                <p className="text-red-600 text-xs mt-1.5">Select at least one language.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Why do you want to mentor? <span className="text-gray-400 font-normal">(2–3 sentences)</span>
              </label>
              <textarea
                required
                rows={3}
                value={form.why}
                onChange={(e) => updateField("why", e.target.value)}
                placeholder="What do you wish you knew before starting your degree? What would you tell your 16-year-old self?"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                How Can You Support And Guide The Students Through Their Journey?
              </label>
              <textarea
                required
                rows={3}
                value={form.support_guidance}
                onChange={(e) => updateField("support_guidance", e.target.value)}
                placeholder="What topics, questions, or experiences could you help a student with?"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Extracurriculars
              </label>
              <textarea
                required
                rows={2}
                value={form.extracurriculars}
                onChange={(e) => updateField("extracurriculars", e.target.value)}
                placeholder="Clubs, sports, volunteering, leadership roles, or other activities you were involved in."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Final High School Grade
              </label>
              <input
                required
                value={form.final_grade}
                onChange={(e) => updateField("final_grade", e.target.value)}
                placeholder="e.g. A-Level: AAB, IB: 38, VWO: 7.8 Average"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                LinkedIn profile <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                value={form.linkedin}
                onChange={(e) => updateField("linkedin", e.target.value)}
                placeholder="linkedin.com/in/yourname"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>

            {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
            <div className="border border-gray-200 rounded-xl p-4 space-y-4 bg-gray-50">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Before you submit <span className="text-red-500">*</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Please open and read both documents. The tick boxes unlock once you have opened each one.
                </p>
              </div>

              <div className="space-y-2">
                <a
                  href="/documents/PeerVia-Ambassador-Guide.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setGuideOpened(true)}
                  onAuxClick={() => setGuideOpened(true)}
                  className="text-sm font-semibold text-primary underline underline-offset-4"
                >
                  Ambassador Guide and Rules (PDF) ↗
                </a>
                <label className={`flex items-start gap-2 text-sm ${guideOpened ? "text-gray-800" : "text-gray-400"}`}>
                  <input
                    type="checkbox"
                    disabled={!guideOpened}
                    checked={agreeGuide}
                    onChange={(e) => setAgreeGuide(e.target.checked)}
                    className="mt-1"
                  />
                  I have read and agree to follow the Ambassador Guide and Rules.
                </label>
              </div>

              <div className="space-y-2">
                <a
                  href="/documents/PeerVia-Ambassador-Privacy-Policy.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setPolicyOpened(true)}
                  onAuxClick={() => setPolicyOpened(true)}
                  className="text-sm font-semibold text-primary underline underline-offset-4"
                >
                  Ambassador Privacy Policy and Liability Disclaimer (PDF) ↗
                </a>
                <label className={`flex items-start gap-2 text-sm ${policyOpened ? "text-gray-800" : "text-gray-400"}`}>
                  <input
                    type="checkbox"
                    disabled={!policyOpened}
                    checked={agreePolicy}
                    onChange={(e) => setAgreePolicy(e.target.checked)}
                    className="mt-1"
                  />
                  I have read and accept the Privacy Policy and Liability Disclaimer, and I confirm I am at least 18.
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition disabled:opacity-50"
            >
              {photoUploading ? "Uploading Photo..." : submitting ? "Submitting..." : "Submit Application →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ===================== LANDING VIEW =====================
  return (
    <div className="min-h-screen bg-cream">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-16 pb-14 text-center bg-ink">
        {APPLY_HERO_PHOTO_URL && (
          <>
            <PhotoBlock src={APPLY_HERO_PHOTO_URL} className="absolute inset-0 w-full h-full" tint={70} />
            <div className="absolute inset-0 bg-ink/60" />
          </>
        )}
        <div className="max-w-2xl mx-auto relative">
          <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-4">
            Become A Mentor
          </p>
          <h1 className="font-display text-3xl md:text-5xl text-white leading-tight mb-5">
            You wished someone told you the truth.{" "}
            <span className="italic text-primary">Now you can be that person.</span>
          </h1>
          <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
            Join a community of university students helping high schoolers make honest, informed
            decisions about their future — completely free, on your own time.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-block font-label text-sm tracking-[0.1em] uppercase bg-primary text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary-dark transition"
          >
            Become A Mentor →
          </button>
          <p className="font-label text-[11px] tracking-[0.05em] uppercase text-white/50 mt-4">
            Takes 5 Minutes · Reviewed Within 48 Hours
          </p>
        </div>
      </section>
      {/* Stats strip */}
      <section className="px-6 py-8 border-y border-border bg-background">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {statsLoading
            ? [...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-7 w-12 bg-surface rounded mx-auto mb-2"></div>
                  <div className="h-3 w-20 bg-surface rounded mx-auto"></div>
                </div>
              ))
            : applyStats.map((stat) => (
                <div key={stat.label}>
                  <p className="font-display text-3xl text-primary">{stat.value}</p>
                  <p className="font-label text-[10px] tracking-[0.1em] uppercase text-muted mt-1">
                    {stat.label}
                  </p>
                </div>
              ))}
        </div>
      </section>
      {/* Why become a mentor */}
      <section className="px-6 py-16 border-y border-border bg-surface">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-xl mb-12">
            <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-3">
              i.
            </p>
            <h2 className="font-display text-3xl md:text-4xl text-ink mb-3">
              Here's what you <span className="italic text-primary">actually do?</span>
            </h2>
            <p className="text-muted">
              It starts with a message, and only ever goes as far as you want it to.
            </p>
          </div>

          <div className="space-y-4">
            {mentorSteps.map((step, i) => {
              const imageFirst = i % 2 !== 0;

              const imageBlock = (
                <div className="relative h-56 md:h-64 md:w-full">
                  {step.image ? (
                    <img
                      src={step.image}
                      alt={step.title}
                      className="w-full h-full object-cover block"
                    />
                  ) : (
                    <div className="w-full h-full bg-ink" />
                  )}
                </div>
              );

              const textBlock = (
                <div className="p-8 md:p-10 h-56 md:h-64 flex flex-col justify-center">
                  <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-2">
                    {step.numeral}
                  </p>
                  <h3 className="font-display text-xl text-ink mb-2 leading-snug">
                    <span className="italic text-primary">{step.title}</span>
                  </h3>
                  <p className="text-muted text-sm leading-relaxed line-clamp-4">{step.text}</p>
                </div>
              );

              return (
                <div
                  key={step.title}
                  className="flex flex-col md:flex-row border border-border rounded-2xl overflow-hidden bg-background"
                >
                  {imageFirst ? (
                    <>
                      <div className="md:w-2/5">{textBlock}</div>
                      <div className="md:w-3/5">{imageBlock}</div>
                    </>
                  ) : (
                    <>
                      <div className="md:w-3/5">{imageBlock}</div>
                      <div className="md:w-2/5">{textBlock}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Meet the team */}
      <section className="px-6 py-16 bg-background">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12">
            <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-3">
              The Team
            </p>
            <h2 className="font-display text-3xl text-ink mb-3">
              Meet the mentors <span className="italic text-primary">you'd be joining</span>
            </h2>
            <p className="text-muted">
              A growing group of verified university students across the Netherlands and UK.
            </p>
          </div>

          {teamLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-surface border border-border rounded-2xl aspect-[3/4] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {teamMentors.map((mentor) => (
                <Link
                  key={mentor.id}
                  href={`/mentors/${mentor.id}`}
                  className="block bg-surface border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition"
                >
                  {mentor.photo_url ? (
                    <img
                      src={mentor.photo_url}
                      alt={mentor.name}
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-primary/10 text-primary flex items-center justify-center text-3xl font-display">
                      {mentor.initials}
                    </div>
                  )}
                  <div className="p-3">
                    <p className="font-display text-ink text-sm leading-tight truncate">{mentor.name}</p>
                    <p className="font-label text-[10px] tracking-[0.05em] uppercase text-muted truncate">
                      {mentor.school} · {mentor.course || mentor.subject}
                    </p>
                    {mentor.bio && (
                      <p className="text-muted text-xs italic mt-1.5 line-clamp-2">{mentor.bio}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <a href="/mentors" className="font-label text-xs tracking-[0.1em] uppercase text-ink underline underline-offset-4 hover:text-primary transition">
              See All Mentors →
            </a>
          </div>
        </div>
      </section>

      {/* Honest questions */}
      <section className="px-6 py-16 bg-surface border-t border-border">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-3">
              Before You Apply
            </p>
            <h2 className="font-display text-3xl text-ink">
              The honest <span className="italic text-primary">questions</span>
            </h2>
          </div>

          <div className="space-y-3">
            {honestQuestions.map((item, i) => {
              const isOpen = openQuestions.has(i);
              return (
                <div
                  key={item.question}
                  className="bg-background border border-border rounded-2xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleQuestion(i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
                  >
                    <span className="font-display text-ink text-lg">{item.question}</span>
                    <span
                      className={`text-primary text-xl shrink-0 transition-transform ${isOpen ? "rotate-45" : ""}`}
                    >
                      +
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-muted text-sm leading-relaxed">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-6 py-20 text-center border-t border-border bg-background">
        <div className="max-w-xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-ink mb-6">
            Ready to be the mentor <span className="italic text-primary">you never had?</span>
          </h2>
          <button
            onClick={() => setShowForm(true)}
            className="inline-block font-label text-sm tracking-[0.1em] uppercase bg-primary text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary-dark transition"
          >
            Become A Mentor →
          </button>
        </div>
      </section>
    </div>
  );
}