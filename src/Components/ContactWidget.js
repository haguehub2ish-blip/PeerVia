"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";

// Gap kept between the floating button and the screen edge / footer
const EDGE_GAP = 20;

const emptyForm = { name: "", email: "", question: "", website: "" };

export default function ContactWidget() {
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState(emptyForm);
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");
  const [sentName, setSentName] = useState("");
  const buttonRef = useRef(null);

  // Keep the floating button above the footer instead of covering it: when the
  // footer scrolls into view, lift the button by however much of it is visible.
  useEffect(() => {
    const button = buttonRef.current;
    const footer = document.querySelector("footer");
    if (!button) return;

    const update = () => {
      let lift = 0;
      if (footer) {
        const top = footer.getBoundingClientRect().top;
        lift = Math.max(0, window.innerHeight - top);
      }
      button.style.bottom = `${EDGE_GAP + lift}px`;
    };

    const frame = requestAnimationFrame(update);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const openContact = () => {
    if (status === "sent" || status === "error") setStatus("idle");
    setOpen(true);
  };

  const closeContact = () => setOpen(false);

  // Close with Escape, and stop the page behind from scrolling while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contact),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setSentName(contact.name.trim().split(" ")[0]);
      setStatus("sent");
      setContact(emptyForm);
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  };

  const labelClass =
    "block font-label text-[10px] tracking-[0.1em] uppercase text-muted mb-1.5";
  const inputClass =
    "w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-ink placeholder-muted outline-none focus:ring-2 focus:ring-primary/30";

  const avatar = (
    <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
      <Image src="/logo.png" alt="PeerVia logo" width={32} height={32} className="object-contain" />
    </div>
  );

  return (
    <>
      {/* Floating help button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={openContact}
        aria-label="Have a question? Message the Team"
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{ bottom: EDGE_GAP }}
        className="group fixed right-5 z-40 flex items-center gap-3"
      >
        <span className="hidden sm:block bg-ink text-white font-label text-[10px] tracking-[0.1em] uppercase px-3 py-2 rounded-full opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition pointer-events-none">
          Questions? Ask the Team
        </span>
        <span className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg group-hover:bg-primary-dark group-hover:scale-105 transition">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
          >
            <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5" />
            <path d="M12 18.5h.01" />
          </svg>
        </span>
      </button>

      {/* Popup */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/60 p-4"
          onClick={closeContact}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Message the PeerVia team"
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface border border-border rounded-2xl p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeContact}
              aria-label="Close"
              className="absolute top-4 right-4 text-muted hover:text-ink transition"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>

            {status === "sent" ? (
              <div className="text-center py-6">
                <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <p className="font-display text-2xl text-ink mb-2">
                  Thanks{sentName ? `, ${sentName}` : ""}!
                </p>
                <p className="text-muted text-sm leading-relaxed mb-6">
                 Your message is on its way to the PeerVia team. We&rsquo;ll reply to your email as soon as we can.
                </p>
                <button
                  type="button"
                  onClick={closeContact}
                  className="font-label text-xs tracking-[0.1em] uppercase bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                {/* Personal intro */}
                <div className="flex items-center gap-3 mb-4 pr-6">
                  {avatar}
                  <h3 className="font-display text-xl text-ink leading-tight">
                    Hi, we&rsquo;re the PeerVia team
                  </h3>
                </div>

                <p className="text-sm text-muted leading-relaxed mb-5">
                  Got a question, some feedback, or thinking about becoming a mentor?{" "}
                  <span className="text-ink font-semibold">Ask away</span> &mdash; we&rsquo;d love to
hear from you, and we&rsquo;ll reply by email.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="contact-name" className={labelClass}>
                      Your Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      autoFocus
                      maxLength={200}
                      value={contact.name}
                      onChange={(e) => setContact({ ...contact, name: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-email" className={labelClass}>
                      Your Email
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      maxLength={200}
                      value={contact.email}
                      onChange={(e) => setContact({ ...contact, email: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-question" className={labelClass}>
                      What&rsquo;s On Your Mind?
                    </label>
                    <textarea
                      id="contact-question"
                      required
                      rows={4}
                      maxLength={5000}
                      value={contact.question}
                      onChange={(e) => setContact({ ...contact, question: e.target.value })}
                      placeholder="Ask us anything…"
                      className={`${inputClass} resize-y`}
                    />
                  </div>

                  {/* Honeypot: hidden from humans, bots tend to fill it */}
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={contact.website}
                    onChange={(e) => setContact({ ...contact, website: e.target.value })}
                    className="hidden"
                  />

                  {status === "error" && (
                    <p className="text-red-600 text-sm font-semibold">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="w-full font-label text-xs tracking-[0.1em] uppercase bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition disabled:opacity-60"
                  >
                    {status === "sending" ? "Sending…" : "Send Message →"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}