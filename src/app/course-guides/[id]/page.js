"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";
import { getSubjectStyle } from "@/data/mentors";

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
      <div className="min-h-screen bg-[#FFF9F2]">
        <Navbar />
        <p className="text-gray-500 text-center mt-20">Loading course guide...</p>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="min-h-screen bg-[#FFF9F2]">
        <Navbar />
        <p className="text-red-600 text-center mt-20 font-semibold">
          {error || "Course guide not found."}
        </p>
      </div>
    );
  }

  const style = getSubjectStyle(guide.subject);

  return (
    <div className="min-h-screen bg-[#FFF9F2]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/course-guides" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">
          ← Back to Course Guides
        </Link>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className={`px-8 py-6 flex items-center justify-between gap-3 ${style.color}`}>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center text-xl shrink-0">
                {style.icon}
              </span>
              <h1 className="font-extrabold text-xl leading-tight">
                {guide.subject} in {guide.country_label}
              </h1>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/70 shrink-0">
              {guide.flag} {guide.country}
            </span>
          </div>

          <div className="p-8">
            <p className="text-gray-700 mb-6 leading-relaxed whitespace-pre-line">{guide.description}</p>

            {/* Journey / Timeline Steps — quick summary near the top */}
            {guide.journey_steps?.length > 0 && (
              <div className="mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-1.5 mb-3">
                  <span>🗺️</span>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Quick Summary
                  </p>
                </div>
                <div className="space-y-3">
                  {guide.journey_steps.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{step.title}</p>
                        {step.description && <p className="text-sm text-gray-600">{step.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Application Rules */}
            {guide.application_rules?.length > 0 && (
              <div className="mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-1.5 mb-3">
                  <span>📌</span>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Application Rules
                  </p>
                </div>
                <ul className="space-y-3">
                  {guide.application_rules.map((rule, i) => (
                    <li key={i}>
                      <p className="font-semibold text-gray-900 text-sm">{rule.title}</p>
                      {rule.description && <p className="text-sm text-gray-600">{rule.description}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Entry Paths */}
            {guide.entry_paths?.length > 0 && (
              <div className="mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-1.5 mb-3">
                  <span>🚪</span>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Entry Paths
                  </p>
                </div>
                <div className="space-y-4">
                  {guide.entry_paths.map((path, i) => (
                    <div key={i}>
                      <p className="font-semibold text-gray-900 text-sm mb-1.5">{path.title}</p>
                      {path.points?.length > 0 && (
                        <ul className="text-sm text-gray-600 space-y-1">
                          {path.points.map((point, j) => (
                            <li key={j} className="flex items-start gap-2">
                              <span className="text-green-600 mt-1">•</span>
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
              <div className="mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <span>🏛️</span>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Popular universities
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {guide.popular_universities.map((uni) => (
                    <span key={uni} className="text-sm font-semibold px-3 py-1 rounded-full bg-orange-100 text-orange-800">
                      {uni}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6 pb-6 border-b border-gray-100">
              <div className="flex items-center gap-1.5 mb-2">
                <span>📋</span>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Admission requirements
                </p>
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{guide.admission}</p>
            </div>

            {/* Pipeline Stages */}
            {guide.pipeline_stages?.length > 0 && (
              <div className="mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-1.5 mb-3">
                  <span>🎓</span>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Your Academic Pipeline
                  </p>
                </div>
                <div className="space-y-4">
                  {guide.pipeline_stages.map((stage, i) => (
                    <div key={i}>
                      <p className="font-semibold text-gray-900 mb-1">{stage.title}</p>
                      {stage.description && <p className="text-sm text-gray-600 leading-relaxed">{stage.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {guide.language_requirement && (
              <div className="mb-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
                  <p className="text-sm font-semibold text-amber-800">
                    ⚠️ Important: {guide.language_requirement}
                  </p>
                </div>
              </div>
            )}

            {/* Specializations Table */}
            {guide.specializations?.length > 0 && (
              <div className="mb-6 pb-6 border-b border-gray-100 mt-6 pt-6">
                <div className="flex items-center gap-1.5 mb-3">
                  <span>🩺</span>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Specializations
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                        <th className="py-2 pr-4 font-semibold">Category</th>
                        <th className="py-2 pr-4 font-semibold">Examples</th>
                        <th className="py-2 pr-4 font-semibold">Duration</th>
                        <th className="py-2 font-semibold">Competitiveness</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guide.specializations.map((row, i) => (
                        <tr key={i} className="border-b border-gray-100 align-top">
                          <td className="py-2.5 pr-4 font-semibold text-gray-900">{row.category}</td>
                          <td className="py-2.5 pr-4 text-gray-600">{row.examples}</td>
                          <td className="py-2.5 pr-4 text-gray-600">{row.duration}</td>
                          <td className="py-2.5 text-gray-600">{row.competitiveness}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Career Path Steps */}
            {guide.career_steps?.length > 0 && (
              <div className="mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-1.5 mb-3">
                  <span>💼</span>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Career Path After Graduating
                  </p>
                </div>
                <div className="space-y-4">
                  {guide.career_steps.map((step, i) => (
                    <div key={i}>
                      <p className="font-semibold text-gray-900 mb-1">{step.title}</p>
                      {step.description && <p className="text-sm text-ink leading-relaxed">{step.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Glossary */}
            {guide.glossary?.length > 0 && (
              <div className="mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-1.5 mb-3">
                  <span>📖</span>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Glossary
                  </p>
                </div>
                <dl className="space-y-2.5">
                  {guide.glossary.map((entry, i) => (
                    <div key={i}>
                      <dt className="font-semibold text-gray-900 text-sm inline">{entry.term}: </dt>
                      <dd className="text-sm text-gray-600 inline">{entry.definition}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Official Links */}
            {guide.official_links?.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-1.5 mb-3">
                  <span>🔗</span>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Official Resources
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {guide.official_links.map((link, i) => (
                    <li key={i}>
  <a
    href={link.url}
    target="_blank"
    rel="noopener noreferrer"
    className="text-sm font-medium text-green-700 hover:underline"
  >
    {link.label} ↗
  </a>
</li>
                  ))}
                </ul>
              </div>
            )}

            {guide.date_published && (
              <p className="text-xs text-gray-400 italic pt-4 border-t border-gray-100">
                Published {new Date(guide.date_published + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}