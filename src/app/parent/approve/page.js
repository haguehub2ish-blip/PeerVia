"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ParentApprovePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ParentApprove />
    </Suspense>
  );
}

function ParentApprove() {
  const params = useSearchParams();
  const token = params.get("token");

  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!token) {
      setError("This link isn't valid.");
      setLoading(false);
      return;
    }
    fetch(`/api/parental?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setInfo(d);
        setLoading(false);
      })
      .catch(() => {
        setError("Something went wrong. Please try again.");
        setLoading(false);
      });
  }, [token]);

  async function decide(decision) {
    setWorking(true);
    setError(null);
    const res = await fetch("/api/parental", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, decision }),
    });
    const d = await res.json();
    setWorking(false);
    if (d.error) setError(d.error);
    else setResult(d.status);
  }

  const first = (info?.studentName || "your child").split(" ")[0];
  const isCall = info?.kind === "call";

  let content;
  if (loading) {
    content = <p className="text-muted text-sm">Loading…</p>;
  } else if (!info) {
    content = <p className="text-ink">{error}</p>;
  } else if (result || info.status !== "pending") {
    const status = result || info.status;
    content = (
      <div>
        <h1 className="font-display text-2xl text-ink mb-2">
          {status === "approved" ? "Thank you, it's approved." : "Done, it wasn't approved."}
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          {status === "approved"
            ? isCall
              ? `We've sent the request to ${info.mentorName}. Please remember that you must be with ${first} for the whole call.`
              : `${first} can now use their account. You'll get an email each time they ask for a call, and nothing is sent to a mentor without your approval.`
            : `Nothing has been sent, and ${first} has been told. You can close this page.`}
        </p>
      </div>
    );
  } else if (info.expired) {
    content = (
      <p className="text-ink">
        This link has expired. Please ask {first} to send a new request.
      </p>
    );
  } else {
    content = (
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl text-ink mb-2">
            {isCall ? `${first} would like to book a call` : `${first} wants to join PeerVia`}
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            {isCall
              ? `${info.studentName} asked for an online call with ${info.mentorName}, a university student who volunteers as a mentor on PeerVia.`
              : `${info.studentName} signed up for PeerVia, a free, non-profit platform where high school students ask university students about courses, universities and careers. Because they're under 18, they need your approval.`}
          </p>
        </div>

        {isCall && (
          <div className="border border-border rounded-md px-4 py-3 bg-background">
            <p className="text-xs font-semibold text-muted mb-1">Their message</p>
            <p className="text-sm text-ink whitespace-pre-line">{info.message}</p>
          </div>
        )}

        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1"
          />
          <span>
            I am {first}'s parent or guardian. I understand that I am required to be with {first} for the whole
            of any call with a mentor.
          </span>
        </label>

        {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={() => decide("approve")}
            disabled={!agreed || working}
            className="bg-ink text-white px-5 py-2.5 rounded-md text-sm font-semibold hover:opacity-90 transition disabled:opacity-40"
          >
            {working ? "Please wait…" : "Approve"}
          </button>
          <button
            onClick={() => decide("decline")}
            disabled={working}
            className="border border-border text-ink px-5 py-2.5 rounded-md text-sm font-semibold hover:bg-background transition disabled:opacity-40"
          >
            Decline
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-6 py-16">
        <p className="font-display text-xl text-ink mb-8">PeerVia</p>
        <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">{content}</div>
      </div>
    </div>
  );
}