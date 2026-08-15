"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";

const COLORS = {
  green: "bg-green-100 text-green-800 border-green-300",
  blue: "bg-blue-100 text-blue-800 border-blue-300",
  purple: "bg-purple-100 text-purple-800 border-purple-300",
  amber: "bg-amber-100 text-amber-800 border-amber-300",
  rose: "bg-rose-100 text-rose-800 border-rose-300",
};

function toDateKey(date) {
  return date.toISOString().split("T")[0];
}

export default function MentorCalendarEditor({ mentorId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formColor, setFormColor] = useState("green");
  const [saving, setSaving] = useState(false);

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
    setSelectedDate(null);
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
        color: formColor,
      })
      .select()
      .single();

    setSaving(false);
    if (!error && data) {
      setEvents((prev) => [...prev, data]);
      setFormTitle("");
      setFormDescription("");
      setFormTime("");
      setFormColor("green");
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
        <button onClick={() => changeMonth(-1)} className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm">
          ← Prev
        </button>
        <p className="font-semibold text-gray-900">{monthLabel}</p>
        <button onClick={() => changeMonth(1)} className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm">
          Next →
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {days.map((date, i) => {
          if (!date) return <div key={i} />;
          const key = toDateKey(date);
          const dayEvents = eventsByDate[key] || [];
          const isSelected = selectedDate === key;

          return (
            <button
              key={key}
              onClick={() => setSelectedDate(key)}
              className={`aspect-square rounded-lg border text-sm p-1 flex flex-col items-center justify-start gap-0.5 transition ${
                isSelected ? "border-green-600 bg-green-50" : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <span className="font-medium text-gray-700">{date.getDate()}</span>
              {dayEvents.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day panel */}
      {selectedDate && (
        <div className="border-t border-gray-100 pt-5">
          <h3 className="font-semibold text-gray-900 mb-3">
            Events on {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </h3>

          <div className="space-y-2 mb-4">
            {selectedEvents.length === 0 && (
              <p className="text-sm text-gray-400">No events yet.</p>
            )}
            {selectedEvents.map((ev) => (
              <div key={ev.id} className={`border rounded-lg p-3 flex items-start justify-between ${COLORS[ev.color] || COLORS.green}`}>
                <div>
                  <p className="font-semibold text-sm">{ev.title}{ev.time_label && ` · ${ev.time_label}`}</p>
                  {ev.description && <p className="text-xs mt-0.5">{ev.description}</p>}
                </div>
                <button
                  onClick={() => handleDeleteEvent(ev.id)}
                  className="text-xs opacity-60 hover:opacity-100 ml-3 shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddEvent} className="space-y-2 bg-gray-50 rounded-lg p-4">
            <input
              type="text"
              placeholder="Event title"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Time (e.g. 3:00 PM)"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={formColor}
                onChange={(e) => setFormColor(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-2 text-sm"
              >
                {Object.keys(COLORS).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Description (optional)"
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y"
            />
            <button
              type="submit"
              disabled={saving}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Event"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}