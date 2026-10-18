"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";

const MAX_COMPARE = 3;
const LABEL_WIDTH = "7rem"; // width of the left-hand row labels
const COLUMN_MIN = "16rem"; // narrowest a guide's column can get before the table scrolls sideways

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CompareContent />
    </Suspense>
  );
}

function hasItems(list) {
  return Array.isArray(list) && list.filter(Boolean).length > 0;
}

// A list of { title, description } items (application rules, pipeline, career steps ...)
function TitledList({ items, numbered }) {
  return (
    <ol className="space-y-3">
      {items.filter(Boolean).map((item, i) => (
        <li key={i}>
          <p className="font-semibold text-ink">
            {numbered ? `${i + 1}. ` : ""}
            {item.title}
          </p>
          {item.description && (
            <p className="text-ink/80 whitespace-pre-line">{item.description}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

// Each row of the comparison. A row only appears if at least one guide has something for it.
const ROWS = [
  {
    label: "Overview",
    has: (g) => !!g.description,
    render: (g) => <p className="whitespace-pre-line">{g.description}</p>,
  },
  {
    label: "Popular universities",
    has: (g) => hasItems(g.popular_universities),
    render: (g) => (
      <div className="flex flex-wrap gap-1.5">
        {g.popular_universities.map((uni) => (
          <span
            key={uni}
            className="text-xs font-medium px-2.5 py-1 rounded-full border border-border bg-background text-ink"
          >
            {uni}
          </span>
        ))}
      </div>
    ),
  },
  {
    label: "Admission",
    has: (g) => !!g.admission,
    render: (g) => <p className="whitespace-pre-line">{g.admission}</p>,
  },
  {
    label: "Language",
    has: (g) => !!g.language_requirement,
    render: (g) => <p>{g.language_requirement}</p>,
  },
  {
    label: "Application rules",
    has: (g) => hasItems(g.application_rules),
    render: (g) => <TitledList items={g.application_rules} />,
  },
  {
    label: "Entry paths",
    has: (g) => hasItems(g.entry_paths),
    render: (g) => (
      <div className="space-y-4">
        {g.entry_paths.filter(Boolean).map((path, i) => (
          <div key={i}>
            <p className="font-semibold text-ink mb-1">{path.title}</p>
            {hasItems(path.points) &&
              (path.bulleted === false ? (
                <p className="text-ink/80 whitespace-pre-line">{path.points.join("\n")}</p>
              ) : (
                <ul className="space-y-1">
                  {path.points.filter(Boolean).map((point, j) => (
                    <li key={j} className="flex items-start gap-2 text-ink/80">
                      <span className="mt-2 w-1 h-1 rounded-full bg-primary shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              ))}
          </div>
        ))}
      </div>
    ),
  },
  {
    label: "Quick summary",
    has: (g) => hasItems(g.journey_steps),
    render: (g) => <TitledList items={g.journey_steps} numbered />,
  },
  {
    label: "Academic pipeline",
    has: (g) => hasItems(g.pipeline_stages),
    render: (g) => <TitledList items={g.pipeline_stages} />,
  },
  {
    label: "Specialisations",
    has: (g) => hasItems(g.specializations),
    render: (g) => (
      <ul className="space-y-3">
        {g.specializations.filter(Boolean).map((row, i) => (
          <li key={i}>
            <p className="font-semibold text-ink">{row.category}</p>
            {row.examples && <p className="text-ink/80">{row.examples}</p>}
            {(row.duration || row.competitiveness) && (
              <p className="text-xs text-muted mt-0.5">
                {[row.duration, row.competitiveness && `Competitiveness: ${row.competitiveness}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </li>
        ))}
      </ul>
    ),
  },
  {
    label: "Career path",
    has: (g) => hasItems(g.career_steps),
    render: (g) => <TitledList items={g.career_steps} />,
  },
  {
    label: "Official resources",
    has: (g) => hasItems(g.official_links),
    render: (g) => (
      <ul className="space-y-1.5">
        {g.official_links.filter(Boolean).map((link, i) => (
          <li key={i}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              {link.label} ↗
            </a>
          </li>
        ))}
      </ul>
    ),
  },
];

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // The guides to compare come from the address, e.g. /course-guides/compare?ids=a,b,c
  const idsKey = (searchParams.get("ids") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPARE)
    .join(",");

  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ids = idsKey ? idsKey.split(",") : [];
    if (ids.length === 0) {
      setGuides([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadGuides() {
      setLoading(true);
      const { data, error } = await supabase.from("course_guides").select("*").in("id", ids);
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setGuides([]);
      } else {
        setError(null);
        // keep the guides in the order they were picked
        setGuides(ids.map((id) => (data || []).find((g) => String(g.id) === id)).filter(Boolean));
      }
      setLoading(false);
    }
    loadGuides();
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  function removeGuide(id) {
    const rest = idsKey.split(",").filter((x) => x !== String(id));
    router.replace(`/course-guides/compare?ids=${rest.join(",")}`);
  }

  const columns = `${LABEL_WIDTH} repeat(${guides.length}, minmax(${COLUMN_MIN}, 1fr))`;
  const visibleRows = ROWS.filter((row) => guides.some((g) => row.has(g)));
  const canRemove = guides.length > 2;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <Link
          href="/course-guides"
          className="font-label text-xs uppercase tracking-wide text-muted hover:text-primary transition mb-6 inline-block"
        >
          ← Back to Course Guides
        </Link>

        <p className="font-label text-xs uppercase tracking-[0.2em] text-primary mb-3">
          Side by side
        </p>
        <h1 className="font-display text-4xl text-ink mb-3">Compare Course Guides</h1>
        <p className="text-muted max-w-xl mb-8 leading-relaxed">
          The same questions answered for each path, so you can see where they differ.
        </p>

        {loading ? (
          <p className="font-label text-sm uppercase tracking-wide text-muted">
            Loading course guides...
          </p>
        ) : error ? (
          <p className="text-red-600 font-semibold">{error}</p>
        ) : guides.length < 2 ? (
          <div className="bg-surface border border-border rounded-2xl p-8 max-w-lg">
            <p className="font-display text-xl text-ink mb-2">Pick at least two guides</p>
            <p className="text-ink/80 mb-5">
              Choose two or three course guides on the course guides page, then press Compare.
            </p>
            <Link
              href="/course-guides"
              className="inline-block bg-primary text-background font-label text-xs uppercase tracking-wide px-4 py-3 rounded-lg hover:bg-primary-dark transition"
            >
              Choose guides →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
            <div style={{ minWidth: `calc(${LABEL_WIDTH} + ${guides.length} * ${COLUMN_MIN})` }}>
              {/* Header: one card per guide */}
              <div className="grid" style={{ gridTemplateColumns: columns }}>
                <div className="sticky left-0 z-10 bg-surface" />
                {guides.map((g) => (
                  <div key={g.id} className="p-4 border-l border-border">
                    <div className="aspect-[16/9] rounded-xl overflow-hidden bg-background mb-3">
                      {g.image_url ? (
                        <img
                          src={g.image_url}
                          alt={`${g.subject} in ${g.country_label}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface to-border/60">
                          <span className="font-display text-4xl text-primary/30">
                            {g.subject?.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="font-label text-[11px] uppercase tracking-[0.15em] text-primary mb-1">
                      {g.flag} {g.country}
                    </p>
                    <h2 className="font-display text-xl text-ink leading-tight">
                      <span className="font-semibold">{g.subject}</span>{" "}
                      <span className="text-muted font-normal">in {g.country_label}</span>
                    </h2>
                    <div className="flex items-center gap-4 mt-3">
                      <Link
                        href={`/course-guides/${g.id}`}
                        className="font-label text-[10px] uppercase tracking-wide text-primary hover:underline"
                      >
                        Full guide →
                      </Link>
                      {canRemove && (
                        <button
                          type="button"
                          onClick={() => removeGuide(g.id)}
                          className="font-label text-[10px] uppercase tracking-wide text-muted hover:text-primary transition"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* One row per topic */}
              {visibleRows.map((row) => (
                <div
                  key={row.label}
                  className="grid border-t border-border"
                  style={{ gridTemplateColumns: columns }}
                >
                  <div className="sticky left-0 z-10 bg-surface px-3 py-4 font-label text-[10px] uppercase tracking-[0.15em] text-muted">
                    {row.label}
                  </div>
                  {guides.map((g) => (
                    <div
                      key={g.id}
                      className="px-4 py-4 border-l border-border text-sm leading-relaxed text-ink/90"
                    >
                      {row.has(g) ? (
                        row.render(g)
                      ) : (
                        <span className="italic text-muted/70">Not covered in this guide</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && guides.length >= 2 && (
          <p className="text-sm text-muted mt-6">
            These guides are general overviews. For your own situation, talk to a mentor already on
            the path.
          </p>
        )}
      </div>
    </div>
  );
}