"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
// Predefined event types — mentors pick one instead of typing everything
// from scratch. The `key` is what gets saved in the `color` column.
import { EVENT_TYPES } from "@/lib/eventTypes";

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function MentorCalendarEditor({ mentorId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [formType, setFormType] = useState("session");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTime, setFormTime] = useState("");
  const [saving, setSaving] = useState(false);

  const today = new Date();

  useEffect(() => {
    async function loadEvents() {
      if (!mentorId) return;
      const { data } = await supabase
        .from("mentor_calendar_events")
        .select("*")
        .eq("mentor_id", mentorId)
        .order("event_date", { ascending: true });
      setEvents(data || []);
      setLoading(false);
    }
    loadEvents();
  }, [mentorId]);

  const eventsByDate = useMemo(() => {
    const map = {};
    for (const ev of events) {
      if (!map[ev.event_date]) map[ev.event_date] = [];
      map[ev.event_date].push(ev);
    }
    return map;
  }, [events]);

  const days = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [monthCursor]);

  function changeMonth(delta) {
    setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + delta, 1));
  }

  function goToToday() {
    setMonthCursor(new Date());
    setSelectedDate(toDateKey(new Date()));
  }

  async function handleAddEvent(e) {
    e.preventDefault();
    if (!selectedDate || !formTitle.trim()) return;
    setSaving(true);

    const { data, error } = await supabase
      .from("mentor_calendar_events")
      .insert({
        mentor_id: mentorId,
        event_date: selectedDate,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        time_label: formTime.trim() || null,
        color: formType,
      })
      .select()
      .single();

    setSaving(false);
    if (!error && data) {
      setEvents((prev) => [...prev, data]);
      setFormTitle("");
      setFormDescription("");
      setFormTime("");
      setFormType("session");
    }
  }

  async function handleDeleteEvent(id) {
    const { error } = await supabase.from("mentor_calendar_events").delete().eq("id", id);
    if (!error) setEvents((prev) => prev.filter((ev) => ev.id !== id));
  }

  if (loading) return <p className="text-gray-500 text-sm">Loading calendar...</p>;

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];
  const monthLabel = monthCursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => changeMonth(-1)} className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 transition">
          ‹
        </button>
        <div className="flex items-center gap-3">
          <p className="font-semibold text-gray-900 text-lg">{monthLabel}</p>
          <button onClick={goToToday} className="text-xs font-medium text-green-700 border border-green-300 rounded-full px-2.5 py-1 hover:bg-green-50 transition">
            Today
          </button>
        </div>
        <button onClick={() => changeMonth(1)} className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 transition">
          ›
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1.5 mb-6">
        {days.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} />;
          const key = toDateKey(date);
          const dayEvents = eventsByDate[key] || [];
          const isSelected = selectedDate === key;
          const isToday = isSameDay(date, today);

          return (
            <button
              key={key}
              onClick={() => setSelectedDate(key)}
              className={`aspect-square rounded-xl border-2 text-sm p-1 flex flex-col items-center justify-center gap-1 transition ${
                isSelected
                  ? "border-green-600 bg-green-50 shadow-sm"
                  : isToday
                  ? "border-green-300 bg-white"
                  : "border-transparent hover:bg-gray-50"
              }`}
            >
              <span className={`font-medium ${isSelected ? "text-green-800" : isToday ? "text-green-700 font-bold" : "text-gray-700"}`}>
                {date.getDate()}
              </span>
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <span key={ev.id} className={`w-1.5 h-1.5 rounded-full ${EVENT_TYPES[ev.color]?.dot || EVENT_TYPES.other.dot}`}></span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day panel */}
      {selectedDate && (
        <div className="border-t border-gray-100 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h3>
            <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-gray-600 text-sm">
              Close ✕
            </button>
          </div>

          <div className="space-y-2 mb-5">
            {selectedEvents.length === 0 && (
              <p className="text-sm text-gray-400 italic">No events yet — add one below.</p>
            )}
           {selectedEvents.map((ev) => {
  const style = EVENT_TYPES[ev.color] || EVENT_TYPES.other;
  const isConfirming = confirmingDeleteId === ev.id;

  return (
    <div key={ev.id} className={`border-2 rounded-xl p-3 flex items-start justify-between gap-2 ${style.bg} ${style.border}`}>
      <div className="flex items-start gap-2">
        <span className="text-lg leading-none">{style.icon}</span>
        <div>
          <p className={`font-semibold text-sm ${style.text}`}>
            {ev.title}{ev.time_label && <span className="font-normal"> · {ev.time_label}</span>}
          </p>
          {ev.description && <p className={`text-xs mt-0.5 ${style.text} opacity-80`}>{ev.description}</p>}
        </div>
      </div>

      {isConfirming ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-xs font-medium ${style.text}`}>Delete?</span>
          <button
            onClick={() => {
              handleDeleteEvent(ev.id);
              setConfirmingDeleteId(null);
            }}
            className="text-xs font-semibold bg-red-600 text-white px-2.5 py-1 rounded-md hover:bg-red-700 transition"
          >
            Yes
          </button>
          <button
            onClick={() => setConfirmingDeleteId(null)}
            className="text-xs font-semibold bg-white text-gray-600 border border-gray-300 px-2.5 py-1 rounded-md hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmingDeleteId(ev.id)}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-white/70 hover:bg-white text-gray-500 hover:text-red-600 transition"
          title="Delete event"
        >
          🗑️
        </button>
      )}
    </div>
  );
})}
          </div>

          <form onSubmit={handleAddEvent} className="bg-gray-50 rounded-xl p-4 space-y-3">
            {/* Event type chips */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Event Type</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(EVENT_TYPES).map(([key, style]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormType(key)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border-2 transition ${
                      formType === key
                        ? `${style.bg} ${style.border} ${style.text}`
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {style.icon} {style.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              placeholder="Event title (e.g. Calculus Q&A)"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
             className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="text"
              placeholder="Time (e.g. 3:00 PM) — optional"
              value={formTime}
              onChange={(e) => setFormTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <textarea
              placeholder="Description (optional)"
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-black resize-y focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              type="submit"
              disabled={saving || !formTitle.trim()}
              className="w-full bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Event"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}