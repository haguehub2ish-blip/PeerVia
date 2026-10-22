"use client";
import { useState, useEffect } from "react";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";
import { subjectStyles, countryFlags, languageFlags, getLanguageStyle } from "@/data/mentors";
import MentorCalendarEditor from "@/Components/MentorCalendarEditor";
import MultiSelect from "@/Components/MultiSelect";
import GradeInput from "@/Components/GradeInput";
import MentorGuruMessage from "@/Components/MentorGuruMessage";
import MentorWelcomeTour from "@/Components/MentorWelcomeTour";

function PencilIcon({ className = "w-3 h-3" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function ChevronIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function StarIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.5 15 9l7 .9-5.1 4.8L18.2 21 12 17.3 5.8 21l1.3-6.3L2 9.9 9 9z" />
    </svg>
  );
}

// --- Dashboard card that can be collapsed by clicking its title ---
function CollapsibleCard({ id, dataTour, eyebrow, title, description, badge, defaultOpen = true, className = "mb-6", children }) {
  const [open, setOpen] = useState(defaultOpen);

  // Opens by itself if the page is visited with #id in the link (e.g. #call-requests)
  useEffect(() => {
    if (id && typeof window !== "undefined" && window.location.hash === `#${id}`) setOpen(true);
  }, [id]);

  return (
    <div
      id={id}
      data-tour={dataTour}
      className={`bg-surface border border-border rounded-lg p-6 shadow-sm ${className}`}
    >
      <SectionEyebrow>{eyebrow}</SectionEyebrow>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 flex-wrap text-left"
      >
        <ChevronIcon className={`w-4 h-4 text-primary transition-transform ${open ? "rotate-90" : ""}`} />
        <span className="font-display text-xl text-ink">{title}</span>
        {badge && (
          <span className="font-label text-[10px] tracking-[0.08em] uppercase px-3 py-1 rounded-full bg-primary/10 text-primary">
            {badge}
          </span>
        )}
      </button>
      {open && (
        <>
          {description && <p className="text-sm text-muted mt-2 mb-6">{description}</p>}
          {children}
        </>
      )}
    </div>
  );
}

