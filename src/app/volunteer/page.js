"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";

// Swap for any file in /public/images, or set to "" to hide the photo.
const VOLUNTEER_HERO_PHOTO_URL = "/images/PV_HomePage3.jpg";

// The "id" values are saved to the database and must match ROLE_LABELS in
// src/app/api/volunteer/route.js. Add or remove roles in both places.
const ROLES = [
  {
    id: "spokesperson",
    number: "01",
    title: "Spokesperson",
    text: "Be the face of PeerVia at your school or university. Talk to classmates, student societies and at open days.",
  },
  {
    id: "course-guides",
    number: "02",
    title: "Course Guide Contributor",
    text: "Help research, write and fact-check guides for the courses you know best, so the next student sees the real picture.",
  },
  {
    id: "mentor-recruiting",
    number: "03",
    title: "Mentor Recruiter",
    text: "Spot great students at your university and encourage them to become PeerVia mentors.",
  },
  {
    id: "social-content",
    number: "04",
    title: "Content & Social Media",
    text: "Make posts, short videos and stories for Instagram and LinkedIn that students actually want to watch.",
  },
  {
    id: "school-outreach",
    number: "05",
    title: "School Outreach",
    text: "Connect us with teachers, counsellors and schools who could share PeerVia with their students.",
  },
  {
    id: "events",
    number: "06",
    title: "Events",
    text: "Help plan and run info sessions, panels and campus stands where students can meet PeerVia in person.",
  },
  {
    id: "design-tech",
    number: "07",
    title: "Design, Tech & Translation",
    text: "Graphics, web, data, or translating PeerVia into another language. Bring a skill and we will find a use for it.",
  },
  {
    id: "other",
    number: "08",
    title: "Something Else",
    text: "Got an idea we haven't thought of? Tell us. Some of our best help came from people who just asked.",
  },
];

const STEPS = [
  {
    numeral: "i.",
    title: "Tell us how you'd like to help",
    text: "Fill in the short form below. Pick one role or several, and tell us a bit about yourself. It takes about three minutes.",
  },
  {
    numeral: "ii.",
    title: "We get in touch",
    text: "Someone from the team reads every sign-up personally and replies by email, usually to arrange a short chat.",
  },
  {
    numeral: "iii.",
    title: "Start with something small",
    text: "No long onboarding. You get a first task that fits your time, and you grow into more if you want to.",
  },
];

// Edit these so they only promise what the team can really deliver.
const PERKS = [
  {
    title: "Real experience",
    text: "Run an actual project with an actual student team. Something concrete for your CV and your next application.",
  },
  {
    title: "Flexible hours",
    text: "Between exams, around a job, in a quiet week. You choose how much time you give and can change it any time.",
  },
  {
    title: "A team of students",
    text: "Meet other motivated students from different universities who care about the same thing you do.",
  },
  {
    title: "Visible impact",
    text: "Every guide, post and conversation helps a high school student make a better-informed choice.",
  },
];

const HOURS = ["1 hour a week", "2 to 4 hours a week", "5+ hours a week", "One-off or occasional help"];
const STAGES = ["High school student", "University student", "Recent graduate"];

const FAQS = [
  {
    question: "Do I need to be a PeerVia mentor?",
    answer:
      "No. Volunteering is separate from mentoring. Some volunteers are mentors too, but most roles only need your time and enthusiasm. If you'd like to answer student questions or take calls, you can apply to become a mentor from the Become a Mentor page.",
  },
  {
    question: "Is this paid?",
    answer:
      "PeerVia is student-led and free for students, and volunteer roles are unpaid. What you get is experience, a team and the chance to make something that helps people.",
  },
  {
    question: "How much time does it take?",
    answer:
      "As little as an hour a week, or a single one-off project. Tell us what suits you in the form and we will match tasks to your schedule.",
  },
  {
    question: "I'm still in high school. Can I help?",
    answer:
      "Yes. Many roles, such as spreading the word at your school or helping with content, suit high school students well. We may ask for a parent or guardian to be aware of your involvement.",
  },
  {
    question: "What happens after I sign up?",
    answer:
      "We read it, reply by email and set up a short chat. There is no obligation on either side, and you can step back whenever you need to.",
  },
];

function PhotoBlock({ src, className = "", tint = 55 }) {
  if (!src) return null;
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="relative w-full h-full">
        <img src={src} alt="" className="w-full h-full object-cover grayscale contrast-[1.08]" />
        <div className="absolute inset-0 bg-primary mix-blend-multiply" style={{ opacity: tint / 100 }} />
      </div>
    </div>
  );
}

const inputClass =
  "w-full border border-border rounded-lg px-4 py-2.5 text-ink placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-primary bg-background";

