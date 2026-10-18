"use client";
import { memo, useEffect, useRef, useState } from "react";
import Link from "next/link";

const INTERVAL_MS = 5200; // how long each mentor stays on top
const SLIDE_MS = 650; // how long the shuffle movement takes
const MAX_VISIBLE = 4; // cards you can see in the stack (one more waits out of sight)

function Photo({ mentor }) {
  if (mentor.photo_url) {
    return (
      <img
        src={mentor.photo_url}
        alt={mentor.name}
        decoding="async"
        draggable={false}
        className="w-full h-full object-cover"
      />
    );
  }
  return (
    <div className="flex items-center justify-center w-full h-full text-6xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary/50 font-display">
      {mentor.initials || "?"}
    </div>
  );
}

function HeroCarousel({ mentors }) {
  const n = mentors.length;
  const [top, setTop] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [movedIndex, setMovedIndex] = useState(null);
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const wrapRef = useRef(null);

  // Respect "reduce motion" settings
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(query.matches);
    const onChange = (e) => setReduceMotion(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Stop working while the tab is in the background
  useEffect(() => {
    const onVisibility = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Stop working while the cards are scrolled out of view
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.2,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const current = n ? top % n : 0;
  const running = n > 1 && !hovered && inView && tabVisible;

  // Every few seconds, send the top card away
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => {
      if (reduceMotion) setTop((x) => (x + 1) % n);
      else setLeaving(true);
    }, INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [running, current, n, reduceMotion]);

  // When the slide-away finishes, move that card to the back of the stack
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => {
      setMovedIndex(current);
      setTop((x) => (x + 1) % n);
      setLeaving(false);
    }, SLIDE_MS);
    return () => clearTimeout(timer);
  }, [leaving, current, n]);

  // The card that just went to the back should jump there, not fly across the stack
  useEffect(() => {
    if (movedIndex === null) return;
    const timer = setTimeout(() => setMovedIndex(null), 80);
    return () => clearTimeout(timer);
  }, [movedIndex]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full aspect-[4/5]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setHovered(false)}
    >
      {mentors.map((m, i) => {
        const slot = (i - current + n) % n; // 0 = top card
        if (slot > MAX_VISIBLE) return null; // the rest are not drawn at all

        const isTop = slot === 0;
        const isLeaving = isTop && leaving;
        const waiting = slot >= MAX_VISIBLE; // waits behind the stack, fades in when it moves up
        const depth = Math.min(slot, MAX_VISIBLE - 1);
        const stack = `translate(${depth * 12}px, ${depth * 12}px) rotate(${depth * 2.5}deg) scale(${1 - depth * 0.04})`;

        let transition;
        if (reduceMotion) transition = "none";
        else if (movedIndex === i) transition = "opacity 400ms ease";
        else if (isLeaving) transition = `transform ${SLIDE_MS}ms cubic-bezier(0.45, 0, 0.9, 0.5), opacity ${SLIDE_MS}ms ease-in`;
        else transition = `transform ${SLIDE_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${SLIDE_MS}ms ease`;

        return (
          <Link
            key={m.id}
            href={`/mentors/${m.id}`}
            prefetch={false}
            tabIndex={isTop ? 0 : -1}
            aria-hidden={!isTop}
            className="absolute inset-0 block rounded-2xl overflow-hidden border border-border bg-surface shadow-lg"
            style={{
              transform: isLeaving ? "translate(-125%, 6%) rotate(-14deg)" : stack,
              opacity: isLeaving || waiting ? 0 : 1,
              zIndex: 40 - slot * 10,
              transformOrigin: "left center",
              transition,
              willChange: slot <= 1 ? "transform, opacity" : undefined,
              pointerEvents: isTop && !leaving ? "auto" : "none",
            }}
          >
            <Photo mentor={m} />
            <div className="absolute left-4 right-4 bottom-4 bg-badge/95 rounded-xl px-5 py-4">
              <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Verified Mentor
              </p>
              <p className="font-display text-white text-lg leading-tight">{m.name}</p>
              <p className="text-white/70 text-sm italic">
                {m.subject} · {m.school}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default memo(HeroCarousel);