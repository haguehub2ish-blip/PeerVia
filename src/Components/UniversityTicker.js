"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

// Logo files live in public/universities/. A university without a file shows its name instead.
// Names must match the apply form exactly (capital letters don't matter).
const UNIVERSITY_LOGOS = {
  "Amsterdam University of Applied Sciences": "/universities/hva.png",
  "Avans University of Applied Sciences": "/universities/avans.png",
  "Breda University of Applied Sciences": "/universities/buas.png",
  "Eindhoven University of Technology": "/universities/tue.png",
  "Erasmus University Rotterdam": "/universities/erasmus.png",
  "Fontys University of Applied Sciences": "/universities/fontys.png",
  "HAN University of Applied Sciences": "/universities/han.png",
  "HU University of Applied Sciences Utrecht": "/universities/hu.png",
  "HZ University of Applied Sciences": "/universities/hz.png",
  "Hanze University of Applied Sciences": "/universities/hanze.png",
  "Inholland University of Applied Sciences": "/universities/inholland.png",
  "Leiden University": "/universities/leiden.png",
  "Maastricht University": "/universities/maastricht.png",
  "NHL Stenden University of Applied Sciences": "/universities/nhl-stenden.png",
  "Nyenrode Business University": "/universities/nyenrode.png",
  "Open University of the Netherlands": "/universities/ou.png",
  "Protestant Theological University": "/universities/ptu.png",
  "Radboud University": "/universities/radboud.png",
  "Rotterdam University of Applied Sciences": "/universities/rotterdam-uas.png",
  "Saxion University of Applied Sciences": "/universities/saxion.png",
  "TU Delft": "/universities/tu-delft.png",
  "The Hague University of Applied Sciences": "/universities/thuas.png",
  "Tilburg University": "/universities/tilburg.png",
  "University of Amsterdam": "/universities/uva.png",
  "University of Groningen": "/universities/groningen.png",
  "University of Humanistic Studies": "/universities/uvh.png",
  "University of Oxford": "/universities/oxford.png",
  "University of Twente": "/universities/twente.png",
  "Utrecht University": "/universities/utrecht.png",
  "Vrije Universiteit Amsterdam": "/universities/vu.png",
  "Wageningen University & Research": "/universities/wur.png",
  "Windesheim University of Applied Sciences": "/universities/windesheim.png",
  "Zuyd University of Applied Sciences": "/universities/zuyd.png",
};

const LOGOS_BY_KEY = Object.fromEntries(
  Object.entries(UNIVERSITY_LOGOS).map(([name, file]) => [name.trim().toLowerCase(), file])
);

function UniversityBadge({ name, logo }) {
  const [failed, setFailed] = useState(false);
  if (logo && !failed) {
    return (
      <img
        src={logo}
        alt={name}
        onError={() => setFailed(true)}
        className="h-10 w-auto max-w-[160px] object-contain"
      />
    );
  }
  return <span className="font-display text-xl text-ink whitespace-nowrap">{name}</span>;
}

const COPIES = 8; // the list is repeated so the loop never shows a gap
const SPEED = 0.04; // pixels per millisecond (about 40px per second)

export default function UniversityTicker({ mentors = [] }) {
  const scrollRef = useRef(null);

    const universities = useMemo(() => {
    const byKey = new Map();
    for (const m of mentors) {
      const name = (m.school || "").trim().replace(/\s+/g, " ");
      if (!name) continue;
      const key = name.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, name);
    }
    return [...byKey.values()].sort((a, b) => a.localeCompare(b));
  }, [mentors]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || universities.length === 0) return;

    // Keep the scroll position inside the middle copies so the loop never ends.
    function normalize() {
      const loop = el.scrollWidth / COPIES;
      if (!loop) return;
      if (el.scrollLeft >= loop * 2) el.scrollLeft -= loop;
      else if (el.scrollLeft < loop) el.scrollLeft += loop;
    }

    el.scrollLeft = el.scrollWidth / COPIES;
    el.addEventListener("scroll", normalize, { passive: true });

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || universities.length < 2) {
      return () => el.removeEventListener("scroll", normalize);
    }

    let raf;
    let last = performance.now();
    let pos = el.scrollLeft;

    function tick(now) {
      const dt = now - last;
      last = now;

      // If someone scrolled by hand, carry on from where they left it.
      if (Math.abs(el.scrollLeft - pos) > 2) pos = el.scrollLeft;

      pos += dt * SPEED;
      el.scrollLeft = pos;

      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", normalize);
    };
  }, [universities.length]);

  if (universities.length === 0) return null;

  const fade = "linear-gradient(to right, transparent, black 8%, black 92%, transparent)";

  return (
    <section className="bg-surface border-y border-border py-6">
      <div
        ref={scrollRef}
        className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: fade, WebkitMaskImage: fade }}
      >
        {Array.from({ length: COPIES }).map((_, copy) =>
          universities.map((name) => {
            const logo = LOGOS_BY_KEY[name.trim().toLowerCase()];
            return (
              <Link
                key={`${copy}-${name}`}
                href={`/mentors?school=${encodeURIComponent(name)}`}
                aria-hidden={copy !== 0}
                tabIndex={copy !== 0 ? -1 : 0}
                className="shrink-0 flex items-center px-10 py-2 opacity-80 hover:opacity-100 transition"
              >
                <UniversityBadge name={name} logo={logo} />
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}