"use client";
import { useState, useRef, useEffect } from "react";

export default function MultiSelect({ label, options, selected, onChange, getOptionStyle }) {
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
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
     <button
  type="button"
  onClick={() => setOpen(!open)}
  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-left text-sm text-gray-900 bg-white flex justify-between items-center gap-2 hover:border-gray-400 transition"
>
  <span className="flex flex-wrap gap-1.5 flex-1 min-w-0">
    {selected.length === 0 ? (
      <span className="text-gray-400 py-0.5">{`Select ${label.toLowerCase()}...`}</span>
    ) : (
      selected.map((option) => {
        const style = getOptionStyle?.(option);
        return (
          <span
            key={option}
            className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
              style ? style.color : "bg-gray-100 text-gray-700"
            }`}
          >
            {style?.icon} {option}
          </span>
        );
      })
    )}
  </span>
  <span className="text-gray-400 ml-2 shrink-0">▾</span>
</button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 flex flex-col">
          <div className="p-2 border-b border-gray-100 shrink-0">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              autoFocus
              className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>

          <div className="overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <p className="text-sm text-gray-400 px-4 py-3">No options found</p>
            ) : (
              filteredOptions.map((option) => {
                const style = getOptionStyle?.(option);
                return (
                  <label
                    key={option}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(option)}
                      onChange={() => toggleOption(option)}
                      className="w-4 h-4 accent-green-600 shrink-0"
                    />
                    {style ? (
                      <span
                        className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${style.color}`}
                      >
                        {style.icon} {option}
                      </span>
                    ) : (
                      option
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}