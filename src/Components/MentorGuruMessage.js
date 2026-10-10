"use client";
import { useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

const KINDS = ["Question", "Feedback"];

export default function MentorGuruMessage() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("Question");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");

  async function handleSend(e) {
    e.preventDefault();
    setStatus("sending");
    setError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch("/api/mentor-message", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kind, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      setMessage("");
      setStatus("sent");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  function handleClose() {
    setOpen(false);
    setStatus("idle");
    setError("");
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-5 mb-6 shadow-sm">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
          <Image src="/logo.png" alt="PeerVia logo" width={28} height={28} className="object-contain" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="font-label text-[10px] tracking-[0.15em] uppercase text-primary mb-1">
          Message the PeerVia team
          </p>
          <h2 className="font-display text-lg text-ink leading-tight">
          Got feedback or a question? Send it straight to the PeerVia team.
          </h2>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="bg-ink text-white px-5 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition"
          >
            Write a message →
          </button>
        )}
      </div>

      {open && status === "sent" && (
        <div className="mt-5 pt-5 border-t border-border">
          <p className="text-sm text-primary font-medium mb-3">
            Sent. The PeerVia team will reply to your email as soon as possible.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setStatus("idle")}
              className="text-sm font-medium text-primary underline underline-offset-4 hover:opacity-80"
            >
              Send another
            </button>
            <button onClick={handleClose} className="text-sm font-medium text-muted hover:text-ink">
              Close
            </button>
          </div>
        </div>
      )}

      {open && status !== "sent" && (
        <form onSubmit={handleSend} className="mt-5 pt-5 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`font-label text-[10px] tracking-[0.08em] uppercase px-3 py-1.5 rounded-full border transition ${
                  kind === k
                    ? "bg-ink text-white border-ink"
                    : "border-border text-muted hover:text-ink"
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          <textarea
            required
            rows={4}
            maxLength={5000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              kind === "Question"
                ? "Ask the team anything about mentoring on PeerVia..."
                : "Tell the team what's working and what could be better..."
            }
            className="w-full border border-border rounded-md px-4 py-2.5 text-sm text-ink bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-y mb-3"
          />

          {status === "error" && (
            <p className="text-sm text-red-600 mb-3">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={status === "sending"}
              className="bg-ink text-white px-5 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {status === "sending" ? "Sending..." : "Send message"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="text-sm font-medium text-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}