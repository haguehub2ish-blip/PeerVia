"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";

export default function CourseGuideDetail() {
  const { id } = useParams();
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchGuide() {
      const { data, error } = await supabase
        .from("course_guides")
        .select("*")
        .eq("id", id)
        .single();

      if (error) setError(error.message);
      else setGuide(data);
      setLoading(false);
    }
    if (id) fetchGuide();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <p className="text-muted text-center mt-20 font-label text-sm uppercase tracking-wide">
          Loading course guide...
        </p>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <p className="text-red-600 text-center mt-20 font-semibold">
          {error || "Course guide not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <Link
          href="/course-guides"
          className="font-label text-xs uppercase tracking-wide text-muted hover:text-primary transition mb-6 inline-block"
        >
          ← Back to Course Guides
        </Link>

        {/* Hero */}
        <div className="rounded-3xl overflow-hidden mb-8">
          {guide.image_url ? (
            <div className="h-52 sm:h-64 relative">
              <img
                src={guide.image_url}
                alt={`${guide.subject} in ${guide.country_label}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/0 to-ink/0" />
            </div>
          ) : (
            <div className="h-52 sm:h-64 flex items-center justify-center bg-gradient-to-br from-surface to-border/60">
              <span className="font-display text-7xl text-primary/30">
                {guide.subject?.charAt(0)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
          <p className="font-label text-xs uppercase tracking-[0.2em] text-primary">
            Course Guide
          </p>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl text-ink leading-tight mb-3">
          {guide.subject}{" "}
          <span className="text-muted font-normal">in {guide.country_label}</span>
        </h1>
        <p className="text-muted flex items-center gap-2 mb-10">
          {guide.flag} {guide.country_label}
          {guide.popular_universities?.length > 0 && (
            <>
              <span className="w-1 h-1 rounded-full bg-border"></span>
              {guide.popular_universities.length} popular{" "}
              {guide.popular_universities.length === 1 ? "university" : "universities"}
            </>
          )}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main content */}
          <div className="lg:col-span-2 max-w-[68ch]">
            <p className="font-label text-xs uppercase tracking-[0.15em] text-muted mb-2">
              Overview
            </p>
            <p className="text-ink/90 mb-8 leading-relaxed whitespace-pre-line text-base">
              {guide.description}
            </p>

            {guide.journey_steps?.length > 0 && (
              <div className="mb-8 pb-8 border-b border-border">
                <p className="font-label text-xs uppercase tracking-[0.15em] text-muted mb-4">
                  Quick Summary
                </p>
                <div className="space-y-4">
                  {guide.journey_steps.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center font-label">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-ink text-sm">{step.title}</p>
                        {step.description && (
                          <p className="text-base text-ink/90 leading-relaxed">{step.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {guide.application_rules?.length > 0 && (
              <div className="mb-8 pb-8 border-b border-border">
                <p className="font-label text-xs uppercase tracking-[0.15em] text-muted mb-4">
                  Application Rules
                </p>
                <ul className="space-y-3">
                  {guide.application_rules.map((rule, i) => (
                    <li key={i}>
                      <p className="font-semibold text-ink text-sm">{rule.title}</p>
                      {rule.description && (
                        <p className="text-base text-ink/90 leading-relaxed">{rule.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {guide.entry_paths?.length > 0 && (
              <div className="mb-8 pb-8 border-b border-border">
                <p className="font-label text-xs uppercase tracking-[0.15em] text-muted mb-4">
                  Entry Paths
                </p>
                <div className="space-y-5">
                  {guide.entry_paths.map((path, i) => (
                    <div key={i}>
                      <p className="font-semibold text-ink text-sm mb-2">{path.title}</p>
                      {path.points?.length > 0 && (
                        <ul className="text-base text-ink/90 space-y-1.5">
                          {path.points.map((point, j) => (
                            <li key={j} className="flex items-start gap-2">
                              <span className="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0"></span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {guide.popular_universities?.length > 0 && (
              <div className="mb-8 pb-8 border-b border-border">
                <p className="font-label text-xs uppercase tracking-[0.15em] text-muted mb-3">
                  Popular Universities
                </p>
                <div className="flex flex-wrap gap-2">
                  {guide.popular_universities.map((uni) => (
                    <span
                      key={uni}
                      className="text-sm font-medium px-3.5 py-1.5 rounded-full border border-border text-ink bg-surface"
                    >
                      {uni}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-8 pb-8 border-b border-border">
              <p className="font-label text-xs uppercase tracking-[0.15em] text-muted mb-2">
                Admission Requirements
              </p>
              <p className="text-ink/80 leading-relaxed whitespace-pre-line text-[15px]">
                {guide.admission}
              </p>
            </div>

            {guide.pipeline_stages?.length > 0 && (
              <div className="mb-8 pb-8 border-b border-border">
                <p className="font-label text-xs uppercase tracking-[0.15em] text-muted mb-4">
                  Your Academic Pipeline
                </p>
                <div className="space-y-5">
                  {guide.pipeline_stages.map((stage, i) => (
                    <div key={i}>
                      <p className="font-semibold text-ink mb-1">{stage.title}</p>
                      {stage.description && (
                        <p className="text-base text-ink/90 leading-relaxed">{stage.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {guide.language_requirement && (
              <div className="mb-8 border-l-2 border-primary pl-4">
                <p className="font-label text-xs uppercase tracking-[0.15em] text-primary mb-0.5">
                  Note
                </p>
                <p className="text-base text-ink/90">{guide.language_requirement}</p>
              </div>
            )}

            {guide.specializations?.length > 0 && (
              <div className="mb-8 pb-8 border-b border-border">
                <p className="font-label text-xs uppercase tracking-[0.15em] text-muted mb-4">
                  Specializations
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="py-2 pr-4 font-label text-[10px] uppercase tracking-wide text-muted font-semibold">
                          Category
                        </th>
                        <th className="py-2 pr-4 font-label text-[10px] uppercase tracking-wide text-muted font-semibold">
                          Examples
                        </th>
                        <th className="py-2 pr-4 font-label text-[10px] uppercase tracking-wide text-muted font-semibold">
                          Duration
                        </th>
                        <th className="py-2 font-label text-[10px] uppercase tracking-wide text-muted font-semibold">
                          Competitiveness
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {guide.specializations.map((row, i) => (
                        <tr key={i} className="border-b border-border/60 align-top">
                          <td className="py-3 pr-4 font-semibold text-ink">{row.category}</td>
                          <td className="py-3 pr-4 text-ink/70">{row.examples}</td>
                          <td className="py-3 pr-4 text-ink/70">{row.duration}</td>
                          <td className="py-3 text-ink/70">{row.competitiveness}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {guide.career_steps?.length > 0 && (
              <div className="mb-8 pb-8 border-b border-border">
                <p className="font-label text-xs uppercase tracking-[0.15em] text-muted mb-4">
                  Career Path After Graduating
                </p>
                <div className="space-y-5">
                  {guide.career_steps.map((step, i) => (
                    <div key={i}>
                      <p className="font-semibold text-ink mb-1">{step.title}</p>
                      {step.description && (
                        <p className="text-base text-ink/90 leading-relaxed">{step.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {guide.glossary?.length > 0 && (
              <div className="mb-8 pb-8 border-b border-border">
                <p className="font-label text-xs uppercase tracking-[0.15em] text-muted mb-4">
                  Glossary
                </p>
                <dl className="space-y-2.5">
                  {guide.glossary.map((entry, i) => (
                    <div key={i} className="text-sm">
                      <dt className="font-semibold text-ink inline">{entry.term}: </dt>
                      <dd className="text-ink/70 inline">{entry.definition}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {guide.official_links?.length > 0 && (
              <div className="mb-8">
                <p className="font-label text-xs uppercase tracking-[0.15em] text-muted mb-3">
                  Official Resources
                </p>
                <ul className="space-y-1.5">
                  {guide.official_links.map((link, i) => (
                    <li key={i}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {link.label} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {guide.date_published && (
              <p className="font-label text-[11px] uppercase tracking-wide text-muted pt-2">
                Published{" "}
                {new Date(guide.date_published + "T00:00:00").toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto bg-surface border border-border rounded-2xl p-6">
              <p className="font-label text-[11px] uppercase tracking-[0.15em] text-primary mb-1">
                {guide.flag} {guide.country_label}
              </p>
              <h2 className="font-display text-xl text-ink mb-4">
                Talk to a {guide.subject} mentor
              </h2>
              <p className="text-base text-ink/90 leading-relaxed mb-5">
                Everything above is a general guide. For questions about your specific situation,
                message a verified student already on this path.
              </p>

              <Link
                href={`/mentors?subject=${encodeURIComponent(guide.subject)}&country=${guide.country}`}
                className="block text-center bg-primary text-background font-label text-xs uppercase tracking-wide px-4 py-3 rounded-lg hover:bg-primary-dark transition mb-6"
              >
                Find {guide.subject} Mentors →
              </Link>

              <div className="space-y-3 pt-5 border-t border-border">
                {[
                  "Browse mentors in this field",
                  "Message them about your situation",
                  "Book a call when you're ready",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="font-label text-[10px] text-primary shrink-0 mt-0.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-ink/70">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}