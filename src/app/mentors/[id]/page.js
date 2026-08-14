"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/Components/Navbar";
import { getSubjectStyle, getFlag } from "@/data/mentors";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function MentorProfile() {
  const { id } = useParams();
  const [mentor, setMentor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
const [showForm, setShowForm] = useState(false);
const [formEmail, setFormEmail] = useState("");
const [formMessage, setFormMessage] = useState("");
const [bookError, setBookError] = useState("");
const [submitting, setSubmitting] = useState(false);
const [submitted, setSubmitted] = useState(false);

async function handleBookClick() {
  setBookError("");
  const { data } = await supabase.auth.getUser();
  if (!data?.user) {
    setBookError("You need to sign in to book a call.");
    return;
  }
  setFormEmail(data.user.email || "");
  setShowForm(true);
}

async function handleSubmitBooking(e) {
  e.preventDefault();
  setSubmitting(true);
  setBookError("");

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  const res = await fetch("/api/book-call", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mentorId: id, email: formEmail, message: formMessage }),
  });

  const result = await res.json();
  setSubmitting(false);

  if (result.error) {
    setBookError(result.error);
  } else {
    setSubmitted(true);
    setShowForm(false);
  }
}

  useEffect(() => {
    async function fetchMentor() {
      const { data, error } = await supabase
        .from("mentorss")
        .select("*")
        .eq("id", id)
        .single();

      if (error) setError(error.message);
      else setMentor(data);
      setLoading(false);
    }
    if (id) fetchMentor();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9F2]">
        <Navbar />
        <p className="text-gray-500 text-center mt-20">Loading mentor...</p>
      </div>
    );
  }

  if (error || !mentor) {
    return (
      <div className="min-h-screen bg-[#FFF9F2]">
        <Navbar />
        <p className="text-red-600 text-center mt-20 font-semibold">
          {error || "Mentor not found."}
        </p>
      </div>
    );
  }

  const languages =
    typeof mentor.languages === "string"
      ? mentor.languages.split(",").map((l) => l.trim())
      : mentor.languages || [];

  return (
    <div className="min-h-screen bg-[#FFF9F2]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white border border-gray-200 rounded-2xl p-8">
          {/* Header */}
          <div className="flex items-start gap-5 mb-6">
            <div className="w-20 h-20 rounded-full bg-green-800 text-white flex items-center justify-center font-bold text-2xl shrink-0">
              {mentor.initials}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">{mentor.name}</h1>
              <p className="text-gray-500">
                {mentor.school} · {mentor.year}
                {mentor.age ? ` · Age ${mentor.age}` : ""}
              </p>
              {mentor.verified && (
                <span className="inline-block mt-2 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  ✓ Verified
                </span>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${getSubjectStyle(mentor.subject).color}`}>
              {getSubjectStyle(mentor.subject).icon} {mentor.subject}
            </span>
            <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
              {getFlag(mentor.country)} {mentor.country}
            </span>
            {languages.map((lang) => (
              <span key={lang} className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700">
                {lang}
              </span>
            ))}
          </div>

          {/* Bio */}
          <p className="text-gray-700 mb-4 leading-relaxed">{mentor.bio}</p>

          {mentor.about_me && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-900 mb-1">About Me</h3>
              <p className="text-gray-700 leading-relaxed">{mentor.about_me}</p>
            </div>
          )}

          {mentor.happy_to_chat_about && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-900 mb-1">Happy to Chat About</h3>
              <p className="text-gray-700 leading-relaxed">{mentor.happy_to_chat_about}</p>
            </div>
          )}

          {mentor.linkedin && (
            <a
              href={mentor.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-semibold text-green-700 hover:text-green-800 underline mb-6"
            >
              View LinkedIn Profile →
            </a>
          )}

          <div className="mb-2" />

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 pt-6 border-t border-gray-100 text-center mb-8">
            <div>
              <p className="font-bold text-gray-900 text-lg">{mentor.sessions}</p>
              <p className="text-xs text-gray-500">Sessions</p>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">{mentor.answers}</p>
              <p className="text-xs text-gray-500">Answers</p>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">{mentor.rating}★</p>
              <p className="text-xs text-gray-500">Rating</p>
            </div>
            <div>
              <p className={`font-bold text-lg flex items-center justify-center gap-1 ${mentor.available ? "text-green-600" : "text-gray-400"}`}>
                <span className={`w-2 h-2 rounded-full ${mentor.available ? "bg-green-600" : "bg-gray-400"}`}></span>
                {mentor.available ? "Open" : "Closed"}
              </p>
              <p className="text-xs text-gray-500">Bookings</p>
            </div>
          </div>

         {submitted ? (
  <p className="text-center text-green-700 font-semibold bg-green-50 py-3 rounded-lg">
    Request sent! {mentor.name} will get back to you by email.
  </p>
) : !mentor.available ? (
  <button disabled className="w-full bg-gray-200 text-gray-500 font-semibold py-3 rounded-lg cursor-not-allowed">
    Not Currently Open for Bookings
  </button>
) : showForm ? (
  <form onSubmit={handleSubmitBooking} className="space-y-3">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Your email</label>
      <input
        type="email"
        required
        value={formEmail}
        onChange={(e) => setFormEmail(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Why do you want to book a call?</label>
      <textarea
        required
        rows={4}
        value={formMessage}
        onChange={(e) => setFormMessage(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
    </div>
    {bookError && <p className="text-red-600 text-sm">{bookError}</p>}
    <button
      type="submit"
      disabled={submitting}
      className="w-full bg-green-700 text-white font-semibold py-3 rounded-lg hover:bg-green-800 transition disabled:opacity-50"
    >
      {submitting ? "Sending..." : "Send Request"}
    </button>
  </form>
) : (
  <>
    <button
      onClick={handleBookClick}
      className="w-full bg-green-700 text-white font-semibold py-3 rounded-lg hover:bg-green-800 transition"
    >
      Book a Call
    </button>
    {bookError && (
      <p className="text-red-600 text-sm text-center mt-2">
        {bookError}{" "}
        <a href={`/login?redirect=/mentors/${id}`} className="underline font-semibold">
          Sign in
        </a>
      </p>
    )}
  </>
)}
        </div>
      </div>
    </div>
  );
}