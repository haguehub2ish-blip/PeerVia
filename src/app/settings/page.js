"use client";
import { useState, useEffect, useRef } from "react";
import Navbar from "@/Components/Navbar";
import MultiSelect from "@/Components/MultiSelect";
import { supabase } from "@/lib/supabase";
import { universities } from "@/data/universities";
import { getSubjectStyle, getFlag, getLanguageStyle } from "@/data/mentors";

const getCountryStyle = (country) => ({
  color: "bg-slate-100 text-slate-700",
  icon: getFlag(country),
});

export default function Settings() {
  const [user, setUser] = useState(null);
  const [allMentors, setAllMentors] = useState([]);

  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [selectedSchools, setSelectedSchools] = useState([]);
  const [selectedMentors, setSelectedMentors] = useState([]);
  const [selectedCountries, setSelectedCountries] = useState([]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const savedTimeoutRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const currentUser = data?.user || null;
      setUser(currentUser);

      const prefs = currentUser?.user_metadata?.emailPreferences;
      if (prefs) {
        setSelectedFields(prefs.fields || []);
        setSelectedLanguages(prefs.languages || []);
        setSelectedSchools(prefs.schools || []);
        setSelectedMentors(prefs.mentors || []);
        setSelectedCountries(prefs.countries || []);
      }
      setPrefsLoading(false);
    });
    supabase.from("mentorss").select("*").then(({ data }) => {
      if (data) setAllMentors(data);
    });

    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  // Build option lists dynamically from real data
  const fieldOptions = [...new Set(allMentors.map((m) => m.subject).filter(Boolean))];
  const languageOptions = [
    ...new Set(
      allMentors.flatMap((m) =>
        typeof m.languages === "string"
          ? m.languages.split(",").map((l) => l.trim())
          : m.languages || []
      )
    ),
  ];
  const schoolOptions = [
    ...new Set([
      ...allMentors.map((m) => m.school).filter(Boolean),
      ...universities.map((u) => u.name),
    ]),
  ];
  const mentorOptions = allMentors.map((m) => m.name).filter(Boolean);
 const countryOptions = [
    ...new Set([
      ...allMentors.map((m) => m.country).filter(Boolean),
      ...universities.map((u) => u.country),
    ]),
  ];

  async function handleSavePreferences() {
    setSaving(true);
    setSaved(false);

    const { data, error } = await supabase.auth.updateUser({
      data: {
        emailPreferences: {
          fields: selectedFields,
          languages: selectedLanguages,
          schools: selectedSchools,
          mentors: selectedMentors,
          countries: selectedCountries,
        },
      },
    });

    setSaving(false);

    if (!error) {
      setUser(data.user);
      setSaved(true);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF9F2]">
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">
          Settings
        </h1>

        {/* Account section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Account</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500">Name</span>
              <span className="text-gray-900 font-medium">
                {user?.user_metadata?.name || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-900 font-medium">{user?.email}</span>
            </div>
          </div>
        </div>

        {/* Email preferences section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            Email preferences
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Choose what you'd like to receive email updates about.
          </p>

          <div className="space-y-4 mb-6">
            {prefsLoading ? (
              <div className="space-y-3 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-[42px] bg-gray-100 rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                <MultiSelect
                  label="Field"
                  options={fieldOptions}
                  selected={selectedFields}
                  onChange={setSelectedFields}
                  getOptionStyle={getSubjectStyle}
                />
                <MultiSelect
                  label="Language"
                  options={languageOptions}
                  selected={selectedLanguages}
                  onChange={setSelectedLanguages}
                   getOptionStyle={getLanguageStyle}
                />
                <MultiSelect
                  label="School"
                  options={schoolOptions}
                  selected={selectedSchools}
                  onChange={setSelectedSchools}
                />
                <MultiSelect
                  label="Specific Mentor"
                  options={mentorOptions}
                  selected={selectedMentors}
                  onChange={setSelectedMentors}
                />
                <MultiSelect
                  label="Country"
                  options={countryOptions}
                  selected={selectedCountries}
                  onChange={setSelectedCountries}
                  getOptionStyle={getCountryStyle}
                />
              </>
            )}
          </div>

          <button
    onClick={handleSavePreferences}
    disabled={saving}
    className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
  >
    {saving ? "Saving..." : "Save preferences"}
  </button>
  {saved && (
    <span className="text-sm text-green-700 font-medium ml-2">
      ✓ Preferences saved
    </span>
  )}
</div>

        {/* Danger zone */}
        <div className="bg-white border border-red-200 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-red-700 mb-1">Danger zone</h2>
          <p className="text-sm text-gray-500 mb-4">
            Permanently delete your account and all associated data.
          </p>
          <button className="border border-red-300 text-red-700 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-50 transition">
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}