"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";

// Gap kept between the floating button and the screen edge / footer
const EDGE_GAP = 20;

const emptyForm = { name: "", email: "", question: "", website: "" };

const GREETING = {
  role: "assistant",
  content:
    "Hi! I'm the PeerVia Assistant. Ask me anything about mentors, course guides, or how PeerVia works.",
};

const SUGGESTIONS = [
  "How does PeerVia work?",
  "Is it really free?",
  "How do I become a mentor?",
];

// Turns page paths in the AI's answer (like /mentors) into clickable links
const PATH_REGEX =
  /(\/(?:mentors|course-guides\/compare|course-guides|community|apply|volunteer|about|signup|login)\b)/g;

function renderMessage(text) {
  return text.split(PATH_REGEX).map((part, i) =>
    i % 2 === 1 ? (
      <a
        key={i}
        href={part}
        className="underline font-semibold text-primary hover:text-primary-dark"
      >
        {part}
      </a>
    ) : (
      part
    )
  );
}

export default function ContactWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("chat"); // chat | contact

  // Chat state
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [chatError, setChatError] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Contact form state (the old "message the team" form)
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

  const openWidget = () => {
    if (status === "sent" || status === "error") setStatus("idle");
    setOpen(true);
  };

  const closeWidget = () => {
    setOpen(false);
    setView("chat");
  };

  // Close with Escape, and stop the page behind from scrolling while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setView("chat");
      }
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Always scroll to the newest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking, open, view]);

  // Focus the chat box when the chat opens
  useEffect(() => {
    if (open && view === "chat" && inputRef.current) inputRef.current.focus();
  }, [open, view]);

  const sendChat = async (text) => {
    const clean = text.trim();
    if (!clean || thinking) return;

    const next = [...messages, { role: "user", content: clean }];
    setMessages(next);
    setInput("");
    setChatError("");
    setThinking(true);

    try {
      // The greeting is only for display, so don't send it to the AI
      const toSend = next.filter((m) => m !== GREETING);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: toSend }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "The assistant isn't available right now.");
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setChatError(err.message || "Something went wrong. Please try again.");
    } finally {
      setThinking(false);
    }
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    sendChat(input);
  };

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
    <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
      <Image src="/logo.png" alt="PeerVia logo" width={28} height={28} className="object-contain" />
    </div>
  );

  const closeIcon = (
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
  );

  return (
    <>
      {/* Floating chat button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={openWidget}
        aria-label="Chat with the PeerVia Assistant"
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{ bottom: EDGE_GAP }}
        className="group fixed right-5 z-40 flex items-center gap-3"
      >
        <span className="hidden sm:block bg-ink text-white font-label text-[10px] tracking-[0.1em] uppercase px-3 py-2 rounded-full opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition pointer-events-none">
          Questions? Ask our AI
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
            <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.8 8.8 0 0 1-3.6-.8L3 21l1.9-5.4A8.4 8.4 0 1 1 21 11.5Z" />
            <path d="M8.5 11.5h.01" />
            <path d="M12 11.5h.01" />
            <path d="M15.5 11.5h.01" />
          </svg>
        </span>
      </button>

      {/* Popup */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/60 p-4"
          onClick={closeWidget}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={view === "chat" ? "PeerVia Assistant" : "Message the PeerVia team"}
            className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-surface border border-border rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeWidget}
              aria-label="Close"
              className="absolute top-4 right-4 z-10 text-muted hover:text-ink transition"
            >
              {closeIcon}
            </button>

            {view === "chat" ? (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 px-5 pt-5 pb-4 pr-12 border-b border-border">
                  {avatar}
                  <div>
                    <h3 className="font-display text-lg text-ink leading-tight">
                      PeerVia Assistant
                    </h3>
                    <p className="font-label text-[10px] tracking-[0.1em] uppercase text-muted">
                      AI helper &middot; Free
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-[260px]"
                  aria-live="polite"
                >
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          m.role === "user"
                            ? "bg-primary text-white rounded-br-md"
                            : "bg-background border border-border text-ink rounded-bl-md"
                        }`}
                      >
                        {m.role === "assistant" ? renderMessage(m.content) : m.content}
                      </div>
                    </div>
                  ))}

                  {/* Quick questions, only before the first message */}
                  {messages.length === 1 && !thinking && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => sendChat(s)}
                          className="text-xs text-ink bg-background border border-border rounded-full px-3 py-1.5 hover:border-primary hover:text-primary transition"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {thinking && (
                    <div className="flex justify-start">
                      <div className="bg-background border border-border rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce [animation-delay:0.15s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce [animation-delay:0.3s]" />
                      </div>
                    </div>
                  )}

                  {chatError && (
                    <p className="text-red-600 text-sm font-semibold">{chatError}</p>
                  )}
                </div>

                {/* Input */}
                <form
                  onSubmit={handleChatSubmit}
                  className="px-5 pt-3 pb-2 border-t border-border flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    maxLength={1000}
                    placeholder="Ask a question…"
                    aria-label="Your question"
                    className={inputClass}
                  />
                  <button
                    type="submit"
                    disabled={thinking || !input.trim()}
                    aria-label="Send"
                    className="shrink-0 w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition disabled:opacity-50"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4"
                    >
                      <path d="m22 2-7 20-4-9-9-4Z" />
                      <path d="M22 2 11 13" />
                    </svg>
                  </button>
                </form>

                <div className="px-5 pb-4 text-center">
                  <p className="text-[11px] text-muted leading-snug">
                    AI can make mistakes. Need a real person?{" "}
                    <button
                      type="button"
                      onClick={() => setView("contact")}
                      className="underline font-semibold text-primary hover:text-primary-dark"
                    >
                      Message the team
                    </button>
                  </p>
                </div>
              </>
            ) : (
              <div className="p-6 overflow-y-auto">
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
                      onClick={closeWidget}
                      className="font-label text-xs tracking-[0.1em] uppercase bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setView("chat")}
                      className="font-label text-[10px] tracking-[0.1em] uppercase text-muted hover:text-ink transition mb-4"
                    >
                      &larr; Back to chat
                    </button>

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
            )}
          </div>
        </div>
      )}
    </>
  );
}