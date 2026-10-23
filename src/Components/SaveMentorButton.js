"use client";
import { useRouter } from "next/navigation";

function Heart({ filled }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

// variant "icon": round heart that sits on top of a mentor photo.
// variant "pill": labelled button ("Save" / "Saved") for lists.
// Safe to place inside a <Link>: clicking it never opens the mentor page.
export default function SaveMentorButton({
  saved,
  busy = false,
  loggedIn,
  onToggle,
  variant = "icon",
}) {
  const router = useRouter();

  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!loggedIn) {
      router.push("/login");
      return;
    }
    onToggle();
  }

  const label = !loggedIn
    ? "Log in to save this mentor"
    : saved
    ? "Remove from saved mentors"
    : "Save this mentor";

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-pressed={saved}
        title={label}
        className={`flex items-center gap-1.5 font-label text-[10px] tracking-[0.05em] uppercase px-3 py-1.5 rounded-full border transition disabled:opacity-50 ${
          saved
            ? "border-primary text-primary bg-primary/10"
            : "border-border text-muted bg-background hover:border-primary hover:text-primary"
        }`}
      >
        <Heart filled={saved} />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className={`absolute top-2 right-2 z-10 w-9 h-9 rounded-full bg-white/90 border border-border shadow-sm flex items-center justify-center transition hover:scale-105 disabled:opacity-60 ${
        saved ? "text-primary" : "text-muted hover:text-primary"
      }`}
    >
      <Heart filled={saved} />
    </button>
  );
}