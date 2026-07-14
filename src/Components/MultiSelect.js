"use client";
import { useState, useRef, useEffect } from "react";

export default function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
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

  return (
    <div className="relative" ref={ref}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-left text-sm text-gray-900 bg-white flex justify-between items-center hover:border-gray-400 transition"
      >
        <span className="truncate">
          {selected.length === 0
            ? `Select ${label.toLowerCase()}...`
            : selected.join(", ")}
        </span>
        <span className="text-gray-400 ml-2">▾</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {options.length === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-3">No options available</p>
          ) : (
            options.map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="w-4 h-4 accent-green-600"
                />
                {option}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}