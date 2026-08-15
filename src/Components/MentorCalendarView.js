"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
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

  if (loading) return <p className="text-gray-500 text-sm">Loading calendar...</p>;

  if (events.length === 0) {
    return <p className="text-gray-400 text-sm italic">No upcoming events posted yet.</p>;
  }

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];
  const monthLabel = monthCursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 transition">
          ‹
        </button>
        <p className="font-semibold text-gray-900">{monthLabel}</p>
        <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 transition">
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
              className={`aspect-square rounded-xl border-2 text-sm p-1 flex flex-col items-center justify-center gap-1 transition ${
                isSelected
                  ? "border-green-600 bg-green-50 shadow-sm"
                  : isToday
                  ? "border-green-300 bg-white"
                  : hasEvents
                  ? "border-transparent hover:bg-gray-50 cursor-pointer"
                  : "border-transparent opacity-40 cursor-default"
              }`}
            >
              <span className={`font-medium ${isSelected ? "text-green-800" : isToday ? "text-green-700 font-bold" : "text-gray-700"}`}>
                {date.getDate()}
              </span>
              {hasEvents && (
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

      {/* Selected day panel — read only */}
      {selectedDate && (
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h3>
            <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-gray-600 text-sm">
              Close ✕
            </button>
          </div>

          <div className="space-y-2">
            {selectedEvents.map((ev) => {
              const style = EVENT_TYPES[ev.color] || EVENT_TYPES.other;
              return (
                <div key={ev.id} className={`border-2 rounded-xl p-3 flex items-start gap-2 ${style.bg} ${style.border}`}>
                  <span className="text-lg leading-none">{style.icon}</span>
                  <div>
                    <p className={`font-semibold text-sm ${style.text}`}>
                      {ev.title}{ev.time_label && <span className="font-normal"> · {ev.time_label}</span>}
                    </p>
                    {ev.description && <p className={`text-xs mt-0.5 ${style.text} opacity-80`}>{ev.description}</p>}
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