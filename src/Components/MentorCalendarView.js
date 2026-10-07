"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { EVENT_TYPES } from "@/lib/eventTypes";
import { ChevronIcon, XIcon, EventTypeIcon } from "@/Components/CalendarIcons";

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function tint(hex, alphaHex) {
  return `${hex}${alphaHex}`;
}

export default function MentorCalendarView({ mentorId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

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

  if (loading) return <p className="text-muted text-sm">Loading calendar...</p>;

  if (events.length === 0) {
    return <p className="text-muted text-sm italic">No upcoming events posted yet.</p>;
  }

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];
  const monthLabel = monthCursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => changeMonth(-1)}
          aria-label="Previous month"
          className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-muted hover:bg-background hover:text-ink transition"
        >
          <ChevronIcon className="w-4 h-4 rotate-180" />
        </button>
        <p className="font-display text-ink">{monthLabel}</p>
        <button
          onClick={() => changeMonth(1)}
          aria-label="Next month"
          className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-muted hover:bg-background hover:text-ink transition"
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
      <div className="grid grid-cols-7 gap-1.5 mb-5">
        {days.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} />;
          const key = toDateKey(date);
          const dayEvents = eventsByDate[key] || [];
          const isSelected = selectedDate === key;
          const isToday = isSameDay(date, today);
          const hasEvents = dayEvents.length > 0;

          return (
            <button
              key={key}
              onClick={() => hasEvents && setSelectedDate(key)}
              disabled={!hasEvents}
              className={`aspect-square rounded-lg border text-sm p-1 flex flex-col items-center justify-center gap-1 transition ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : isToday
                  ? "border-primary/40 bg-surface"
                  : hasEvents
                  ? "border-transparent hover:bg-background cursor-pointer"
                  : "border-transparent opacity-40 cursor-default"
              }`}
            >
              <span className={`font-medium ${isSelected || isToday ? "text-primary" : "text-ink"}`}>
                {date.getDate()}
              </span>
              {hasEvents && (
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

      {/* Selected day panel — read only */}
      {selectedDate && (
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-ink text-sm">
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

          <div className="space-y-2">
            {selectedEvents.map((ev) => {
              const style = EVENT_TYPES[ev.color] || EVENT_TYPES.other;
              return (
                <div
                  key={ev.id}
                  className="border rounded-lg p-3 flex items-start gap-2.5"
                  style={{ backgroundColor: tint(style.accent, "14"), borderColor: tint(style.accent, "40") }}
                >
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}