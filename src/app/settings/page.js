"use client";
import { useState, useEffect } from "react";
import Navbar from "@/Components/Navbar";
import MultiSelect from "@/Components/MultiSelect";
import { supabase } from "@/lib/supabase";
import { universities } from "@/data/universities";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [allMentors, setAllMentors] = useState([]);

  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [selectedSchools, setSelectedSchools] = useState([]);
  const [selectedMentors, setSelectedMentors] = useState([]);
  const [selectedCountries, setSelectedCountries] = useState([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });

    supabase.from("mentorss").select("*").then(({ data }) => {
      if (data) setAllMentors(data);
    });
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
            <MultiSelect
              label="Field"
              options={fieldOptions}
              selected={selectedFields}
              onChange={setSelectedFields}
            />
            <MultiSelect
              label="Language"
              options={languageOptions}
              selected={selectedLanguages}
              onChange={setSelectedLanguages}
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
            />
          </div>

          <button className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition">
            Save preferences
          </button>
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