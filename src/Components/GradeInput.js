"use client";
import { useEffect, useRef, useState } from "react";

const SYSTEMS = [
  { id: "ib", label: "IB Diploma", type: "choice", min: 24, max: 45, suffix: "/45", hint: "Your total points out of 45, including bonus points." },
  { id: "alevel", label: "A-Levels", type: "text", placeholder: "e.g. A*AA", hint: "Your three best grades, for example A*AA or AAB." },
  { id: "vwo", label: "Dutch VWO / Gymnasium / HAVO", type: "number", min: 1, max: 10, suffix: "/10", hint: "Your average final grade (gemiddeld eindcijfer), from 1 to 10." },
  { id: "atar", label: "Australian ATAR", type: "number", min: 0, max: 99.95, suffix: "", hint: "Your ATAR, from 0 to 99.95." },
  { id: "austria", label: "Austrian Matura", type: "number", min: 1, max: 5, suffix: "", hint: "Your average grade, from 1 (best) to 5." },
  { id: "belgium", label: "Belgian Secondary Diploma", type: "number", min: 50, max: 100, suffix: "%", hint: "Your final percentage." },
  { id: "bulgaria", label: "Bulgarian Diploma", type: "number", min: 3, max: 6, suffix: "/6", hint: "Your average grade, from 3 to 6." },
  { id: "canada", label: "Canadian High School Average", type: "number", min: 50, max: 100, suffix: "%", hint: "Your final average percentage." },
  { id: "czech", label: "Czech / Slovak Maturita", type: "number", min: 1, max: 5, suffix: "", hint: "Your average grade, from 1 (best) to 5." },
  { id: "denmark", label: "Danish Studentereksamen", type: "number", min: 2, max: 12, suffix: "", hint: "Your average on the 12-point scale." },
  { id: "eb", label: "European Baccalaureate", type: "number", min: 60, max: 100, suffix: "%", hint: "Your final result as a percentage." },
  { id: "bac", label: "French Baccalauréat", type: "number", min: 10, max: 20, suffix: "/20", hint: "Your final average out of 20." },
  { id: "abitur", label: "German Abitur", type: "number", min: 1, max: 4, suffix: "", hint: "Your overall grade, from 1.0 (best) to 4.0." },
  { id: "greek", label: "Greek Apolytirion / Panhellenic", type: "number", min: 9.5, max: 20, suffix: "/20", hint: "Your grade out of 20." },
  { id: "cbse", label: "Indian CBSE / ISC", type: "number", min: 33, max: 100, suffix: "%", hint: "Your final percentage." },
  { id: "maturita", label: "Italian Maturità", type: "number", min: 60, max: 100, suffix: "/100", hint: "Your final mark out of 100." },
  { id: "matura", label: "Polish Matura", type: "number", min: 30, max: 100, suffix: "%", hint: "Your final percentage." },
  { id: "portugal", label: "Portuguese Secondary Diploma", type: "number", min: 10, max: 20, suffix: "/20", hint: "Your final average out of 20." },
  { id: "romania", label: "Romanian Bacalaureat", type: "number", min: 6, max: 10, suffix: "/10", hint: "Your Baccalaureate average, from 6.00 to 10.00." },
  { id: "highers", label: "Scottish Highers / Advanced Highers", type: "text", placeholder: "e.g. AAAAB Highers", hint: "Your Highers and Advanced Highers results." },
  { id: "bachillerato", label: "Spanish Bachillerato (EBAU / EvAU)", type: "number", min: 5, max: 14, suffix: "/14", hint: "Your admission mark out of 14." },
  { id: "sweden", label: "Swedish Gymnasium (GPA)", type: "number", min: 10, max: 22.5, suffix: "", hint: "Your GPA out of 20 (up to 22.5 with merit points)." },
  { id: "swiss", label: "Swiss Matura", type: "number", min: 1, max: 6, suffix: "/6", hint: "Your final average out of 6." },
  { id: "turkey", label: "Turkish High School Diploma", type: "number", min: 50, max: 100, suffix: "/100", hint: "Your diploma grade out of 100." },
  { id: "uanmt", label: "Ukrainian NMT / ZNO", type: "number", min: 100, max: 200, suffix: "/200", hint: "Your exam score, from 100 to 200." },
  { id: "ua12", label: "Ukrainian School Certificate (12-point)", type: "number", min: 1, max: 12, suffix: "/12", hint: "Your average mark on the 12-point scale, from 1 to 12." },
  { id: "gpa", label: "US High School GPA", type: "number", min: 0, max: 5, suffix: "", hint: "Your cumulative GPA. Weighted GPAs up to 5.0 are fine." },
  { id: "other", label: "Other", type: "other", placeholder: "Your grading system and grade, e.g. Hungarian érettségi 88%", hint: "Write the name of your grading system and your result." },
];

