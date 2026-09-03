"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/Components/Navbar";
import { getSubjectStyle, getFlag } from "@/data/mentors";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import MentorCalendarView from "@/Components/MentorCalendarView";

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

const [reviews, setReviews] = useState([]);
const [reviewsLoading, setReviewsLoading] = useState(true);
const [reviewsCollapsed, setReviewsCollapsed] = useState(false);
const [sortBy, setSortBy] = useState("newest");
const [hoverRating, setHoverRating] = useState(0);
const [reviewRating, setReviewRating] = useState(0);
const [reviewComment, setReviewComment] = useState("");
const [reviewError, setReviewError] = useState("");
const [reviewSubmitting, setReviewSubmitting] = useState(false);
const [currentUser, setCurrentUser] = useState(null);

useEffect(() => {
  async function fetchReviews() {
    const { data: userData } = await supabase.auth.getUser();
    setCurrentUser(userData?.user || null);

    const { data, error } = await supabase
      .from("mentor_reviews")
      .select("*")
      .eq("mentor_id", id)
      .order("created_at", { ascending: false });

    if (!error) {
      const fetchedReviews = data || [];
      setReviews(fetchedReviews);

      if (fetchedReviews.length > 0) {
        const average =
          fetchedReviews.reduce((sum, r) => sum + r.rating, 0) / fetchedReviews.length;
        setMentor((prev) => (prev ? { ...prev, rating: Number(average.toFixed(1)) } : prev));
      }
    }
    setReviewsLoading(false);
  }
  if (id) fetchReviews();
}, [id]);

const sortedReviews = [...reviews].sort((a, b) => {
  if (sortBy === "newest") return new Date(b.created_at) - new Date(a.created_at);
  if (sortBy === "oldest") return new Date(a.created_at) - new Date(b.created_at);
  if (sortBy === "highest") return b.rating - a.rating;
  if (sortBy === "lowest") return a.rating - b.rating;
  return 0;
});

async function handleSubmitReview(e) {
  e.preventDefault();
  setReviewError("");

  if (!currentUser) {
    setReviewError("You need to sign in to leave a review.");
    return;
  }
  if (reviewRating === 0) {
    setReviewError("Please select a star rating.");
    return;
  }

  setReviewSubmitting(true);

  const authorName = currentUser.user_metadata?.name || currentUser.email;

  const { data, error } = await supabase
    .from("mentor_reviews")
    .insert({
      mentor_id: id,
      user_id: currentUser.id,
      author_name: authorName,
      rating: reviewRating,
      comment: reviewComment,
    })
    .select()
    .single();

  if (error) {
    setReviewError(error.message);
    setReviewSubmitting(false);
    return;
  }

  const updatedReviews = [data, ...reviews];
  setReviews(updatedReviews);

  const newAverage =
    updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length;

  await supabase
    .from("mentorss")
    .update({ rating: Number(newAverage.toFixed(1)) })
    .eq("id", id);

  setMentor((prev) => (prev ? { ...prev, rating: Number(newAverage.toFixed(1)) } : prev));
  setReviewRating(0);
  setReviewComment("");
  setReviewSubmitting(false);
}
const [calendarExpanded, setCalendarExpanded] = useState(true);

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
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-green-600 via-green-500 to-emerald-400" />
          <div className="p-8">
          {/* Header */}
          <div className="flex items-start gap-5 mb-6">
            <div className="w-20 h-20 rounded-full bg-green-800 text-white flex items-center justify-center font-bold text-2xl shrink-0 ring-4 ring-green-50">
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
            <div className="mb-4 bg-gray-50 border border-gray-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-6 h-6 rounded-md bg-green-100 text-green-700 flex items-center justify-center text-xs">👤</span>
                <h3 className="text-sm font-bold text-gray-900">About Me</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">{mentor.about_me}</p>
            </div>
          )}

          {mentor.happy_to_chat_about && (
            <div className="mb-4 bg-gray-50 border border-gray-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center text-xs">💬</span>
                <h3 className="text-sm font-bold text-gray-900">Happy to Chat About</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">{mentor.happy_to_chat_about}</p>
            </div>
          )}

          {mentor.linkedin && (
            <a
              href={mentor.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800 mb-6"
            >
              View LinkedIn Profile
              <span aria-hidden>→</span>
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

        {/* Calendar — only shown if this mentor made it public */}
{mentor.calendar_visible && (
  <div className="border-t border-gray-100 pt-6 mb-8">
    <button
      onClick={() => setCalendarExpanded(!calendarExpanded)}
      className="flex items-center gap-2 font-bold text-gray-900 mb-4"
    >
      <span className={`transition-transform ${calendarExpanded ? "rotate-90" : ""}`}>›</span>
      Upcoming Availability
    </button>
    {calendarExpanded && <MentorCalendarView mentorId={mentor.id} />}
  </div>
)}

          {/* Reviews */}
          <div className="pt-6 border-t border-gray-100 mb-8">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setReviewsCollapsed(!reviewsCollapsed)}
                className="flex items-center gap-2 text-lg font-bold text-gray-900 hover:text-green-700 transition"
              >
                {reviewsCollapsed ? "▶" : "▼"} Reviews {reviews.length > 0 && `(${reviews.length})`}
              </button>

              {!reviewsCollapsed && reviews.length > 1 && (
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="highest">Highest Rating</option>
                  <option value="lowest">Lowest Rating</option>
                </select>
              )}
            </div>

            {!reviewsCollapsed && (
              <>
            {/* Leave a review */}
            {currentUser ? (
              <form onSubmit={handleSubmitReview} className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1.5">Your Rating</p>
                  <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        className={`text-2xl transition ${
                          star <= (hoverRating || reviewRating) ? "text-yellow-400" : "text-gray-300"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share Your Experience With This Mentor (Optional)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 resize-y"
                />
                {reviewError && <p className="text-red-600 text-sm">{reviewError}</p>}
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 transition disabled:opacity-50"
                >
                  {reviewSubmitting ? "Posting..." : "Post Review"}
                </button>
              </form>
            ) : (
              <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                <a href={`/login?redirect=/mentors/${id}`} className="text-green-700 font-semibold underline">
                  Sign In
                </a>{" "}
                To Leave A Review.
              </p>
            )}

            {/* Review list */}
            {reviewsLoading ? (
              <p className="text-gray-400 text-sm">Loading Reviews...</p>
            ) : reviews.length === 0 ? (
              <p className="text-gray-400 text-sm">No reviews yet. Be the first to leave one.</p>
            ) : (
              <div className="space-y-4">
                {sortedReviews.map((r) => (
                  <div key={r.id} className="border-b border-gray-100 pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-gray-900 text-sm">{r.author_name}</p>
                      <div className="flex text-sm">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className={star <= r.rating ? "text-yellow-400" : "text-gray-200"}>
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-gray-600 text-sm leading-relaxed">{r.comment}</p>}
                    <p className="text-gray-400 text-xs mt-1">
                      {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
              </>
            )}
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
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Why do you want to book a call?</label>
      <textarea
        required
        rows={4}
        value={formMessage}
        onChange={(e) => setFormMessage(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
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
    </div>
  );
}