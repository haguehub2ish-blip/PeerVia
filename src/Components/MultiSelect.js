"use client";
import { useState, useRef, useEffect } from "react";

export default function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleOption(option) {
    if (selected.includes(option)) {
      onChange(selected.filter((o) => o !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  const filteredOptions = [...options]
    .sort((a, b) => a.localeCompare(b))
    .filter((option) => option.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      {label && (
        <label className="block text-sm font-medium text-ink mb-1">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full border border-border rounded-md px-3 py-2 text-left text-sm text-ink bg-background flex justify-between items-center gap-2 hover:border-ink/30 transition"
      >
        <span className="flex flex-wrap gap-1.5 flex-1 min-w-0">
          {selected.length === 0 ? (
            <span className="text-muted py-0.5">
              {label ? `Select ${label.toLowerCase()}...` : "Select..."}
            </span>
          ) : (
            selected.map((option) => (
              <span
                key={option}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOption(option);
                }}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-surface text-ink border border-border hover:border-ink/30 transition"
              >
                {option}
                <span className="text-muted">×</span>
              </span>
            ))
          )}
        </span>
        <span className="text-muted ml-2 shrink-0 text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-background border border-border rounded-md shadow-lg max-h-72 flex flex-col">
          <div className="p-2 border-b border-border shrink-0">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={label ? `Search ${label.toLowerCase()}...` : "Search..."}
              autoFocus
              className="w-full border border-border rounded px-3 py-1.5 text-sm text-ink placeholder-muted bg-surface focus:outline-none focus:ring-2 focus:ring-ink/20"
            />
          </div>

          <div className="overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <p className="text-sm text-muted px-4 py-3">No options found</p>
            ) : (
              filteredOptions.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink hover:bg-surface cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => toggleOption(option)}
                    className="w-4 h-4 accent-ink shrink-0"
                  />
                  {option}
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}