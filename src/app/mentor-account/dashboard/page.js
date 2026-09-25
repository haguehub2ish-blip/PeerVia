"use client";
import { useState, useEffect } from "react";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";
import { getSubjectStyle, getFlag, subjectStyles, countryFlags, languageFlags, getLanguageStyle } from "@/data/mentors";
import MentorCalendarEditor from "@/Components/MentorCalendarEditor";
import MultiSelect from "@/Components/MultiSelect";

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

  const [subject, setSubject] = useState("");
  const [country, setCountry] = useState("");
  const [languages, setLanguages] = useState([]);

    const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [unansweredQuestions, setUnansweredQuestions] = useState([]);
  const [answerDrafts, setAnswerDrafts] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user || null;

      if (!currentUser || currentUser.user_metadata?.role !== "mentor") {
        setNotAuthorized(true);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      const { data: profile } = await supabase
        .from("mentorss")
        .select("*")
        .eq("user_id", currentUser.id)
        .single();

      if (profile) {
        setMentorProfile(profile);
        setBio(profile.bio || "");
        setAboutMe(profile.about_me || "");
        setAge(profile.age ?? "");
        setHappyToChat(profile.happy_to_chat_about || "");
        setLinkedin(profile.linkedin || "");
        setAvailable(profile.available ?? true);
        setCalendarVisible(profile.calendar_visible ?? false);
        setSubject(profile.subject || "");
        setCountry(profile.country || "");
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
        languages: languages.join(","),
      })
      .eq("user_id", user.id);
    setSaving(false);

    if (error) {
      setSaveError(error.message);
    } else {
      setMentorProfile((prev) => (prev ? { ...prev, subject, country, languages: languages.join(",") } : prev));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
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
      const newAnswerCount = (mentorProfile?.answers || 0) + 1;
      const { error: countError } = await supabase
        .from("mentorss")
        .update({ answers: newAnswerCount })
        .eq("user_id", user.id);

      if (!countError) {
        setMentorProfile((prev) => (prev ? { ...prev, answers: newAnswerCount } : prev));
      }

      const answeredQuestion = unansweredQuestions.find((q) => q.id === userQuestionId);

      fetch("/api/notify-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userQuestionId,
          question: answeredQuestion?.question,
          answer: answerText,
          mentorName,
          subject: answeredQuestion?.subject,
          country: answeredQuestion?.country,
          askerUserId: answeredQuestion?.user_id,
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
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-10">
          <div>
            <h1 className="font-display text-3xl text-ink mb-1">Mentor Dashboard</h1>
            <p className="text-muted text-sm">
              Welcome back, {mentorProfile?.name || user?.user_metadata?.name}.
            </p>
          </div>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${
              available ? "text-primary border-primary/30" : "text-muted border-border"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${available ? "bg-primary" : "bg-muted"}`} />
            {available ? "Open for bookings" : "Not accepting bookings"}
          </span>
        </div>

        {/* Profile summary */}
        <div className="bg-surface border border-border rounded-lg mb-6 shadow-sm p-5">
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
              <label className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center text-[10px] cursor-pointer hover:bg-surface transition">
                ✎
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
                  <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${getSubjectStyle(mentorProfile.subject).color}`}>
                    {getSubjectStyle(mentorProfile.subject).icon} {mentorProfile.subject}
                  </span>
                )}
                {mentorProfile?.country && (
                  <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-ink/5 text-ink">
                    {getFlag(mentorProfile.country)} {mentorProfile.country}
                  </span>
                )}
                {mentorProfile?.verified && (
                  <span className="inline-block text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
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
                <p className="font-display text-lg text-ink">{mentorProfile?.rating ?? "—"}★</p>
                <p className="text-[11px] uppercase tracking-wide text-muted font-medium">Rating</p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile section */}
        <div className="bg-surface border border-border rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="font-display text-xl text-ink mb-1">Your Profile</h2>
          <p className="text-muted text-sm mb-6">Shown on your public mentor card and profile page.</p>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-muted mb-1">Field of study</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-border rounded-md px-4 py-2.5 text-sm text-ink bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a field...</option>
                {Object.keys(subjectStyles).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full border border-border rounded-md px-4 py-2.5 text-sm text-ink bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a country...</option>
                {Object.keys(countryFlags).map((c) => (
                  <option key={c} value={c}>{countryFlags[c]} {c}</option>
                ))}
              </select>
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

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4">
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              Available for bookings
            </label>

            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={calendarVisible}
                onChange={(e) => setCalendarVisible(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              Show calendar on my public profile
            </label>
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
        </div>

        {/* Calendar section */}
        <div className="bg-surface border border-border rounded-lg p-6 mb-6 shadow-sm">
          <button
            onClick={() => setCalendarExpanded(!calendarExpanded)}
            className="flex items-center gap-2 font-display text-xl text-ink"
          >
            <span className={`text-primary transition-transform ${calendarExpanded ? "rotate-90" : ""}`}>›</span>
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

        {/* Unanswered questions */}
        <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
          <h2 className="font-display text-xl text-ink mb-1">
            Unanswered Community Questions
          </h2>
          <p className="text-sm text-muted mb-6">
            Answer a student's question — it'll appear publicly on the community page.
          </p>

          {unansweredQuestions.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
              <p className="text-muted text-sm">You're all caught up — no unanswered questions right now.</p>
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
        </div>
      </div>
    </div>
  );
}