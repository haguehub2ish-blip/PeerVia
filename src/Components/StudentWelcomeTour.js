"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "peervia_tour_step";

// Which "page" the visitor is on. Every mentor profile counts as the same page, "profile".
function pageKey(pathname) {
  return pathname.startsWith("/mentors/") ? "profile" : pathname;
}

function saveStep(index) {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(index));
  } catch (e) {}
}

function clearStep() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}

// `page` is where the step happens and `target` matches a data-tour="..." attribute on that page.
// Steps with no page show as a normal pop-up wherever the student is.
// To remove a step, delete its { ... } block. To add one, copy a block and change the text.
function getSteps(firstName, isMinor) {
  const callPoints = [
    "Press Book a Call, add your email and tell the mentor what you'd like to talk about.",
    "They reply by email to agree a time. Calls last about 25 to 30 minutes.",
    "Calls are always online, and always free.",
    "You need to be logged in to send a request. If a mentor isn't open for bookings right now, you can still read their page.",
  ];
  if (isMinor) {
    callPoints.push(
      "Because you're under 18, your parent or guardian gets your request first. They have to approve it, and they must be with you during the call."
    );
  }

  return [
    {
      title: `Welcome to PeerVia${firstName ? `, ${firstName}` : ""}!`,
      body: [
        "PeerVia is a free, student-led platform that connects high school students with real university students.",
        "You can talk to mentors, ask the community questions, read honest course guides and even help us grow. We'll show you around, page by page.",
      ],
    },
    {
      page: "/mentors",
      target: "mentors-filters",
      title: "Find a mentor",
      body: [
        "This is the Mentors page, which you can always open from the top menu. Every mentor here is a verified university student.",
        "Use the search bar above to look up a name, university, course or field, or use these tabs to narrow the list down.",
      ],
      points: [
        "Filter by field, country, university or language.",
        "Use Sort to see the highest rated mentors, or the ones with the most sessions or answers.",
        "Switch on Open for Booking to see only mentors who are taking requests right now.",
      ],
    },
    {
      page: "/mentors",
      target: "mentors-first",
      title: "Pick someone like you",
      body: [
        "Each card is a real student. It shows their course, their university and where they're from.",
        "Click a card to open their page and read their story. Look for someone whose path looks like the one you're thinking about.",
      ],
    },
    {
      page: "profile",
      target: "profile-reviews",
      title: "Get to know them first",
      body: ["A mentor's page tells you who they are before you ever talk to them."],
      points: [
        "Read their story, and what they can help you with.",
        "Check their upcoming availability, if they've shared it.",
        "See their rating and what other students said in the reviews. After a chat, you can leave one too.",
        "Use Share at the top to send their page to a friend or a parent.",
      ],
    },
    {
      page: "profile",
      target: "book",
      title: "Ask for a call",
      body: ["The box on this side is where you ask for a short online chat."],
      points: callPoints,
    },
    {
      page: "/community",
      target: "community-ask",
      title: "Ask the community",
      body: [
        "The Community page is where you can ask anything. Type your question here, press Ask, and verified mentors will answer.",
        "Before you post, you can tag your question with a subject and a country so the right mentors see it. That part is optional.",
        "You need to be logged in to ask. You get an email when a mentor answers.",
      ],
    },
    {
      page: "/community",
      target: "community-feed",
      title: "Read the answers",
      body: ["Every question and answer is public, so you can learn from what other students asked."],
      points: [
        "Open a question to read the mentor's answer.",
        "Press Found helpful on answers that helped you, and add a comment.",
        "Filter by field and country to find what matters to you.",
      ],
    },
    {
      page: "/course-guides",
      target: "guides-first",
      title: "Read the course guides",
      body: [
        "Course Guides explain what popular courses are really like in the Netherlands and the UK, including where you can study them.",
        "Use the buttons at the top to switch country or field, then click a guide to read it. At the bottom of each guide you can jump straight to mentors in that field.",
      ],
    },
    {
      page: "/course-guides",
      target: "guides-compare",
      title: "Compare guides side by side",
      body: [
        "Can't decide between two courses? Press Compare guides, pick two or three, and see them next to each other.",
      ],
    },
    {
      page: "/volunteer",
      target: "volunteer-roles",
      title: "Want to help PeerVia?",
      body: [
        "PeerVia is built by students, and you can be part of it. The Volunteer page lists the ways to help, like spreading the word at your school, helping with course guides or recruiting mentors.",
        "Pick a role, sign up, and the team will get in touch.",
      ],
    },
    {
      page: "/settings",
      target: "settings-avatar",
      title: "Make it yours",
      body: [
        "Settings is where you manage your account. You can open it from your profile picture in the top corner, or from the menu on a phone.",
        "Press the little pencil on your photo to add a profile picture.",
      ],
    },
    {
      page: "/settings",
      target: "settings-nav",
      title: "Emails and your data",
      body: ["These sections let you control your account."],
      points: [
        "Account: your basic details and profile picture.",
        "Notifications: choose which answers you want emailed to you, by field, university, mentor or country.",
        "Danger Zone: you can delete your account at any time.",
        "To see this tour again, press How PeerVia works at the top of this page.",
      ],
    },
    {
      title: "A few things to remember",
      body: [
        "Everyone who mentors on PeerVia is a volunteer sharing their own experience. It isn't professional advice, so check big decisions with your school or the university itself.",
        "Keep your personal details, like your address and phone number, to yourself.",
        "Want to know our story? Press the PeerVia logo at the top left. And if you go to university one day, you can come back and become a mentor yourself.",
        "That's it. Enjoy PeerVia!",
      ],
    },
  ];
}

