"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  DEFAULT_FIELDS,
  DEFAULT_COUNTRIES,
  DEFAULT_CAREER_FIELDS,
  DEFAULT_COMMUNITY_FIELDS,
  parseKeywords,
} from "@/lib/filterDefaults";

// Loads the admin-managed filter lists. Until a list is customised in /admin/filters,
// the built-in default is used, so the site works the same as before.
export function useFilterOptions() {
  const [options, setOptions] = useState({
    fields: DEFAULT_FIELDS,
    countries: DEFAULT_COUNTRIES,
    careerFields: DEFAULT_CAREER_FIELDS,
    communityFields: DEFAULT_COMMUNITY_FIELDS,
    hasCustomCountries: false,
  });

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("site_filters")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const rowsOf = (kind) => data.filter((r) => r.kind === kind);
        const withKeywords = (rows) =>
          rows.map((r) => ({ label: r.label, keywords: parseKeywords(r.keywords) }));
        const fieldRows = rowsOf("field");
        const countryRows = rowsOf("country");
        const careerRows = rowsOf("career_field");
        const communityRows = rowsOf("community_field");
        setOptions({
          fields: fieldRows.length ? withKeywords(fieldRows) : DEFAULT_FIELDS,
          countries: countryRows.length
            ? countryRows.map((r) => ({ value: r.value, label: r.label, flag: r.flag || "" }))
            : DEFAULT_COUNTRIES,
          careerFields: careerRows.length ? careerRows.map((r) => r.label) : DEFAULT_CAREER_FIELDS,
          communityFields: communityRows.length ? withKeywords(communityRows) : DEFAULT_COMMUNITY_FIELDS,
          hasCustomCountries: countryRows.length > 0,
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return options;
}