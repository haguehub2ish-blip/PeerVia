// Event type presets for the mentor calendar.
// `icon` is a key rendered by <EventTypeIcon /> (see Components/CalendarIcons.js).
// `accent` is a single hex color, kept in the same warm/muted family as the
// site's brand palette (ochre primary, deep brown ink) rather than generic
// saturated Tailwind colors — tints/borders/dots are all derived from it at
// render time instead of hard-coded utility classes.
export const EVENT_TYPES = {
  session: { label: "Mentoring Session", icon: "chat", accent: "#BC6C25" },
  exam: { label: "Exam", icon: "document", accent: "#9B4A3D" },
  deadline: { label: "Deadline", icon: "clock", accent: "#B8872E" },
  office_hours: { label: "Office Hours", icon: "calendar", accent: "#4F6B5C" },
  study_group: { label: "Study Group", icon: "people", accent: "#6B4C66" },
  other: { label: "Other", icon: "dot", accent: "#6B5B4D" },
};