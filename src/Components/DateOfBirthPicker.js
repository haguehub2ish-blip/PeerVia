"use client";
import { useState } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MIN_YEAR = 1930;

const selectClass =
  "w-full border border-border rounded-md px-3 py-2.5 text-sm text-ink bg-background focus:outline-none focus:ring-2 focus:ring-ink/20";

// Three dropdowns (day, month, year). Calls onChange with "YYYY-MM-DD", or "" until all three are chosen.
export default function DateOfBirthPicker({ onChange }) {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const thisYear = new Date().getFullYear();
  const years = [];
  for (let y = thisYear; y >= MIN_YEAR; y--) years.push(y);

  const maxDay = month && year ? new Date(Number(year), Number(month), 0).getDate() : 31;
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  function update(d, m, y) {
    // if the chosen day doesn't exist in the new month (e.g. 31 February), use the last day instead
    if (d && m && y) {
      const last = new Date(Number(y), Number(m), 0).getDate();
      if (Number(d) > last) d = String(last);
    }
    setDay(d);
    setMonth(m);
    setYear(y);

    if (d && m && y) {
      onChange(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    } else {
      onChange("");
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        required
        aria-label="Day"
        value={day}
        onChange={(e) => update(e.target.value, month, year)}
        className={selectClass}
      >
        <option value="" disabled>Day</option>
        {days.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      <select
        required
        aria-label="Month"
        value={month}
        onChange={(e) => update(day, e.target.value, year)}
        className={selectClass}
      >
        <option value="" disabled>Month</option>
        {MONTHS.map((name, i) => (
          <option key={name} value={i + 1}>{name}</option>
        ))}
      </select>

      <select
        required
        aria-label="Year"
        value={year}
        onChange={(e) => update(day, month, e.target.value)}
        className={selectClass}
      >
        <option value="" disabled>Year</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}