const INPUT_CLASS =
  "w-full border border-border rounded-lg px-4 py-2.5 text-ink bg-background placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-primary";

function toNumber(text) {
  return parseFloat(String(text).replace(",", "."));
}

// Turns a saved string such as "IB Diploma: 42/45" back into a system and a value.
function parse(value) {
  if (!value) return { systemId: "", raw: "" };
  for (const s of SYSTEMS) {
    if (s.id === "other") continue;
    const prefix = `${s.label}: `;
    if (value.startsWith(prefix)) {
      const rest = value.slice(prefix.length);
      if (s.type === "text") return { systemId: s.id, raw: rest };
      const n = toNumber(rest);
      return { systemId: s.id, raw: Number.isFinite(n) ? String(n) : "" };
    }
  }
  return { systemId: "other", raw: value };
}

// Turns a system and a value into the text that gets saved. Returns "" if it is not valid.
function build(system, raw) {
  const text = (raw || "").trim();
  if (!system || !text) return "";
  if (system.type === "other") return text;
  if (system.type === "text") return `${system.label}: ${text}`;
  const n = toNumber(text);
  if (!Number.isFinite(n) || n < system.min || n > system.max) return "";
  return `${system.label}: ${n}${system.suffix || ""}`;
}

export default function GradeInput({ value, onChange, className = "" }) {
  const initial = parse(value);
  const [systemId, setSystemId] = useState(initial.systemId);
  const [raw, setRaw] = useState(initial.raw);
  const lastEmitted = useRef(value || "");

  // If the value changes from outside (for example when a saved profile loads), show it.
  useEffect(() => {
    if ((value || "") !== lastEmitted.current) {
      const p = parse(value);
      setSystemId(p.systemId);
      setRaw(p.raw);
      lastEmitted.current = value || "";
    }
  }, [value]);

  const system = SYSTEMS.find((s) => s.id === systemId);

  function emit(nextSystemId, nextRaw) {
    const next = build(SYSTEMS.find((s) => s.id === nextSystemId), nextRaw);
    lastEmitted.current = next;
    onChange(next);
  }

  function handleSystemChange(e) {
    const id = e.target.value;
    setSystemId(id);
    setRaw("");
    emit(id, "");
  }

  function handleRawChange(next) {
    setRaw(next);
    emit(systemId, next);
  }

  const number = toNumber(raw);
  const invalid =
    system?.type === "number" &&
    raw !== "" &&
    (!Number.isFinite(number) || number < system.min || number > system.max);

  return (
    <div className={className}>
      <select value={systemId} onChange={handleSystemChange} className={INPUT_CLASS}>
        <option value="">Choose your grading system</option>
        {SYSTEMS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>

      {system && (
        <div className="mt-3">
          {system.type === "choice" ? (
            <select value={raw} onChange={(e) => handleRawChange(e.target.value)} className={INPUT_CLASS}>
              <option value="">Select your points</option>
              {Array.from({ length: system.max - system.min + 1 }, (_, i) => system.max - i).map((n) => (
                <option key={n} value={n}>
                  {n} / {system.max}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              inputMode={system.type === "number" ? "decimal" : "text"}
              value={raw}
              onChange={(e) => handleRawChange(e.target.value)}
              placeholder={
                system.type === "number" ? `${system.min} to ${system.max}` : system.placeholder
              }
              className={INPUT_CLASS}
            />
          )}

          {invalid ? (
            <p className="text-xs text-red-600 mt-1.5">
              Enter a number between {system.min} and {system.max}.
            </p>
          ) : (
            <p className="text-xs text-muted mt-1.5">{system.hint}</p>
          )}
        </div>
      )}
    </div>
  );
}