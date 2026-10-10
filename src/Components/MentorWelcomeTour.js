"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

// `target` matches a data-tour="..." attribute on the dashboard.
// Steps without a target show as a normal centred pop-up.
function getSteps(firstName) {
  return [
    {
      title: `Welcome to PeerVia${firstName ? `, ${firstName}` : ""}!`,
      body: [
        "I'm Guru, the founder of PeerVia. Here's a one-minute tour of how everything works. I'll point to each part of your dashboard as we go.",
        "PeerVia connects high school students with real university students like you, for honest advice about degrees, courses, applications and student life.",
      ],
    },
    {
      target: "summary",
      title: "Your profile at a glance",
      body: [
        "This card shows your photo, university and your numbers: sessions, answers and rating.",
        "Press the little pencil on your photo to change it.",
      ],
    },
    {
      target: "profile",
      title: "Edit your public profile",
      body: ["Everything here is what students see about you."],
      points: [
        "Add your field, country, languages, bio and what you're happy to chat about.",
        "Under Extra Details, choose what to show, like extracurriculars and your final grade.",
        "Your personal email stays hidden unless you switch it on yourself.",
        "Press Save profile when you're done, or your changes won't be kept.",
      ],
    },
    {
      title: "Your public page",
      body: [
        "Every mentor has their own page that students open from the Mentors section. It shows what you wrote in your profile, plus your reviews.",
        "It opens in a new tab, so you won't lose your place in this tour.",
      ],
      link: true,
    },
    {
      target: "calendar",
      title: "Bookings and your calendar",
      body: ["Students can ask you for a call straight from your page."],
      points: [
        "You get an email with their message. Reply to it and it goes straight to the student.",
        "Switch Available for bookings off in your profile whenever you need a break.",
        "This calendar shows when you're free. It only appears on your page if you switch on Show calendar on my public profile.",
      ],
    },
    {
      target: "questions",
      title: "Answer community questions",
      body: [
        "Students post questions on the Community page. The ones nobody has answered yet appear here.",
        "When you post an answer, it becomes public and the student who asked gets an email. Every answer adds to your Answers count.",
      ],
    },
    {
      target: "documents",
      title: "Please read these first",
      body: [
        "The Ambassador Guide and the Privacy Policy explain the rules for mentoring on PeerVia. They take a few minutes to read and they keep everyone safe.",
      ],
    },
    {
      target: "guru",
      title: "Questions? Ask me.",
      body: [
        "If you have feedback or a question, write it here and it comes straight to me.",
        "To see this tour again, press How PeerVia works at the top of your dashboard.",
      ],
    },
  ];
}

export default function MentorWelcomeTour({ open, onClose, mentorId, firstName }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);

  const steps = getSteps(firstName);
  const s = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;
  const spotlight = Boolean(s.target && rect);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  // Scroll to the area for this step and keep the highlight on top of it
  useEffect(() => {
    if (!open || !s.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${s.target}"]`);
    if (!el) {
      setRect(null);
      return;
    }

    const top = window.scrollY + el.getBoundingClientRect().top - 96;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });

    let frame;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      });
    };

    measure();
    const settle = setTimeout(measure, 500);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [open, step]);

  // Close with Escape, and lock the page scroll only for the centred pop-ups
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    if (!spotlight) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, spotlight, onClose]);

  if (!open) return null;

  const content = (
    <>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 text-muted hover:text-ink transition"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>

      <div className="flex items-center gap-3 mb-4 pr-6">
        <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
          <Image src="/logo.png" alt="PeerVia logo" width={32} height={32} className="object-contain" />
        </div>
        <div>
          <p className="font-label text-[10px] tracking-[0.15em] uppercase text-primary">
            From Guru, founder of PeerVia
          </p>
          <p className="font-label text-[10px] tracking-[0.1em] uppercase text-muted">
            Step {step + 1} of {steps.length}
          </p>
        </div>
      </div>

      <h3 className="font-display text-2xl text-ink leading-tight mb-3">{s.title}</h3>

      {s.body.map((text, i) => (
        <p key={i} className="text-sm text-muted leading-relaxed mb-3">
          {text}
        </p>
      ))}

      {s.points && (
        <ul className="space-y-2.5 mb-4">
          {s.points.map((point, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-ink leading-relaxed">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              {point}
            </li>
          ))}
        </ul>
      )}

      {s.link && mentorId && (
        <a
          href={`/mentors/${mentorId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm font-semibold text-primary underline underline-offset-4 hover:opacity-80 mb-4"
        >
          See my public page ↗
        </a>
      )}

      <div className="flex items-center gap-1.5 mt-4 mb-4">
        {steps.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === step ? "w-5 bg-primary" : "w-1.5 bg-border"
            }`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
        {isLast ? (
          <span />
        ) : (
          <button type="button" onClick={onClose} className="text-sm font-medium text-muted hover:text-ink">
            Skip tour
          </button>
        )}

        <div className="flex items-center gap-4">
          {!isFirst && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="text-sm font-medium text-muted hover:text-ink"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={isLast ? onClose : () => setStep(step + 1)}
            className="bg-ink text-white px-5 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition"
          >
            {isLast ? "Got it" : "Next →"}
          </button>
        </div>
      </div>
    </>
  );

  // Spotlight: dim everything except the highlighted area, card docked at the bottom
  if (spotlight) {
    return (
      <>
        <div className="fixed inset-0 z-[60]" />
        <div
          className="fixed z-[61] rounded-lg pointer-events-none"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(36, 26, 18, 0.6), 0 0 0 2px var(--color-primary, #BC6C25)",
          }}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="How PeerVia works"
          className="fixed z-[62] bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg max-h-[60vh] overflow-y-auto bg-surface border border-border rounded-2xl p-6 shadow-xl"
        >
          {content}
        </div>
      </>
    );
  }

  // Centred pop-up (welcome step and the public page step)
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="How PeerVia works"
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface border border-border rounded-2xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  );
}