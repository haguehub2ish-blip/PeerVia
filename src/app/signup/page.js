"use client";
import { useState, useEffect } from "react";
import Navbar from "@/Components/Navbar";
import MultiSelect from "@/Components/MultiSelect";
import { supabase } from "@/lib/supabase";
import { courseGuides, allUniversityNames } from "@/data/courseGuides";

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
      ...allUniversityNames,
    ]),
  ];
  const mentorOptions = allMentors.map((m) => m.name).filter(Boolean);
  const countryOptions = [
    ...new Set([
      ...allMentors.map((m) => m.country).filter(Boolean),
      ...courseGuides.map((u) => u.country),
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
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-sm mx-auto px-6 py-20">
        <h1 className="font-display text-2xl text-ink mb-1">Create your account</h1>
        <p className="text-muted text-sm mb-8">
          Sign up to connect with verified mentors and get real answers.
        </p>

        {success ? (
          <div className="border border-border bg-surface rounded-lg p-6 shadow-sm space-y-4">
            <div>
              <p className="font-semibold text-ink mb-1">Account created</p>
              <p className="text-sm text-muted">
                We sent a confirmation link to{" "}
                <span className="font-medium text-ink">{email}</span>. Click it to activate your
                account, then you can log in.
              </p>
            </div>

            {(() => {
              const provider = getEmailProvider(email);
              return provider ? (
                <a
                  href={provider.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-ink text-white text-sm font-semibold px-4 py-2 rounded-md hover:opacity-90 transition"
                >
                  Open {provider.name}
                </a>
              ) : null;
            })()}

            <div className="text-sm border-t border-border pt-3 text-muted">
              Didn't get it?{" "}
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-ink font-medium hover:underline disabled:opacity-50"
              >
                {resending ? "Resending..." : "Resend confirmation email"}
              </button>
              {resent && <span className="ml-2 text-primary">Sent</span>}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="bg-surface border border-border rounded-lg p-6 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  First name
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-ink bg-background focus:outline-none focus:ring-2 focus:ring-ink/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Last name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-ink bg-background focus:outline-none focus:ring-2 focus:ring-ink/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-ink bg-background focus:outline-none focus:ring-2 focus:ring-ink/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-ink bg-background focus:outline-none focus:ring-2 focus:ring-ink/20"
              />
            </div>

            {/* Optional email preferences */}
            <div className="border-t border-border pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customizePrefs}
                  onChange={(e) => setCustomizePrefs(e.target.checked)}
                  className="w-4 h-4 accent-ink"
                />
                <span className="text-sm font-medium text-ink">
                  Customize email preferences now
                </span>
              </label>
              <p className="text-xs text-muted mt-1">
                Optional — you can always change this later in Settings.
              </p>

              {customizePrefs && (
                <div className="border border-border rounded-md divide-y divide-border mt-4 bg-background">
                  <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-2 sm:gap-0 px-4 py-3 items-center">
                    <span className="text-sm text-muted">Field</span>
                    <MultiSelect
                      options={fieldOptions}
                      selected={selectedFields}
                      onChange={setSelectedFields}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-2 sm:gap-0 px-4 py-3 items-center">
                    <span className="text-sm text-muted">Language</span>
                    <MultiSelect
                      options={languageOptions}
                      selected={selectedLanguages}
                      onChange={setSelectedLanguages}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-2 sm:gap-0 px-4 py-3 items-center">
                    <span className="text-sm text-muted">School</span>
                    <MultiSelect
                      options={schoolOptions}
                      selected={selectedSchools}
                      onChange={setSelectedSchools}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-2 sm:gap-0 px-4 py-3 items-center">
                    <span className="text-sm text-muted">Mentor</span>
                    <MultiSelect
                      options={mentorOptions}
                      selected={selectedMentors}
                      onChange={setSelectedMentors}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-2 sm:gap-0 px-4 py-3 items-center">
                    <span className="text-sm text-muted">Country</span>
                    <MultiSelect
                      options={countryOptions}
                      selected={selectedCountries}
                      onChange={setSelectedCountries}
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <p className="text-red-600 text-sm font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-white py-2.5 rounded-md text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </form>
        )}

        <p className="text-sm text-muted text-center mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-ink font-medium hover:underline">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}