"use client";
import { memo, useEffect, useRef, useState } from "react";
import Link from "next/link";

const INTERVAL_MS = 5200; // how long each mentor stays on top
const SHUFFLE_MS = 1200; // the whole shuffle, as one continuous motion
const STEP_DELAY_MS = 260; // the other cards start stepping forward once the top card is clear
const STEP_MS = 700; // how long the other cards take to step forward
const MAX_VISIBLE = 4; // cards you can see in the stack (one more waits out of sight)

// Where the card sits in the stack: 0 = top, higher = further back
function stackTransform(depth) {
  return `translate(${depth * 12}px, ${depth * 12}px) rotate(${depth * 2.5}deg) scale(${1 - depth * 0.04})`;
}

// ---- The path the top card follows (one smooth curve, no stops) ----
// It swings out to the left, curves around, and comes back in behind the deck.
// Numbers are the 4 control points of a curve: x and y in % of the card's size, rotation in degrees.
const PATH_X = [0, -115, -115, 0]; // how far left it swings (about -86% at the farthest point)
const PATH_Y = [0, -8, 24, 0]; // a small lift on the way out, a small dip on the way back
const PATH_ROT = [0, -14, -8, 0]; // tilts left, then straightens as it tucks in
const PATH_FRAMES = 36; // more frames = smoother curve
const FLIP_AT = 50; // % of the shuffle where the card drops behind the deck (its farthest point)

function bezier([p0, p1, p2, p3], t) {
  const m = 1 - t;
  return m * m * m * p0 + 3 * m * m * t * p1 + 3 * m * t * t * p2 + t * t * t * p3;
}

// Builds the animation once. Each card sets --end-x, --end-y, --end-rot and --shrink
// (where it should finish), so the same animation works for any deck size.
function buildShuffleCss() {
  const frames = [];
  for (let k = 0; k <= PATH_FRAMES; k++) {
    const time = k / PATH_FRAMES;
    const t = 0.5 - 0.5 * Math.cos(Math.PI * time); // starts and ends gently, fastest in the middle
    const settle = (t * t * (3 - 2 * t)).toFixed(4); // blends the card into its final spot
    const x = bezier(PATH_X, t).toFixed(2);
    const y = bezier(PATH_Y, t).toFixed(2);
    const r = bezier(PATH_ROT, t).toFixed(2);
    frames.push(
      `${(time * 100).toFixed(2)}%{transform:translate(calc(${x}% + var(--end-x) * ${settle}),calc(${y}% + var(--end-y) * ${settle})) rotate(calc(${r}deg + var(--end-rot) * ${settle})) scale(calc(1 - var(--shrink) * ${settle}))}`
    );
  }
  return (
    `@keyframes heroShuffleMove{${frames.join("")}}` +
    `@keyframes heroShuffleLayer{0%{z-index:45}${FLIP_AT}%{z-index:5}100%{z-index:5}}`
  );
}

const SHUFFLE_CSS = buildShuffleCss();

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
  // "idle" (resting) or "shuffle" (the top card is travelling back into the deck)
  const [phase, setPhase] = useState("idle");
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

  // Every few seconds, start a shuffle
  useEffect(() => {
    if (!running || phase !== "idle") return;
    const timer = setTimeout(() => {
      if (reduceMotion) setTop((x) => (x + 1) % n);
      else setPhase("shuffle");
    }, INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [running, phase, current, n, reduceMotion]);

  // When the shuffle finishes, the next mentor becomes the top card
  useEffect(() => {
    if (phase !== "shuffle") return;
    const timer = setTimeout(() => {
      setTop((x) => (x + 1) % n);
      setPhase("idle");
    }, SHUFFLE_MS);
    return () => clearTimeout(timer);
  }, [phase, n]);

  return (
    <div
      ref={wrapRef}
      // "isolate" keeps the cards' z-index values inside this box, so they can't climb above the navbar
      className="relative isolate w-full aspect-[4/5]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setHovered(false)}
    >
      <style>{SHUFFLE_CSS}</style>

      {mentors.map((m, i) => {
        const place = (i - current + n) % n; // real place in the deck, 0 = top card
        const shuffling = phase === "shuffle";
        const isLeaving = shuffling && place === 0; // the card travelling back into the deck

        // While the shuffle runs, every other card steps forward one place
        const slot = shuffling && place > 0 ? place - 1 : place;
        if (slot > MAX_VISIBLE && !isLeaving) return null; // the rest are not drawn at all

        const isTop = slot === 0 && !isLeaving;
        const waiting = slot >= MAX_VISIBLE; // waits behind the stack, fades in when it moves up
        const interactive = isTop && !shuffling;

        // Where the leaving card ends up: the back of the visible deck
        const backDepth = Math.min(n - 1, MAX_VISIBLE - 1);

        let style;
        if (isLeaving) {
          style = {
            // Where it finishes. The animation carries it there along the curve.
            transform: stackTransform(backDepth),
            zIndex: 5,
            opacity: 1,
            animation: reduceMotion
              ? "none"
              : `heroShuffleMove ${SHUFFLE_MS}ms linear both, heroShuffleLayer ${SHUFFLE_MS}ms step-end both`,
            "--end-x": `${backDepth * 12}px`,
            "--end-y": `${backDepth * 12}px`,
            "--end-rot": `${backDepth * 2.5}deg`,
            "--shrink": backDepth * 0.04,
          };
        } else {
          style = {
            transform: stackTransform(Math.min(slot, MAX_VISIBLE - 1)),
            zIndex: 40 - slot * 10,
            opacity: waiting ? 0 : 1,
            transition:
              shuffling && !reduceMotion
                ? `transform ${STEP_MS}ms cubic-bezier(0.22, 1, 0.36, 1) ${STEP_DELAY_MS}ms, opacity ${STEP_MS}ms ease ${STEP_DELAY_MS}ms`
                : "none",
          };
        }

        return (
          <Link
            key={m.id}
            href={`/mentors/${m.id}`}
            prefetch={false}
            tabIndex={interactive ? 0 : -1}
            aria-hidden={!interactive}
            className="absolute inset-0 block rounded-2xl overflow-hidden border border-border bg-surface shadow-lg"
            style={{
              ...style,
              transformOrigin: "left center",
              willChange: slot <= 1 || isLeaving ? "transform, opacity" : undefined,
              pointerEvents: interactive ? "auto" : "none",
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