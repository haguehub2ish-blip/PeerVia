"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";
import { getLanguageStyle } from "@/data/mentors";

const statusDots = {
  pending: "bg-primary",
  approved: "bg-green-600",
  rejected: "bg-red-600",
};

function Detail({ label, children }) {
  return (
    <div>
      <p className="font-label text-[10px] tracking-[0.1em] uppercase text-muted mb-0.5">{label}</p>
      <p className="text-sm text-ink font-medium">{children}</p>
    </div>
  );
}

function TextBlock({ label, children }) {
  return (
    <div className="mb-4">
      <p className="font-label text-[10px] tracking-[0.1em] uppercase text-muted mb-1">{label}</p>
      <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-line">{children}</p>
    </div>
  );
}

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  async function loadApplications() {
    setLoading(true);
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      setError("You must be logged in to view this page.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/admin/applications", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();

    if (result.error) {
      setError(result.error);
    } else {
      setApplications(result.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadApplications();
  }, []);

  async function handleResendInvite(app) {
    if (!confirm(`Send a new invite email to ${app.email}?`)) return;
    setProcessingId(app.id);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const res = await fetch("/api/admin/resend-invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: app.id }),
    });

    const result = await res.json();
    setProcessingId(null);
    alert(result.error ? "Error: " + result.error : "Invite sent to " + app.email);
  }

  async function handleDecision(app, status) {
    setProcessingId(app.id);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const res = await fetch("/api/admin/applications-update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: app.id, status, application: app }),
    });

    const result = await res.json();
    setProcessingId(null);

    if (result.error) {
      alert("Error: " + result.error);
    } else {
      loadApplications();
    }
  }

  const pendingCount = applications.filter((a) => a.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="bg-surface border-b border-border px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/admin"
            className="font-label text-[10px] tracking-[0.1em] uppercase text-muted hover:text-ink transition"
          >
            ← Admin Dashboard
          </Link>
          <p className="font-label text-[10px] tracking-[0.15em] uppercase text-primary mt-4 mb-2">
            Admin
          </p>
          <div className="flex items-end justify-between flex-wrap gap-3">
            <h1 className="font-display text-3xl md:text-4xl text-ink leading-tight">
              Mentor Applications
            </h1>
            {!loading && !error && applications.length > 0 && (
              <span className="font-label text-[10px] tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border border-border text-ink bg-background">
                {pendingCount} Pending · {applications.length} Total
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {loading ? (
          <p className="text-muted text-sm">Loading applications...</p>
        ) : error ? (
          <p className="text-red-600 font-semibold">{error}</p>
        ) : applications.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border rounded-lg">
            <p className="text-muted text-sm">No applications yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-surface border border-border rounded-lg p-6 shadow-sm"
              >
                {/* Applicant */}
                <div className="flex justify-between items-start gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    {app.photo_url ? (
                      <img
                        src={app.photo_url}
                        alt={app.first_name}
                        className="w-14 h-14 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-ink text-white flex items-center justify-center font-display text-xl">
                        {app.first_name?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-display text-lg text-ink leading-tight">
                        {app.first_name} {app.last_name}
                      </h3>
                      <p className="text-muted text-sm">{app.email}</p>
                      {app.backup_email && (
                        <p className="text-muted text-sm">Backup: {app.backup_email}</p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 font-label text-[10px] tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border border-border bg-background text-ink flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDots[app.status] || "bg-muted"}`} />
                    {app.status}
                  </span>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
                  <Detail label="University">{app.university}</Detail>
                  <Detail label="Year">{app.year}</Detail>
                  <Detail label="Field">{app.field}</Detail>
                  <Detail label="Course">
                    {app.course || <span className="text-muted italic font-normal">Not specified</span>}
                  </Detail>
                  <Detail label="Country">{app.country}</Detail>
                  {app.final_grade && <Detail label="Final grade">{app.final_grade}</Detail>}
                </div>

                {/* Languages */}
                <div className="mb-5">
                  <p className="font-label text-[10px] tracking-[0.1em] uppercase text-muted mb-1.5">
                    Languages
                  </p>
                  {app.languages ? (
                    <div className="flex flex-wrap gap-1.5">
                      {app.languages.split(",").map((lang) => {
                        const style = getLanguageStyle(lang);
                        return (
                          <span
                            key={lang}
                            className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${style.color}`}
                          >
                            {style.icon} {lang}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-muted text-sm italic">Not specified</span>
                  )}
                </div>

                {/* Written answers */}
                <TextBlock label="Why they want to mentor">{app.why}</TextBlock>
                {app.support_guidance && (
                  <TextBlock label="How they'll support students">{app.support_guidance}</TextBlock>
                )}
                {app.extracurriculars && (
                  <TextBlock label="Extracurriculars">{app.extracurriculars}</TextBlock>
                )}

                {app.linkedin && (
                  <a
                    href={app.linkedin.startsWith("http") ? app.linkedin : `https://${app.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-primary text-sm font-medium underline underline-offset-4 hover:opacity-80"
                  >
                    View LinkedIn →
                  </a>
                )}

                {/* Actions */}
                {app.status === "approved" && (
                  <div className="flex gap-2 mt-5 pt-5 border-t border-border">
                    <button
                      onClick={() => handleResendInvite(app)}
                      disabled={processingId === app.id}
                      className="border border-border text-ink px-5 py-2 rounded-md text-sm font-semibold hover:border-primary hover:text-primary transition disabled:opacity-50"
                    >
                      {processingId === app.id ? "Sending..." : "Resend invite"}
                    </button>
                  </div>
                )}

                {app.status === "pending" && (
                  <div className="flex gap-2 mt-5 pt-5 border-t border-border">
                    <button
                      onClick={() => handleDecision(app, "approved")}
                      disabled={processingId === app.id}
                      className="bg-ink text-white px-5 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                    >
                      {processingId === app.id ? "Processing..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleDecision(app, "rejected")}
                      disabled={processingId === app.id}
                      className="border border-red-300 text-red-700 px-5 py-2 rounded-md text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}