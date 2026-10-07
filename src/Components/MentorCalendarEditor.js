"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
// Predefined event types — mentors pick one instead of typing everything
// from scratch. The `key` is what gets saved in the `color` column.
import { EVENT_TYPES } from "@/lib/eventTypes";
import { ChevronIcon, XIcon, TrashIcon, EventTypeIcon } from "@/Components/CalendarIcons";

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Light tint / border / dot derived from one accent hex, so each event type
// only needs to define a single color instead of four hard-coded classes.
function tint(hex, alphaHex) {
  return `${hex}${alphaHex}`;
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

  if (loading) return <p className="text-muted text-sm">Loading calendar...</p>;

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];
  const monthLabel = monthCursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => changeMonth(-1)}
          aria-label="Previous month"
          className="w-9 h-9 flex items-center justify-center rounded-full border border-border text-muted hover:bg-background hover:text-ink transition"
        >
          <ChevronIcon className="w-4 h-4 rotate-180" />
        </button>
        <div className="flex items-center gap-3">
          <p className="font-display text-lg text-ink">{monthLabel}</p>
          <button
            onClick={goToToday}
            className="font-label text-[10px] tracking-[0.08em] uppercase text-primary border border-primary/30 rounded-full px-2.5 py-1 hover:bg-primary/5 transition"
          >
            Today
          </button>
        </div>
        <button
          onClick={() => changeMonth(1)}
          aria-label="Next month"
          className="w-9 h-9 flex items-center justify-center rounded-full border border-border text-muted hover:bg-background hover:text-ink transition"
        >
          <ChevronIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1.5 text-center font-label text-[10px] tracking-[0.08em] uppercase text-muted mb-1.5">
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
              className={`aspect-square rounded-lg border text-sm p-1 flex flex-col items-center justify-center gap-1 transition ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : isToday
                  ? "border-primary/40 bg-surface"
                  : "border-transparent hover:bg-background"
              }`}
            >
              <span className={`font-medium ${isSelected || isToday ? "text-primary" : "text-ink"}`}>
                {date.getDate()}
              </span>
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5">
                  {dayEvents.slice(0, 3).map((ev) => {
                    const style = EVENT_TYPES[ev.color] || EVENT_TYPES.other;
                    return (
                      <span
                        key={ev.id}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: style.accent }}
                      />
                    );
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day panel */}
      {selectedDate && (
        <div className="border-t border-border pt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-ink">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="flex items-center gap-1 text-xs font-medium text-muted hover:text-ink transition"
            >
              <XIcon className="w-3.5 h-3.5" />
              Close
            </button>
          </div>

          <div className="space-y-2 mb-5">
            {selectedEvents.length === 0 && (
              <p className="text-sm text-muted italic">No events yet — add one below.</p>
            )}
            {selectedEvents.map((ev) => {
              const style = EVENT_TYPES[ev.color] || EVENT_TYPES.other;
              const isConfirming = confirmingDeleteId === ev.id;

              return (
                <div
                  key={ev.id}
                  className="border rounded-lg p-3 flex items-start justify-between gap-2"
                  style={{ backgroundColor: tint(style.accent, "14"), borderColor: tint(style.accent, "40") }}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="shrink-0 mt-0.5" style={{ color: style.accent }}>
                      <EventTypeIcon type={style.icon} className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="font-semibold text-sm text-ink">
                        {ev.title}
                        {ev.time_label && <span className="font-normal text-muted"> · {ev.time_label}</span>}
                      </p>
                      {ev.description && <p className="text-xs mt-0.5 text-muted">{ev.description}</p>}
                    </div>
                  </div>

                  {isConfirming ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-medium text-ink">Delete?</span>
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
                        className="text-xs font-semibold bg-background text-ink border border-border px-2.5 py-1 rounded-md hover:bg-surface transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingDeleteId(ev.id)}
                      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md bg-background/70 hover:bg-background text-muted hover:text-red-600 transition"
                      title="Delete event"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <form onSubmit={handleAddEvent} className="bg-background border border-border rounded-lg p-4 space-y-3">
            {/* Event type chips */}
            <div>
              <label className="block font-label text-[10px] tracking-[0.08em] uppercase text-muted mb-2">
                Event Type
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(EVENT_TYPES).map(([key, style]) => {
                  const active = formType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormType(key)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition"
                      style={
                        active
                          ? { backgroundColor: tint(style.accent, "14"), borderColor: style.accent, color: style.accent }
                          : { backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-muted)" }
                      }
                    >
                      <EventTypeIcon type={style.icon} className="w-3.5 h-3.5" />
                      {style.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <input
              type="text"
              placeholder="Event title (e.g. Calculus Q&A)"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full border border-border rounded-md px-4 py-2.5 text-sm text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Time (e.g. 3:00 PM) — optional"
              value={formTime}
              onChange={(e) => setFormTime(e.target.value)}
              className="w-full border border-border rounded-md px-4 py-2.5 text-sm text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <textarea
              placeholder="Description (optional)"
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full border border-border rounded-md px-4 py-2.5 text-sm text-ink bg-surface resize-y focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={saving || !formTitle.trim()}
              className="w-full bg-ink text-white px-4 py-2.5 rounded-md text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Event"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}