"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import MentorCalendarView from "@/Components/MentorCalendarView";
import { ChevronIcon } from "@/Components/CalendarIcons";

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

const [recommended, setRecommended] = useState([]);
const [recommendedLoading, setRecommendedLoading] = useState(true);

const MENTOR_CTA_PHOTO_URL = "/images/PV_MentorIdPage.jpg";

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

useEffect(() => {
  async function fetchRecommended() {
    const { data } = await supabase
      .from("mentorss")
      .select("*")
      .neq("id", id)
      .order("rating", { ascending: false })
      .limit(3);
    setRecommended(data || []);
    setRecommendedLoading(false);
  }
  if (id) fetchRecommended();
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <p className="text-muted text-center mt-20 font-label text-sm uppercase tracking-wide">
          Loading mentor...
        </p>
      </div>
    );
  }

  if (error || !mentor) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <p className="text-red-600 text-center mt-20 font-semibold">
          {error || "Mentor not found."}
        </p>
      </div>
    );
  }

  const languages =
    typeof mentor.languages === "string"
      ? mentor.languages.split(",").map((l) => l.trim()).filter(Boolean)
      : mentor.languages || [];

  const chatTopics = (mentor.happy_to_chat_about || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const aboutText = mentor.about_me || mentor.bio;
  const firstName = mentor.name?.split(" ")[0] || "this mentor";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-start gap-5 pb-7 border-b border-border mb-10">
          {mentor.photo_url ? (
            <img
              src={mentor.photo_url}
              alt={mentor.name}
              className="w-20 h-20 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary text-background flex items-center justify-center font-bold text-2xl shrink-0">
              {mentor.initials}
            </div>
          )}
          <div>
            {mentor.verified && (
              <p className="flex items-center gap-1.5 font-label text-xs uppercase tracking-[0.15em] text-primary mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                Verified Mentor
              </p>
            )}
            <h1 className="font-display text-4xl sm:text-5xl text-ink leading-tight">
              {mentor.name}
            </h1>
            <p className="text-muted mt-2.5 text-base">
              {mentor.school}, {mentor.year} · {mentor.subject}
            </p>
            {mentor.course && (
              <p className="font-label text-xs uppercase tracking-[0.15em] text-primary mt-2">
                Studying {mentor.course}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main content */}
          <div className="lg:col-span-2">
            <p className="font-label text-xs uppercase tracking-[0.2em] text-muted mb-2">
              About Me
            </p>
            <h2 className="font-display text-2xl text-ink mb-4">In their own words</h2>
            <p className="text-ink/90 leading-relaxed text-base whitespace-pre-line">
              {aboutText}
            </p>

            {chatTopics.length > 0 && (
              <div className="mt-10 pt-10 border-t border-border">
                <p className="font-label text-xs uppercase tracking-[0.2em] text-muted mb-3">
                  Happy to Chat About
                </p>
                <div className="flex flex-wrap gap-2">
                  {chatTopics.map((topic) => (
                    <span
                      key={topic}
                      className="text-sm font-medium px-3.5 py-1.5 rounded-full border border-border text-ink bg-surface"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {languages.length > 0 && (
              <div className="mt-10 pt-10 border-t border-border">
                <p className="font-label text-xs uppercase tracking-[0.2em] text-muted mb-3">
                  Languages
                </p>
                <div className="flex flex-wrap gap-2">
                  {languages.map((lang) => (
                    <span
                      key={lang}
                      className="text-sm font-medium px-3.5 py-1.5 rounded-full border border-border text-ink bg-surface"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {mentor.show_extracurriculars && mentor.extracurriculars && (
              <div className="mt-10 pt-10 border-t border-border">
                <p className="font-label text-xs uppercase tracking-[0.2em] text-muted mb-3">
                  Extracurriculars
                </p>
                <p className="text-ink/90 leading-relaxed text-base whitespace-pre-line">
                  {mentor.extracurriculars}
                </p>
              </div>
            )}

            {mentor.show_final_grade && mentor.final_grade && (
              <div className="mt-10 pt-10 border-t border-border">
                <p className="font-label text-xs uppercase tracking-[0.2em] text-muted mb-3">
                  Final High School Grade
                </p>
                <span className="inline-block text-sm font-medium px-3.5 py-1.5 rounded-full border border-border text-ink bg-surface">
                  {mentor.final_grade}
                </span>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-10 pt-10 border-t border-border">
              <div>
                <p className="font-display text-3xl text-ink">{mentor.sessions}</p>
                <p className="font-label text-xs uppercase tracking-wide text-muted mt-1">Sessions</p>
              </div>
              <div>
                <p className="font-display text-3xl text-ink">{mentor.answers}</p>
                <p className="font-label text-xs uppercase tracking-wide text-muted mt-1">Answers</p>
              </div>
              <div>
                <p className="font-display text-3xl text-ink">{mentor.rating}★</p>
                <p className="font-label text-xs uppercase tracking-wide text-muted mt-1">Rating</p>
              </div>
            </div>

            {mentor.linkedin && (
              <a
                href={mentor.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark mt-7"
              >
                View LinkedIn Profile
                <span aria-hidden>→</span>
              </a>
            )}

                        {mentor.show_personal_email && mentor.public_email && (
              <div className="mt-4">
                <a
                  href={`mailto:${mentor.public_email}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark"
                >
                  Email {firstName}
                  <span aria-hidden>→</span>
                </a>
                <p className="text-xs text-muted mt-1">{mentor.public_email}</p>
              </div>
            )}

            {/* Calendar */}
            {mentor.calendar_visible && (
              <div className="mt-10 pt-10 border-t border-border">
                <button
                  onClick={() => setCalendarExpanded(!calendarExpanded)}
                  className="flex items-center gap-2 font-display text-xl text-ink mb-5"
                >
                  <ChevronIcon className={`w-4 h-4 text-primary transition-transform ${calendarExpanded ? "rotate-90" : ""}`} />
                  Upcoming Availability
                </button>
                {calendarExpanded && <MentorCalendarView mentorId={mentor.id} />}
              </div>
            )}

            {/* Reviews */}
            <div className="mt-10 pt-10 border-t border-border">
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={() => setReviewsCollapsed(!reviewsCollapsed)}
                  className="flex items-center gap-2 font-display text-xl text-ink hover:text-primary transition"
                >
                  <ChevronIcon className={`w-4 h-4 text-primary transition-transform ${reviewsCollapsed ? "" : "rotate-90"}`} />
                  Reviews {reviews.length > 0 && `(${reviews.length})`}
                </button>

                {!reviewsCollapsed && reviews.length > 1 && (
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-sm border border-border rounded-lg px-3 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary bg-surface"
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
                  {currentUser ? (
                    <form onSubmit={handleSubmitReview} className="bg-surface border border-border rounded-xl p-5 mb-6 space-y-3">
                      <div>
                        <p className="text-sm font-medium text-ink/80 mb-1.5">Your Rating</p>
                        <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              className={`text-2xl transition ${
                                star <= (hoverRating || reviewRating) ? "text-primary" : "text-border"
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
                        placeholder="Share your experience with this mentor (optional)"
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary resize-y bg-background"
                      />
                      {reviewError && <p className="text-red-600 text-sm">{reviewError}</p>}
                      <button
                        type="submit"
                        disabled={reviewSubmitting}
                        className="bg-primary text-background px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark transition disabled:opacity-50"
                      >
                        {reviewSubmitting ? "Posting..." : "Post Review"}
                      </button>
                    </form>
                  ) : (
                    <p className="text-sm text-muted bg-surface border border-border rounded-xl p-5 mb-6">
                      <a href={`/login?redirect=/mentors/${id}`} className="text-primary font-semibold underline">
                        Sign in
                      </a>{" "}
                      to leave a review.
                    </p>
                  )}

                  {reviewsLoading ? (
                    <p className="text-muted text-sm">Loading reviews...</p>
                  ) : reviews.length === 0 ? (
                    <p className="text-muted text-sm">No reviews yet. Be the first to leave one.</p>
                  ) : (
                    <div className="space-y-5">
                      {sortedReviews.map((r) => (
                        <div key={r.id} className="border-b border-border pb-5 last:border-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="font-semibold text-ink text-base">{r.author_name}</p>
                            <div className="flex text-sm">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span key={star} className={star <= r.rating ? "text-primary" : "text-border"}>
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                          {r.comment && <p className="text-ink/80 text-base leading-relaxed">{r.comment}</p>}
                          <p className="text-muted text-sm mt-1.5">
                            {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto bg-surface border border-border rounded-2xl p-7">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center text-primary shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M22 10 12 5 2 10l10 5 10-5Z" />
                    <path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
                  </svg>
                </span>
                <div>
                  <p className="font-semibold text-ink text-sm leading-tight">{mentor.school}</p>
                  <p className="font-label text-[10px] uppercase tracking-wide text-primary flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-primary"></span>
                    {mentor.country}
                  </p>
                </div>
              </div>

              <h2 className="font-display text-xl text-ink mb-2">
                Book a session with {firstName}
              </h2>
              <p className="text-sm text-ink/70 leading-relaxed mb-6">
                Send a message to set up a time that works for you both — there's no cost to reach out.
              </p>

              {submitted ? (
                <p className="text-center text-primary font-semibold bg-primary/10 py-3 rounded-lg text-sm">
                  Request sent! {mentor.name} will get back to you by email.
                </p>
              ) : !mentor.available ? (
                <button disabled className="w-full bg-border text-muted font-semibold py-3 rounded-lg cursor-not-allowed text-sm">
                  Not Currently Open for Bookings
                </button>
              ) : showForm ? (
                <form onSubmit={handleSubmitBooking} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-ink/80 mb-1">Your email</label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/80 mb-1">
                      Why do you want to book a call?
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formMessage}
                      onChange={(e) => setFormMessage(e.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-background"
                    />
                  </div>
                  {bookError && <p className="text-red-600 text-sm">{bookError}</p>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-primary text-background font-semibold py-2.5 rounded-lg hover:bg-primary-dark transition disabled:opacity-50 text-sm"
                  >
                    {submitting ? "Sending..." : "Send Request"}
                  </button>
                </form>
              ) : (
                <>
                  <button
                    onClick={handleBookClick}
                    className="w-full bg-primary text-background font-semibold py-2.5 rounded-lg hover:bg-primary-dark transition text-sm"
                  >
                    Book a Call
                  </button>
                  {bookError && (
                    <p className="text-red-600 text-xs text-center mt-2">
                      {bookError}{" "}
                      <a href={`/login?redirect=/mentors/${id}`} className="underline font-semibold">
                        Sign in
                      </a>
                    </p>
                  )}
                </>
              )}

              <div className="space-y-3 pt-6 mt-6 border-t border-border">
                {[
                  `Send ${firstName} a message (free)`,
                  "Agree on a time together",
                  "Meet on your call",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="font-label text-[10px] text-primary shrink-0 mt-0.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-ink/70">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recommended Mentors */}
        {!recommendedLoading && recommended.length > 0 && (
          <div className="mt-14 pt-10 border-t border-border">
            <h2 className="font-display text-2xl text-ink mb-5">Recommended Mentors</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {recommended.map((rec) => (
                <a
                  key={rec.id}
                  href={`/mentors/${rec.id}`}
                  className="bg-surface border border-border rounded-xl p-5 hover:shadow-md hover:border-primary transition flex flex-col"
                >
                  <div className="flex items-center gap-3 mb-4">
                    {rec.photo_url ? (
                      <img
                        src={rec.photo_url}
                        alt={rec.name}
                        className="w-12 h-12 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary text-background flex items-center justify-center font-bold text-sm shrink-0">
                        {rec.initials}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-ink text-sm leading-tight">{rec.name}</p>
                      <p className="text-muted text-xs">{rec.school}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {rec.subject}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-border text-ink bg-background">
                      {rec.country}
                    </span>
                  </div>
                  <p className="text-ink/70 text-xs leading-relaxed line-clamp-2">{rec.bio}</p>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

        {/* ============ CLOSING CTA ============ */}
      <section className="relative overflow-hidden px-6 py-24 text-center mt-4">
        {MENTOR_CTA_PHOTO_URL ? (
          <>
            <PhotoBlock src={MENTOR_CTA_PHOTO_URL} className="absolute inset-0 w-full h-full" tint={70} />
            <div className="absolute inset-0 bg-ink/60" />
          </>
        ) : (
          <div className="absolute inset-0 bg-primary" />
        )}
        <div
          className="absolute -left-10 top-6 w-48 h-28 -rotate-12 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, var(--color-background) 0px, var(--color-background) 3px, transparent 3px, transparent 14px)",
          }}
        />
        <div className="max-w-xl mx-auto relative">
          <h2
            className="font-display text-4xl md:text-5xl text-ink mb-8"
            style={MENTOR_CTA_PHOTO_URL ? { color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.45)" } : undefined}
          >
            Browse free.{" "}
            <span
              className="italic"
              style={{ color: MENTOR_CTA_PHOTO_URL ? "#fff" : "var(--color-primary)" }}
            >
              Join when ready.
            </span>
          </h2>
          <a
            href="/mentors"
            className="inline-block font-label text-sm tracking-[0.1em] uppercase bg-primary text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary-dark transition"
          >
            Find A Mentor →
          </a>
          <p
            className="font-label text-[11px] tracking-[0.05em] uppercase mt-5"
            style={{ color: MENTOR_CTA_PHOTO_URL ? "rgba(255,255,255,0.75)" : undefined }}
          >
            100% Free · No Sign-Up To Browse · Verified Mentors Only
          </p>
        </div>
      </section>
    </div>
  );
}