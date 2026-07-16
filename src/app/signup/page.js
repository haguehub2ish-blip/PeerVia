"use client";
import { useState, useEffect } from "react";
import Navbar from "@/Components/Navbar";
import MultiSelect from "@/Components/MultiSelect";
import { supabase } from "@/lib/supabase";
import { universities } from "@/data/universities";
import { getSubjectStyle, getFlag, getLanguageStyle } from "@/data/mentors";

const getCountryStyle = (country) => ({
  color: "bg-slate-100 text-slate-700",
  icon: getFlag(country),
});
const emailProviders = {
  "gmail.com": { name: "Gmail", url: "https://mail.google.com" },
  "outlook.com": { name: "Outlook", url: "https://outlook.live.com/mail" },
  "hotmail.com": { name: "Outlook", url: "https://outlook.live.com/mail" },
  "live.com": { name: "Outlook", url: "https://outlook.live.com/mail" },
  "yahoo.com": { name: "Yahoo Mail", url: "https://mail.yahoo.com" },
  "icloud.com": { name: "iCloud Mail", url: "https://www.icloud.com/mail" },
  "me.com": { name: "iCloud Mail", url: "https://www.icloud.com/mail" },
  "proton.me": { name: "Proton Mail", url: "https://mail.proton.me" },
  "protonmail.com": { name: "Proton Mail", url: "https://mail.proton.me" },
};

function getEmailProvider(email) {
  const domain = email.split("@")[1]?.toLowerCase();
  return emailProviders[domain] || null;
}

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
const [resent, setResent] = useState(false);

  const [customizePrefs, setCustomizePrefs] = useState(false);
  const [allMentors, setAllMentors] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [selectedSchools, setSelectedSchools] = useState([]);
  const [selectedMentors, setSelectedMentors] = useState([]);
  const [selectedCountries, setSelectedCountries] = useState([]);

  useEffect(() => {
    supabase.from("mentorss").select("*").then(({ data }) => {
      if (data) setAllMentors(data);
    });
  }, []);

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

  async function handleSignup(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          firstName,
          lastName,
          name: `${firstName} ${lastName}`.trim(),
          ...(customizePrefs && {
            emailPreferences: {
              fields: selectedFields,
              languages: selectedLanguages,
              schools: selectedSchools,
              mentors: selectedMentors,
              countries: selectedCountries,
            },
          }),
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
  }
async function handleResend() {
  setResending(true);
  setResent(false);
  const { error } = await supabase.auth.resend({ type: "signup", email });
  setResending(false);
  if (!error) {
    setResent(true);
    setTimeout(() => setResent(false), 5000);
  }
}
  return (
    <div className="min-h-screen bg-[#FFF9F2]">
      <Navbar />

      <div className="max-w-md mx-auto px-6 py-16">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
          Create your account
        </h1>
        <p className="text-gray-600 mb-8">
          Sign up to connect with verified mentors and get real answers.
        </p>

        {success ? (
  <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl p-6 space-y-4">
    <div>
      <p className="font-semibold mb-1">Account created!</p>
      <p className="text-sm">
        We sent a confirmation link to <span className="font-medium">{email}</span>.
        Click it to activate your account, then you can log in.
      </p>
    </div>

    {(() => {
      const provider = getEmailProvider(email);
      return provider ? (
        <a
          href={provider.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-800 transition"
        >
          Open {provider.name} →
        </a>
      ) : null;
    })()}

    <div className="text-sm border-t border-green-200 pt-3">
      Didn't get it?{" "}
      <button
        onClick={handleResend}
        disabled={resending}
        className="text-green-800 font-medium hover:underline disabled:opacity-50"
      >
        {resending ? "Resending..." : "Resend confirmation email"}
      </button>
      {resent && <span className="ml-2 text-green-700">✓ Sent</span>}
    </div>
  </div>
) : (
          <form onSubmit={handleSignup} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First name
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>

            {/* Optional email preferences */}
            <div className="border-t border-gray-100 pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customizePrefs}
                  onChange={(e) => setCustomizePrefs(e.target.checked)}
                  className="w-4 h-4 accent-green-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  Customize email preferences now
                </span>
              </label>
              <p className="text-xs text-gray-400 mt-1">
                Optional — you can always change this later in Settings.
              </p>

              {customizePrefs && (
                <div className="space-y-4 mt-4">
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
                </div>
              )}
            </div>

            {error && (
              <p className="text-red-600 text-sm font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Sign up"}
            </button>

            <p className="text-sm text-gray-500 text-center">
              Already have an account?{" "}
              <a href="/login" className="text-green-700 font-medium hover:underline">
                Log in
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}