export default function VolunteerPage() {
  const formRef = useRef(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    stage: "",
    school: "",
    hours: "",
    motivation: "",
    experience: "",
    link: "",
    website: "", // honeypot: real visitors never see or fill this in
  });
  const [roles, setRoles] = useState([]);
  const [openFaqs, setOpenFaqs] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleRole(id) {
    setRoles((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  function toggleFaq(i) {
    setOpenFaqs((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function scrollToForm(roleId) {
    if (roleId) setRoles((prev) => (prev.includes(roleId) ? prev : [...prev, roleId]));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // If they're already logged in, save them some typing.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      if (!u) return;
      const meta = u.user_metadata || {};
      const fullName = (meta.name || "").trim();
      const first = meta.firstName || fullName.split(" ")[0] || "";
      const last = meta.lastName || fullName.split(" ").slice(1).join(" ") || "";
      setForm((prev) => ({
        ...prev,
        firstName: prev.firstName || first,
        lastName: prev.lastName || last,
        email: prev.email || u.email || "",
      }));
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (roles.length === 0) {
      setError("Please pick at least one way you'd like to help.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/volunteer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, roles }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error || "Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background bg-grain">
        <Navbar />
        <div className="max-w-xl mx-auto px-6 py-24 text-center">
          <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-4">
            Sign-up received
          </p>
          <h1 className="font-display text-3xl md:text-5xl text-ink leading-tight mb-5">
            Thank you, <span className="italic text-primary">{form.firstName}.</span>
          </h1>
          <p className="text-muted leading-relaxed mb-8">
            We have your sign-up and sent a confirmation to {form.email}. Someone from the team will read
            it and get back to you soon. Check your spam folder if you don&apos;t see anything within a few days.
          </p>
          <Link
            href="/"
            className="inline-block font-label text-xs tracking-[0.1em] uppercase bg-ink text-white px-6 py-3 rounded-lg hover:opacity-90 transition"
          >
            Back to PeerVia
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-grain">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-16 pb-16 md:pt-24 md:pb-20 text-center bg-ink">
        {VOLUNTEER_HERO_PHOTO_URL && (
          <>
            <PhotoBlock src={VOLUNTEER_HERO_PHOTO_URL} className="absolute inset-0 w-full h-full" tint={70} />
            <div className="absolute inset-0 bg-ink/60" />
          </>
        )}
        <div className="max-w-2xl mx-auto relative">
          <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-4">Volunteer</p>
          <h1 className="font-display text-3xl md:text-5xl text-white leading-tight mb-5">
            PeerVia is built by students.{" "}
            <span className="italic text-primary">Help us build it further.</span>
          </h1>
          <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
            Whether you have an hour a week or a big idea, there is a way for you to help more students make
            honest, informed choices about their future.
          </p>
          <button
            onClick={() => scrollToForm()}
            className="inline-block font-label text-sm tracking-[0.1em] uppercase bg-primary text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary-dark transition"
          >
            Sign Up To Volunteer →
          </button>
          <p className="font-label text-[11px] tracking-[0.05em] uppercase text-white/50 mt-4">
            Takes 3 Minutes · Flexible Hours · Open To Students
          </p>
        </div>
      </section>

      {/* Roles */}
      <section className="px-6 py-16 md:py-20 bg-surface border-y border-border">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-xl mb-12">
            <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-3">
              Ways To Help
            </p>
            <h2 className="font-display text-3xl md:text-4xl text-ink mb-3">
              Find the role that <span className="italic text-primary">fits you.</span>
            </h2>
            <p className="text-muted">
              Pick the one that excites you most, or combine a few. Tap a role to jump to the sign-up form.
            </p>
          </div>

          <div data-tour="volunteer-roles" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => scrollToForm(role.id)}
                className="group text-left bg-background border border-border rounded-2xl p-6 hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-md transition"
              >
                <p className="font-display text-3xl text-primary/40 mb-4">{role.number}</p>
                <h3 className="font-display text-xl text-ink mb-2 leading-snug">{role.title}</h3>
                <p className="text-muted text-sm leading-relaxed mb-4">{role.text}</p>
                <span className="font-label text-[10px] tracking-[0.1em] uppercase text-primary group-hover:underline underline-offset-4">
                  I&apos;m interested →
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* What's in it for you */}
      <section className="relative overflow-hidden bg-ink text-white px-6 py-16 md:py-20">
        <div className="relative max-w-5xl mx-auto">
          <div className="max-w-xl mb-12">
            <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-3">
              What You Get
            </p>
            <h2 className="font-display text-3xl md:text-4xl mb-3">
              More than a line on your <span className="italic text-primary">CV.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10">
            {PERKS.map((perk) => (
              <div key={perk.title} className="border-t border-white/20 pt-5">
                <h3 className="font-display text-xl mb-2">{perk.title}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{perk.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-xl mb-12">
            <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-3">
              How It Works
            </p>
            <h2 className="font-display text-3xl md:text-4xl text-ink">
              Simple from the <span className="italic text-primary">first step.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step) => (
              <div key={step.title} className="bg-surface border border-border rounded-2xl p-7">
                <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-3">
                  {step.numeral}
                </p>
                <h3 className="font-display text-xl text-ink mb-2 leading-snug">{step.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sign-up form */}
      <section ref={formRef} className="px-6 py-16 md:py-20 bg-surface border-y border-border scroll-mt-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-3">
              Sign Up
            </p>
            <h2 className="font-display text-3xl md:text-4xl text-ink mb-3">
              Ready to <span className="italic text-primary">get involved?</span>
            </h2>
            <p className="text-muted">No commitment. Tell us a bit about you and we will take it from there.</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-background border border-border rounded-2xl p-6 md:p-8 space-y-6"
          >
            {/* Roles */}
            <div>
              <p className="block text-sm font-semibold text-ink mb-1">
                How would you like to help? <span className="text-red-500">*</span>
              </p>
              <p className="text-xs text-muted mb-3">Choose as many as you like.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ROLES.map((role) => {
                  const selected = roles.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRole(role.id)}
                      aria-pressed={selected}
                      className={`flex items-center gap-3 text-left px-4 py-3 rounded-lg border text-sm transition ${
                        selected
                          ? "bg-primary text-white border-primary font-semibold"
                          : "bg-surface text-ink border-border hover:border-primary/50"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center text-[10px] ${
                          selected ? "bg-white text-primary border-white" : "border-border"
                        }`}
                      >
                        {selected ? "✓" : ""}
                      </span>
                      {role.title}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-ink mb-1">First name</label>
                <input
                  required
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  placeholder="Emma"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-1">Last name</label>
                <input
                  required
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  placeholder="Johnson"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
              <p className="text-xs text-muted mt-1.5">We only use this to reply to your sign-up.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-ink mb-1">I am a</label>
                <select
                  required
                  value={form.stage}
                  onChange={(e) => updateField("stage", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select one</option>
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-1">
                  School or university <span className="text-muted/60 font-normal">(optional)</span>
                </label>
                <input
                  value={form.school}
                  onChange={(e) => updateField("school", e.target.value)}
                  placeholder="e.g. Utrecht University"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink mb-1">
                How much time could you give? <span className="text-muted/60 font-normal">(optional)</span>
              </label>
              <select
                value={form.hours}
                onChange={(e) => updateField("hours", e.target.value)}
                className={inputClass}
              >
                <option value="">Not sure yet</option>
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink mb-1">
                Why do you want to help PeerVia? <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                minLength={20}
                rows={4}
                value={form.motivation}
                onChange={(e) => updateField("motivation", e.target.value)}
                placeholder="A few sentences is plenty. What made you want to get involved?"
                className={`${inputClass} resize-y`}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink mb-1">
                Relevant experience or skills <span className="text-muted/60 font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={form.experience}
                onChange={(e) => updateField("experience", e.target.value)}
                placeholder="Clubs, societies, design or writing work, social media, languages, anything you think is useful."
                className={`${inputClass} resize-y`}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink mb-1">
                LinkedIn or Instagram <span className="text-muted/60 font-normal">(optional)</span>
              </label>
              <input
                value={form.link}
                onChange={(e) => updateField("link", e.target.value)}
                placeholder="linkedin.com/in/yourname"
                className={inputClass}
              />
            </div>

            {/* Honeypot: hidden from people, tempting to bots */}
            <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
              <label>
                Leave this empty
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => updateField("website", e.target.value)}
                />
              </label>
            </div>

            {error && (
              <p role="alert" className="text-red-600 text-sm font-medium">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Sign Up To Volunteer →"}
            </button>
            <p className="text-xs text-muted text-center">
              By signing up you agree that PeerVia may contact you about volunteering. See our{" "}
              <a
                href="/documents/PeerVia-Privacy-Policy.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-ink"
              >
                Privacy Policy
              </a>
              .
            </p>
          </form>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16 md:py-20">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-3">
              Good To Know
            </p>
            <h2 className="font-display text-3xl text-ink">
              Common <span className="italic text-primary">questions</span>
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((item, i) => {
              const isOpen = openFaqs.has(i);
              return (
                <div key={item.question} className="bg-surface border border-border rounded-2xl overflow-hidden">
                  <button
                    onClick={() => toggleFaq(i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
                  >
                    <span className="font-display text-ink text-lg">{item.question}</span>
                    <span
                      className={`text-primary text-xl shrink-0 transition-transform ${isOpen ? "rotate-45" : ""}`}
                    >
                      +
                    </span>
                  </button>
                  {isOpen && <div className="px-6 pb-5 text-muted text-sm leading-relaxed">{item.answer}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-6 py-20 text-center border-t border-border bg-surface">
        <div className="max-w-xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-ink mb-4">
            Your time can change <span className="italic text-primary">someone&apos;s direction.</span>
          </h2>
          <p className="text-muted mb-7">
            Prefer to answer student questions or take calls? You can also{" "}
            <a href="/apply" className="text-primary underline underline-offset-4 hover:text-primary-dark">
              become a mentor
            </a>
            .
          </p>
          <button
            onClick={() => scrollToForm()}
            className="inline-block font-label text-sm tracking-[0.1em] uppercase bg-primary text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary-dark transition"
          >
            Sign Up To Volunteer →
          </button>
        </div>
      </section>
    </div>
  );
}