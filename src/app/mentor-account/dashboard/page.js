"use client";
import { useState, useEffect } from "react";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";
import { getSubjectStyle, getFlag } from "@/data/mentors";

export default function MentorDashboard() {
  const [user, setUser] = useState(null);
  const [mentorProfile, setMentorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notAuthorized, setNotAuthorized] = useState(false);

  const [bio, setBio] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [age, setAge] = useState("");
  const [happyToChat, setHappyToChat] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [available, setAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

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

  async function handleSaveProfile() {
    setSaving(true);
    setSaved(false);
    setSaveError("");

    if (linkedin && !/^https?:\/\/.+/i.test(linkedin.trim())) {
      setSaving(false);
      setSaveError("LinkedIn link should start with http:// or https://");
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
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      setSaveError(error.message);
    } else {
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
      // Increment this mentor's answer count on their profile
      const newAnswerCount = (mentorProfile?.answers || 0) + 1;
      const { error: countError } = await supabase
        .from("mentorss")
        .update({ answers: newAnswerCount })
        .eq("user_id", user.id);

      if (!countError) {
        setMentorProfile((prev) => (prev ? { ...prev, answers: newAnswerCount } : prev));
      }

      const answeredQuestion = unansweredQuestions.find((q) => q.id === userQuestionId);

      // Fire off email notifications (don't block the UI on this)
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
      <div className="min-h-screen bg-[#FFF9F2]">
        <Navbar />
        <p className="text-gray-500 max-w-4xl mx-auto px-6 py-16">Loading Dashboard...</p>
      </div>
    );
  }

  if (notAuthorized) {
    return (
      <div className="min-h-screen bg-[#FFF9F2]">
        <Navbar />
        <div className="max-w-md mx-auto px-6 py-16 text-center">
          <p className="text-gray-700 font-medium">
            This Page Is Only Available To Approved Mentors.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9F2]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
          Mentor Dashboard
        </h1>
        <p className="text-gray-600 mb-8">
          Welcome Back, {mentorProfile?.name || user?.user_metadata?.name}.
        </p>

        {/* Profile summary */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-full bg-green-800 text-white flex items-center justify-center font-bold text-xl shrink-0">
              {mentorProfile?.initials || "?"}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">
                {mentorProfile?.name || user?.user_metadata?.name}
              </h2>
              <p className="text-gray-500">
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
                  <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                    {getFlag(mentorProfile.country)} {mentorProfile.country}
                  </span>
                )}
                {mentorProfile?.verified && (
                  <span className="inline-block text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Your Profile</h2>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input
                type="number"
                min="16"
                max="99"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 21"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
              <input
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/you"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <p className="text-xs text-gray-500 mb-1">Short intro shown on your mentor card in listings.</p>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 resize-y"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">About Me</label>
            <p className="text-xs text-gray-500 mb-1">A longer, more personal write-up shown on your full profile.</p>
            <textarea
              rows={4}
              value={aboutMe}
              onChange={(e) => setAboutMe(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 resize-y"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Happy to Chat About</label>
            <p className="text-xs text-gray-500 mb-1">Topics students can expect to ask you about, e.g. "Applications, imposter syndrome, part-time jobs".</p>
            <textarea
              rows={2}
              value={happyToChat}
              onChange={(e) => setHappyToChat(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 resize-y"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
              className="w-4 h-4 accent-green-600"
            />
            Available For Bookings
          </label>

          {saveError && (
            <p className="text-sm text-red-600 mb-3">{saveError}</p>
          )}

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
          {saved && (
            <span className="text-sm text-green-700 font-medium ml-2">
              ✓ Saved
            </span>
          )}
        </div>

        {/* Unanswered questions */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            Unanswered Community Questions
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Answer A Student's Question — It'll Appear Publicly On The Community Page.
          </p>

          {unansweredQuestions.length === 0 ? (
            <p className="text-gray-500 text-sm">No Unanswered Questions Right Now.</p>
          ) : (
            <div className="space-y-4">
              {unansweredQuestions.map((q) => (
                <div key={q.id} className="border border-gray-100 rounded-xl p-4">
                  <p className="font-semibold text-gray-900 mb-1">{q.question}</p>
                  <p className="text-xs text-gray-500 mb-3">
                    Asked By {q.author_name || "Anonymous"}
                  </p>
                  <textarea
                    rows={2}
                    placeholder="Write Your Answer..."
                    value={answerDrafts[q.id] || ""}
                    onChange={(e) =>
                      setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 resize-y mb-2"
                  />
                  <button
                    onClick={() => handleSubmitAnswer(q.id)}
                    disabled={submittingId === q.id}
                    className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {submittingId === q.id ? "Posting..." : "Post Answer"}
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