// --- Standard on/off settings switch, used in place of a plain checkbox ---
function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 text-sm text-ink cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
          checked ? "bg-primary border-primary" : "bg-border border-border"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-1"
          }`}
        />
      </button>
      {label}
    </label>
  );
}

// --- Mono-label eyebrow used above each dashboard section, matching the site's
// homepage typography system (font-label + tracked uppercase) ---
function SectionEyebrow({ children }) {
  return (
    <p className="font-label text-[10px] tracking-[0.15em] uppercase text-primary mb-2">
      {children}
    </p>
  );
}

export default function MentorDashboard() {
  const [user, setUser] = useState(null);
  const [mentorProfile, setMentorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notAuthorized, setNotAuthorized] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [bio, setBio] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [age, setAge] = useState("");
  const [happyToChat, setHappyToChat] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [available, setAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [calendarExpanded, setCalendarExpanded] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const [subject, setSubject] = useState("");
  const [country, setCountry] = useState("");
  const [languages, setLanguages] = useState([]);
    const [personalEmail, setPersonalEmail] = useState("");
  const [showPersonalEmail, setShowPersonalEmail] = useState(false);
  const [extracurriculars, setExtracurriculars] = useState("");
  const [showExtracurriculars, setShowExtracurriculars] = useState(true);
  const [finalGrade, setFinalGrade] = useState("");
  const [bachelorDegree, setBachelorDegree] = useState("");
  const [masterDegree, setMasterDegree] = useState("");
  const [showDegrees, setShowDegrees] = useState(true);
  const [showFinalGrade, setShowFinalGrade] = useState(true);
    const [supportGuidance, setSupportGuidance] = useState("");
  const [showSupportGuidance, setShowSupportGuidance] = useState(true);

    const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [unansweredQuestions, setUnansweredQuestions] = useState([]);

  const [callRequests, setCallRequests] = useState([]);
  const [callRequestsLoaded, setCallRequestsLoaded] = useState(false);
  const [callRequestsError, setCallRequestsError] = useState("");

  async function callRequestsFetch(method, body) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    const res = await fetch("/api/mentor/call-requests", {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Something went wrong");
    return json;
  }

  async function loadCallRequests() {
    try {
      const json = await callRequestsFetch("GET");
      setCallRequests(json.requests || []);
      setCallRequestsError("");
    } catch (err) {
      setCallRequestsError(err.message);
    }
    setCallRequestsLoaded(true);
  }

  async function toggleCallRequest(request) {
    const nextStatus = request.status === "done" ? "new" : "done";
    // Update the screen straight away, then save
    setCallRequests((list) => list.map((r) => (r.id === request.id ? { ...r, status: nextStatus } : r)));
    try {
      await callRequestsFetch("PATCH", { id: request.id, status: nextStatus });
    } catch {
      setCallRequests((list) => list.map((r) => (r.id === request.id ? { ...r, status: request.status } : r)));
    }
  }

  useEffect(() => {
    if (user) loadCallRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  const [answerDrafts, setAnswerDrafts] = useState({});
  const [submittingId, setSubmittingId] = useState(null);
    const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    async function load() {
      let { data: userData } = await supabase.auth.getUser();
      let currentUser = userData?.user || null;

      // If a mentor opened the dashboard while signed into their verified
      // backup/personal account, ask the server whether it maps to an approved
      // mentor account. The server only returns a one-time sign-in token for a
      // verified, matching mentor account.
      if (currentUser && currentUser.user_metadata?.role !== "mentor") {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        if (accessToken) {
          try {
            const response = await fetch("/api/mentor-switch", {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}` },
              cache: "no-store",
            });
            const result = await response.json().catch(() => ({}));

            if (response.ok && result.switch && result.token_hash) {
              const { error: switchError } = await supabase.auth.verifyOtp({
                token_hash: result.token_hash,
                type: result.type || "magiclink",
              });

              if (!switchError) {
                const { data: refreshedUserData } = await supabase.auth.getUser();
                currentUser = refreshedUserData?.user || null;
              }
            }
          } catch (error) {
            // If switching is unavailable, show the normal access-denied state.
            console.error("Could not resolve mentor account:", error);
          }
        }
      }

      if (!currentUser || currentUser.user_metadata?.role !== "mentor") {
        setNotAuthorized(true);
        setLoading(false);
        return;
      }

      setUser(currentUser);
            if (!currentUser.user_metadata?.welcome_tour_seen) setShowTour(true);
      setPersonalEmail(currentUser.user_metadata?.personal_email || "");
      setEmailNotifications(currentUser.user_metadata?.mentorEmailNotifications !== false);

      const { data: profile } = await supabase
        .from("mentorss")
        .select("*")
        .eq("user_id", currentUser.id)
        .single();

      if (profile) {
        setMentorProfile(profile);
        if (profile.activated === false) {
          const { data: sess } = await supabase.auth.getSession();
          fetch("/api/mentor-activate", {
            method: "POST",
            headers: { Authorization: `Bearer ${sess?.session?.access_token}` },
          }).catch(() => {});
        }
        setBio(profile.bio || "");
        setAboutMe(profile.about_me || "");
        setAge(profile.age ?? "");
        setHappyToChat(profile.happy_to_chat_about || "");
        setLinkedin(profile.linkedin || "");
        setAvailable(profile.available ?? true);
        setCalendarVisible(profile.calendar_visible ?? false);
        setSubject(profile.subject || "");
        setCountry(profile.country || "");
                setSupportGuidance(profile.support_guidance || "");
        setShowSupportGuidance(profile.show_support_guidance ?? true);
                setExtracurriculars(profile.extracurriculars || "");
        setFinalGrade(profile.final_grade || "");
        setBachelorDegree(profile.bachelor_degree || "");
        setMasterDegree(profile.master_degree || "");
        setShowDegrees(profile.show_degrees ?? true);
        setShowPersonalEmail(profile.show_personal_email ?? false);
        setShowExtracurriculars(profile.show_extracurriculars ?? true);
        setShowFinalGrade(profile.show_final_grade ?? true);
        setLanguages(
          typeof profile.languages === "string"
            ? profile.languages.split(",").map((l) => l.trim()).filter(Boolean)
            : Array.isArray(profile.languages)
            ? profile.languages
            : []
        );
      }

      const [{ data: userQuestions }, { data: answers }] = await Promise.all([
        supabase
          .from("user_questions")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("question_answers").select("user_question_id"),
      ]);

      const answeredIds = new Set((answers || []).map((a) => a.user_question_id));
      setUnansweredQuestions((userQuestions || []).filter((q) => !answeredIds.has(q.id)));

      setLoading(false);
    }
    load();
  }, []);

  function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSaveError("Please upload an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveError("Image must be under 5MB.");
      return;
    }

    setSaveError("");
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleUploadPhoto() {
    if (!photoFile) return;

    setPhotoUploading(true);
    setSaveError("");

    const fileExt = photoFile.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("mentor-photos")
      .upload(fileName, photoFile);

    if (uploadError) {
      setSaveError("Photo upload failed: " + uploadError.message);
      setPhotoUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("mentor-photos")
      .getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from("mentorss")
      .update({ photo_url: urlData.publicUrl })
      .eq("user_id", user.id);

    setPhotoUploading(false);

    if (updateError) {
      setSaveError(updateError.message);
    } else {
      setMentorProfile((prev) => (prev ? { ...prev, photo_url: urlData.publicUrl } : prev));
      setPhotoFile(null);
      setPhotoPreview(null);
    }
  }

  async function handleToggleEmailNotifications(value) {
    setEmailNotifications(value); // switch updates immediately
    const { data, error } = await supabase.auth.updateUser({
      data: { mentorEmailNotifications: value },
    });
    if (error) {
      setEmailNotifications(!value); // put it back if saving failed
      return;
    }
    if (data?.user) setUser(data.user);
  }

  async function handleCloseTour() {
    setShowTour(false);
    if (!user?.user_metadata?.welcome_tour_seen) {
      const { data } = await supabase.auth.updateUser({ data: { welcome_tour_seen: true } });
      if (data?.user) setUser(data.user);
    }
  }

   async function handleSaveProfile() {
    setSaving(true);
    setSaved(false);
    setSaveError("");

    if (linkedin && !/^https?:\/\/.+/i.test(linkedin.trim())) {
      setSaving(false);
      setSaveError("LinkedIn link should start with http:// or https://");
      return;
    }

    if (age !== "" && (Number(age) < 16 || Number(age) > 99)) {
      setSaving(false);
      setSaveError("Age should be between 16 and 99.");
      return;
    }

    const cleanEmail = personalEmail.trim();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setSaving(false);
      setSaveError("Please enter a valid personal email address.");
      return;
    }
    if (showPersonalEmail && !cleanEmail) {
      setSaving(false);
      setSaveError("Add a personal email before showing it on your profile.");
      return;
    }

    const { error } = await supabase
      .from("mentorss")
      .update({
        bio,
        about_me: aboutMe,
        age: age === "" ? null : Number(age),
        happy_to_chat_about: happyToChat,
        linkedin: linkedin.trim(),
        available,
        calendar_visible: calendarVisible,
        subject,
        country,
        languages,
        extracurriculars: extracurriculars.trim(),
        final_grade: finalGrade.trim(),
        bachelor_degree: bachelorDegree.trim() || null,
        master_degree: masterDegree.trim() || null,
        show_degrees: showDegrees,
                support_guidance: supportGuidance.trim(),
        show_support_guidance: showSupportGuidance,
        show_extracurriculars: showExtracurriculars,
        show_final_grade: showFinalGrade,
        show_personal_email: showPersonalEmail,
        public_email: showPersonalEmail ? cleanEmail : null,
      })
      .eq("user_id", user.id);

    if (error) {
      setSaving(false);
      setSaveError(error.message);
      return;
    }

    // Private copy of the personal email lives on the login account
    if (cleanEmail !== (user.user_metadata?.personal_email || "")) {
      const { data: updated, error: metaError } = await supabase.auth.updateUser({
        data: { personal_email: cleanEmail },
      });
      if (metaError) {
        setSaving(false);
        setSaveError(metaError.message);
        return;
      }
      if (updated?.user) setUser(updated.user);
    }

    setSaving(false);
    setMentorProfile((prev) => (prev ? { ...prev, subject, country, languages } : prev));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleSubmitAnswer(userQuestionId) {
    const answerText = (answerDrafts[userQuestionId] || "").trim();
    if (!answerText) return;

    setSubmittingId(userQuestionId);

    const mentorName = mentorProfile?.name || user.user_metadata?.name || "Mentor";

    const { error } = await supabase.from("question_answers").insert({
      user_question_id: userQuestionId,
      mentor_id: user.id,
      mentor_name: mentorName,
      answer: answerText,
    });

    if (error) {
      alert("Error Posting Answer: " + error.message);
    }

    if (!error) {
      // The database keeps the answers count in sync; this only updates the display
      const newAnswerCount = (mentorProfile?.answers || 0) + 1;
      setMentorProfile((prev) => (prev ? { ...prev, answers: newAnswerCount } : prev));

      const answeredQuestion = unansweredQuestions.find((q) => q.id === userQuestionId);

      fetch("/api/notify-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data?.session?.access_token}`,
        },
        body: JSON.stringify({
          userQuestionId,
          question: answeredQuestion?.question,
          answer: answerText,
          mentorName,
          subject: answeredQuestion?.subject,
          country: answeredQuestion?.country,
          askerUserId: answeredQuestion?.user_id,
                    mentorSchool: mentorProfile?.school,
          mentorLanguages: mentorProfile?.languages,
        }),
      }).catch((err) => console.error("Notification error:", err));

      setUnansweredQuestions((prev) => prev.filter((q) => q.id !== userQuestionId));
      setAnswerDrafts((prev) => ({ ...prev, [userQuestionId]: "" }));
    }

    setSubmittingId(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <p className="text-muted max-w-4xl mx-auto px-6 py-16">Loading dashboard...</p>
      </div>
    );
  }

  if (notAuthorized) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-md mx-auto px-6 py-16 text-center">
          <p className="text-ink font-medium">
            This page is only available to approved mentors.
          </p>
        </div>
      </div>
    );
  }

   return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <MentorWelcomeTour
        open={showTour}
        onClose={handleCloseTour}
        mentorId={mentorProfile?.id}
        firstName={(mentorProfile?.name || user?.user_metadata?.name || "").split(" ")[0]}
      />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-10">
          <div>
            <SectionEyebrow>Mentor Account</SectionEyebrow>
            <h1 className="font-display text-3xl text-ink leading-tight">
              {mentorProfile?.name || user?.user_metadata?.name}
            </h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setShowTour(true)}
              className="font-label text-[10px] tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border border-border text-ink hover:border-primary hover:text-primary transition"
            >
              How PeerVia works
            </button>
            <span
              className={`font-label text-[10px] tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border flex items-center gap-2 ${
                available ? "text-primary border-primary/30 bg-primary/5" : "text-muted border-border bg-surface"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${available ? "bg-primary" : "bg-muted"}`} />
              {available ? "Open For Bookings" : "Not Accepting Bookings"}
            </span>
          </div>
        </div>
               <div data-tour="guru">
          <MentorGuruMessage />
        </div>

               {/* Documents */}
        <div data-tour="documents" className="flex items-center gap-4 flex-wrap mb-6 text-sm">
          <span className="font-label text-[10px] tracking-[0.1em] uppercase text-muted">Documents</span>
          <a
            href="/documents/PeerVia-Ambassador-Guide.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-4 hover:opacity-80"
          >
            Ambassador Guide and Rules ↗
          </a>
          <a
            href="/documents/PeerVia-Ambassador-Privacy-Policy.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-4 hover:opacity-80"
          >
            Privacy Policy ↗
          </a>
        </div>

              {/* Profile summary */}
        <div data-tour="summary" className="bg-surface border border-border rounded-lg mb-6 shadow-sm p-5">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="relative shrink-0">
              {photoPreview || mentorProfile?.photo_url ? (
                <img
                  src={photoPreview || mentorProfile.photo_url}
                  alt={mentorProfile?.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-ink text-white flex items-center justify-center font-display text-xl">
                  {mentorProfile?.initials || "?"}
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center text-muted cursor-pointer hover:bg-surface hover:text-ink transition">
                <PencilIcon />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex-1 min-w-[200px]">
              <h2 className="font-display text-xl text-ink leading-tight">
                {mentorProfile?.name || user?.user_metadata?.name}
              </h2>
              <p className="text-muted text-sm">
                {mentorProfile?.school}
                {mentorProfile?.year ? ` · ${mentorProfile.year}` : ""}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {mentorProfile?.subject && (
                  <span className="inline-block font-label text-[10px] tracking-[0.08em] uppercase px-3 py-1 rounded-full bg-primary/10 text-primary">
                    {mentorProfile.subject}
                  </span>
                )}
                {mentorProfile?.country && (
                  <span className="inline-block font-label text-[10px] tracking-[0.08em] uppercase px-3 py-1 rounded-full bg-ink/5 text-ink">
                    {mentorProfile.country}
                  </span>
                )}
                {mentorProfile?.verified && (
                  <span className="inline-flex items-center gap-1 font-label text-[10px] tracking-[0.08em] uppercase px-3 py-1 rounded-full bg-ink/5 text-ink">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-primary">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Verified
                  </span>
                )}
              </div>
            </div>

            {photoFile && (
              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={handleUploadPhoto}
                  disabled={photoUploading}
                  className="bg-ink text-white px-4 py-1.5 rounded-md text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {photoUploading ? "Uploading..." : "Save new photo"}
                </button>
                <button
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="text-xs font-medium text-muted hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="flex gap-6 pl-4 border-l border-border ml-auto">
              <div className="text-center">
                <p className="font-display text-lg text-ink">{mentorProfile?.sessions ?? 0}</p>
                <p className="text-[11px] uppercase tracking-wide text-muted font-medium">Sessions</p>
              </div>
              <div className="text-center">
                <p className="font-display text-lg text-ink">{mentorProfile?.answers ?? 0}</p>
                <p className="text-[11px] uppercase tracking-wide text-muted font-medium">Answers</p>
              </div>
              <div className="text-center">
                <p className="font-display text-lg text-ink flex items-center justify-center gap-1">
                  {mentorProfile?.rating ?? "—"}
                  <StarIcon className="w-3 h-3 text-primary" />
                </p>
                <p className="text-[11px] uppercase tracking-wide text-muted font-medium">Rating</p>
              </div>
            </div>
          </div>
        </div>

                {/* Profile section */}
        <CollapsibleCard
          dataTour="profile"
          eyebrow="Public Profile"
          title="Your Profile"
          description="Shown on your public mentor card and profile page."
        >

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-muted mb-1">Field of study</label>
              <div className="relative">
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full appearance-none border border-border rounded-md pl-4 pr-10 py-2.5 text-sm text-ink bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a field...</option>
                  {Object.keys(subjectStyles).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronIcon className="w-4 h-4 text-muted rotate-90 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Country</label>
              <div className="relative">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full appearance-none border border-border rounded-md pl-4 pr-10 py-2.5 text-sm text-ink bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a country...</option>
                  {Object.keys(countryFlags).map((c) => (
                    <option key={c} value={c}>{countryFlags[c]} {c}</option>
                  ))}
                </select>
                <ChevronIcon className="w-4 h-4 text-muted rotate-90 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <MultiSelect
              label="Languages"
              options={Object.keys(languageFlags)}
              selected={languages}
              onChange={setLanguages}
              getOptionStyle={getLanguageStyle}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-muted mb-1">Age</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                value={age}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                  setAge(digitsOnly);
                }}
                placeholder="e.g. 21"
                className="w-full border border-border rounded-md px-4 py-2.5 text-ink bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">LinkedIn</label>
              <input
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/you"
                className="w-full border border-border rounded-md px-4 py-2.5 text-ink bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-muted mb-1">Bio</label>
            <p className="text-xs text-muted mb-1">Short intro shown on your mentor card in listings.</p>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full border border-border rounded-md px-4 py-2.5 text-ink bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm text-muted mb-1">About me</label>
            <p className="text-xs text-muted mb-1">A longer, more personal write-up shown on your full profile.</p>
            <textarea
              rows={4}
              value={aboutMe}
              onChange={(e) => setAboutMe(e.target.value)}
              className="w-full border border-border rounded-md px-4 py-2.5 text-ink bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm text-muted mb-1">Happy to chat about</label>
            <p className="text-xs text-muted mb-1">Topics students can expect to ask you about, e.g. "Applications, imposter syndrome, part-time jobs".</p>
            <textarea
              rows={2}
              value={happyToChat}
              onChange={(e) => setHappyToChat(e.target.value)}
              className="w-full border border-border rounded-md px-4 py-2.5 text-ink bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm text-muted mb-1">How can you support and guide students?</label>
            <p className="text-xs text-muted mb-1">
              Explain how you can help students through their journey. This comes from your application and shows on your full profile.
            </p>
            <textarea
              rows={4}
              value={supportGuidance}
              onChange={(e) => setSupportGuidance(e.target.value)}
              className="w-full border border-border rounded-md px-4 py-2.5 text-ink bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-y mb-2"
            />
            <Toggle checked={showSupportGuidance} onChange={setShowSupportGuidance} label="Show this on my public profile" />
          </div>

          <div className="mt-6 pt-6 border-t border-border mb-4">
            <SectionEyebrow>Extra Details</SectionEyebrow>
            <p className="text-xs text-muted mb-5">
              Choose what students can see on your public profile. Anything switched off stays private.
            </p>

            <div className="mb-5">
              <label className="block text-sm text-muted mb-1">Personal email</label>
              <p className="text-xs text-muted mb-1">
                Your university email stays private. If you switch this on, students can contact you directly at this address.
              </p>
              <input
                type="email"
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full border border-border rounded-md px-4 py-2.5 text-ink bg-background focus:outline-none focus:ring-2 focus:ring-primary mb-2"
              />
              <Toggle checked={showPersonalEmail} onChange={setShowPersonalEmail} label="Show personal email on my public profile" />
            </div>

            <div className="mb-5">
              <label className="block text-sm text-muted mb-1">Bachelor's degree <span className="text-muted/60">(optional)</span></label>
              <input
                value={bachelorDegree}
                onChange={(e) => setBachelorDegree(e.target.value)}
                placeholder="e.g. BSc Psychology, University of Amsterdam"
                className="w-full border border-border rounded-md px-4 py-2.5 text-ink bg-background focus:outline-none focus:ring-2 focus:ring-primary mb-4"
              />
              <label className="block text-sm text-muted mb-1">Master's degree <span className="text-muted/60">(optional)</span></label>
              <input
                value={masterDegree}
                onChange={(e) => setMasterDegree(e.target.value)}
                placeholder="e.g. MSc Clinical Psychology, Utrecht University"
                className="w-full border border-border rounded-md px-4 py-2.5 text-ink bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="mt-3">
                <Toggle checked={showDegrees} onChange={setShowDegrees} label="Show my degrees on my public profile" />
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm text-muted mb-1">Extracurriculars</label>
              <textarea
                rows={3}
                value={extracurriculars}
                onChange={(e) => setExtracurriculars(e.target.value)}
                placeholder="Clubs, sports, volunteering, leadership roles..."
                className="w-full border border-border rounded-md px-4 py-2.5 text-ink bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-y mb-2"
              />
              <Toggle checked={showExtracurriculars} onChange={setShowExtracurriculars} label="Show extracurriculars on my public profile" />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">Final high school grade</label>
                            <GradeInput value={finalGrade} onChange={setFinalGrade} className="mb-2" />
              <Toggle checked={showFinalGrade} onChange={setShowFinalGrade} label="Show final grade on my public profile" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mb-4">
            <Toggle checked={available} onChange={setAvailable} label="Available for bookings" />
            <Toggle checked={calendarVisible} onChange={setCalendarVisible} label="Show calendar on my public profile" />
          </div>

          {saveError && (
            <p className="text-sm text-red-600 mb-3">{saveError}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-ink text-white px-5 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
            {saved && (
              <span className="text-sm text-primary font-medium">Saved</span>
            )}
          </div>
        </CollapsibleCard>

               {/* Calendar section */}
        <div data-tour="calendar" className="bg-surface border border-border rounded-lg p-6 mb-6 shadow-sm">
          <SectionEyebrow>Availability</SectionEyebrow>
          <button
            onClick={() => setCalendarExpanded(!calendarExpanded)}
            className="flex items-center gap-2 font-display text-xl text-ink"
          >
            <ChevronIcon className={`w-4 h-4 text-primary transition-transform ${calendarExpanded ? "rotate-90" : ""}`} />
            Your Calendar
          </button>

          {calendarExpanded && (
            <>
              <p className="text-xs text-muted mt-2 mb-4">
                Students will only see this calendar on your public profile page if it's turned on.
              </p>
              {mentorProfile?.id && <MentorCalendarEditor mentorId={mentorProfile.id} />}
            </>
          )}
        </div>

{/* Call requests */}
        <CollapsibleCard
          id="call-requests"
          eyebrow="Bookings"
          title="Call Requests"
          badge={
            callRequests.filter((r) => r.status !== "done").length > 0
              ? `${callRequests.filter((r) => r.status !== "done").length} new`
              : null
          }
          description="Students who want a call with you. You also get each request by email, so you can reply there or from here."
        >

          {callRequestsError ? (
            <p className="text-sm text-red-600">Couldn&apos;t load call requests: {callRequestsError}</p>
          ) : !callRequestsLoaded ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : callRequests.length === 0 ? (
            <p className="text-sm text-muted">No call requests yet. When a student asks for a call, it will show up here.</p>
          ) : (
            <div className="space-y-4">
              {callRequests.map((r) => (
                <div
                  key={r.id}
                  className={`border border-border rounded-lg p-4 ${r.status === "done" ? "opacity-60" : "bg-background"}`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">
                        {r.student_name || r.student_email || "A student"}
                      </p>
                      {r.student_name && r.student_email && (
                        <p className="text-xs text-muted break-all">{r.student_email}</p>
                      )}
                    </div>
                    <p className="font-label text-[10px] tracking-[0.05em] uppercase text-muted shrink-0">
                      {new Date(r.created_at).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {r.message ? (
                    <p className="text-sm text-ink bg-surface border border-border rounded-md px-3 py-2 whitespace-pre-line">
                      {r.message}
                    </p>
                  ) : (
                    <p className="text-xs text-muted italic">The message wasn&apos;t saved for this request. Check your email for it.</p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap mt-3">
                    {r.student_email && (
                      <a
                        href={`mailto:${r.student_email}?subject=${encodeURIComponent("Your PeerVia call request")}`}
                        className="font-label text-[10px] tracking-[0.08em] uppercase px-4 py-1.5 rounded-full bg-primary text-white hover:opacity-90 transition"
                      >
                        Reply by email
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleCallRequest(r)}
                      className="font-label text-[10px] tracking-[0.08em] uppercase px-4 py-1.5 rounded-full border border-border text-ink hover:border-primary hover:text-primary transition"
                    >
                      {r.status === "done" ? "Mark as new" : "Mark as handled"}
                    </button>
                    {r.status === "done" && (
                      <span className="text-xs text-muted">Handled</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleCard>

              {/* Unanswered questions */}
        <CollapsibleCard
          dataTour="questions"
          className=""
          eyebrow="Community"
          title="Unanswered Community Questions"
          description="Answer a student's question. It will appear publicly on the community page."
        >
          <div className="mb-6 pb-6 border-b border-border">
            <Toggle
              checked={emailNotifications}
              onChange={handleToggleEmailNotifications}
              label="Email me when a student posts a question in my field"
            />
            <p className="text-xs text-muted mt-2 ml-12">
              On by default. Turn it off any time and you'll stop getting these emails.
            </p>
          </div>

          {unansweredQuestions.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
              <p className="text-muted text-sm">You're all caught up. No unanswered questions right now.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {unansweredQuestions.map((q) => (
                <div key={q.id} className="border border-border rounded-lg p-4 hover:border-primary/30 hover:bg-background/60 transition-colors">
                  <p className="font-display text-ink mb-1">{q.question}</p>
                  <p className="text-xs text-muted mb-3">
                    Asked by {q.author_name || "Anonymous"}
                  </p>
                  <textarea
                    rows={2}
                    placeholder="Write your answer..."
                    value={answerDrafts[q.id] || ""}
                    onChange={(e) =>
                      setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    className="w-full border border-border rounded-md px-4 py-2.5 text-sm text-ink bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-y mb-2"
                  />
                  <button
                    onClick={() => handleSubmitAnswer(q.id)}
                    disabled={submittingId === q.id}
                    className="bg-ink text-white px-4 py-1.5 rounded-md text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {submittingId === q.id ? "Posting..." : "Post answer"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </CollapsibleCard>
      </div>
    </div>
  );
}