export default function StudentWelcomeTour({ open, onClose, firstName, isMinor, startStep = 0 }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [busy, setBusy] = useState(false);

  const steps = getSteps(firstName, isMinor);
  const current = Math.min(step, steps.length - 1);
  const s = steps[current];
  const isFirst = current === 0;
  const isLast = current === steps.length - 1;
  const spotlight = Boolean(s.target && rect);

  useEffect(() => {
    if (!open) return;
    // If the saved step belongs to a page we are no longer on, the visitor wandered off.
    // End the tour instead of bouncing them back to that page.
    const savedStep = steps[startStep];
    if (savedStep?.page && savedStep.page !== pageKey(window.location.pathname)) {
      close();
      return;
    }
    setStep(startStep);
  }, [open, startStep]);

  // Find the highlighted element (waiting a moment if the page is still loading), scroll to it and keep the highlight on it
  useEffect(() => {
    if (!open || !s.target) {
      setRect(null);
      return;
    }

    let el = null;
    let timer;
    let settle;
    let frame;
    let tries = 0;

    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      });
    };

    const find = () => {
      el = document.querySelector(`[data-tour="${s.target}"]`);
      if (el) {
        const top = window.scrollY + el.getBoundingClientRect().top - 96;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        measure();
        settle = setTimeout(measure, 500);
        window.addEventListener("scroll", measure, { passive: true });
        window.addEventListener("resize", measure);
        return;
      }
      tries += 1;
      if (tries < 24) timer = setTimeout(find, 250);
    };

    setRect(null);
    find();

    return () => {
      clearTimeout(timer);
      clearTimeout(settle);
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [open, current]);

  function close() {
    clearStep();
    onClose();
  }

  // Close with Escape, and lock the page scroll only for the centred pop-ups
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    if (!spotlight) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, spotlight]);

  // Move to another step. If it lives on another page, go there and carry on from the same step.
  async function goTo(index, dir) {
    if (index < 0 || index >= steps.length) return;
    const next = steps[index];
    const here = pageKey(window.location.pathname);

    if (!next.page || next.page === here) {
      setStep(index);
      if (next.page) saveStep(index);
      else clearStep();
      return;
    }

    setBusy(true);
    let path = next.page;
    if (path === "profile") {
      const { data } = await supabase.from("mentorss").select("id").eq("available", true).limit(1);
      if (!data || data.length === 0) {
        setBusy(false);
        goTo(index + dir, dir); // no mentor to show, skip this step
        return;
      }
      path = `/mentors/${data[0].id}`;
    }
    saveStep(index);
    // Safety net: never send the visitor to the same page twice within 10 seconds.
    // If that happens the tour is looping, so stop it straight away.
    try {
      const now = Date.now();
      const recent = JSON.parse(sessionStorage.getItem("peervia_tour_nav") || "[]").filter((n) => now - n.t < 10000);
      console.info("[tour] going to", path, "| step", current + 1, "->", index + 1, "| recent:", recent);
      if (recent.some((n) => n.path === path)) {
        console.warn("[tour] loop detected, stopping the tour");
        sessionStorage.removeItem("peervia_tour_nav");
        setBusy(false);
        close();
        return;
      }
      recent.push({ path, t: now });
      sessionStorage.setItem("peervia_tour_nav", JSON.stringify(recent));
    } catch (e) {}
    window.location.href = path;
  }

  if (!open || typeof document === "undefined") return null;

  const content = (
    <>
      <button
        type="button"
        onClick={close}
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
          <p className="font-label text-[10px] tracking-[0.15em] uppercase text-primary">From the PeerVia Team</p>
          <p className="font-label text-[10px] tracking-[0.1em] uppercase text-muted">
            Step {current + 1} of {steps.length}
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

      <div className="flex items-center gap-1.5 mt-4 mb-4">
        {steps.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${i === current ? "w-5 bg-primary" : "w-1.5 bg-border"}`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
        {isLast ? (
          <span />
        ) : (
          <button type="button" onClick={close} className="text-sm font-medium text-muted hover:text-ink">
            Skip tour
          </button>
        )}

        <div className="flex items-center gap-4">
          {!isFirst && (
            <button
              type="button"
              disabled={busy}
              onClick={() => goTo(current - 1, -1)}
              className="text-sm font-medium text-muted hover:text-ink disabled:opacity-50"
            >
              Back
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={isLast ? close : () => goTo(current + 1, 1)}
            className="bg-ink text-white px-5 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {isLast ? "Got it" : busy ? "One moment…" : "Next →"}
          </button>
        </div>
      </div>
    </>
  );

  // Spotlight: dim everything except the highlighted area, card docked at the bottom
  if (spotlight) {
    return createPortal(
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
      </>,
      document.body
    );
  }

  // Centred pop-up (welcome step, last step, or while the page is still loading)
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-ink/60 p-4"
      onClick={close}
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
    </div>,
    document.body
  );
}