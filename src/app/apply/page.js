"use client";
import { useState } from "react";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";
import { courseGuides } from "@/data/courseGuides";
import { getLanguageStyle, languageFlags } from "@/data/mentors";

const fields = ["Medicine", "Mechanical Engineering", "Business", "Computer Science", "Law", "Psychology", "Other"];
const years = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Graduate"];
const countries = ["Netherlands", "United Kingdom", "Other"];
const universityOptions = [
  ...new Set(courseGuides.flatMap((c) => c.popularUniversities)),
].sort();
const languageOptions = Object.keys(languageFlags);

export default function Apply() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    university: "",
    year: "",
    field: "",
    country: "",
    why: "",
    linkedin: "",
  });
  const [selectedLanguages, setSelectedLanguages] = useState(["English"]);
  const [otherUniversity, setOtherUniversity] = useState(false);
  const [otherField, setOtherField] = useState(false);
  const [otherCountry, setOtherCountry] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (selectedLanguages.length === 0) {
      setError("Please select at least one language.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error } = await supabase.from("mentor_applications").insert([
      { ...form, languages: selectedLanguages.join(","), status: "pending" },
    ]);

    setSubmitting(false);

    if (error) {
      setError(error.message);
    } else {
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FFF9F2]">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Application Submitted
          </h1>
          <p className="text-gray-600">
            Thanks for applying! We review every application and aim to get back within 48 hours.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9F2]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">
            Apply to be a PeerVia Mentor
          </h1>
          <p className="text-gray-600 mb-8">
            It takes 5 minutes. We review every application and aim to get back within 48 hours.
          </p>

          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">First name</label>
                <input
                  required
                  value={form.first_name}
                  onChange={(e) => updateField("first_name", e.target.value)}
                  placeholder="Emma"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Last name</label>
                <input
                  required
                  value={form.last_name}
                  onChange={(e) => updateField("last_name", e.target.value)}
                  placeholder="Johnson"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">University Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="e.emma@student.uva.nl"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">University</label>
                <select
                  required={!otherUniversity}
                  value={otherUniversity ? "Other" : form.university}
                  onChange={(e) => {
                    if (e.target.value === "Other") {
                      setOtherUniversity(true);
                      updateField("university", "");
                    } else {
                      setOtherUniversity(false);
                      updateField("university", e.target.value);
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                >
                  <option value="">Select University</option>
                  {universityOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
                {otherUniversity && (
                  <input
                    required
                    value={form.university}
                    onChange={(e) => updateField("university", e.target.value)}
                    placeholder="Enter your University"
                    className="mt-2 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Year of study</label>
                <select
                  required
                  value={form.year}
                  onChange={(e) => updateField("year", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                >
                  <option value="">Select Year</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Career field</label>
              <select
                required={!otherField}
                value={otherField ? "Other" : form.field}
                onChange={(e) => {
                  if (e.target.value === "Other") {
                    setOtherField(true);
                    updateField("field", "");
                  } else {
                    setOtherField(false);
                    updateField("field", e.target.value);
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
              >
                <option value="">Select Field</option>
                {fields.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              {otherField && (
                <input
                  required
                  value={form.field}
                  onChange={(e) => updateField("field", e.target.value)}
                  placeholder="Enter your Career Field"
                  className="mt-2 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Country focus</label>
              <select
                required={!otherCountry}
                value={otherCountry ? "Other" : form.country}
                onChange={(e) => {
                  if (e.target.value === "Other") {
                    setOtherCountry(true);
                    updateField("country", "");
                  } else {
                    setOtherCountry(false);
                    updateField("country", e.target.value);
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
              >
                <option value="">Select Country</option>
                {countries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {otherCountry && (
                <input
                  required
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  placeholder="Enter your Country"
                  className="mt-2 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Languages you speak <span className="text-gray-400 font-normal">(select at least one)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {languageOptions.map((lang) => {
                  const style = getLanguageStyle(lang);
                  const isSelected = selectedLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() =>
                        setSelectedLanguages((prev) =>
                          isSelected ? prev.filter((l) => l !== lang) : [...prev, lang]
                        )
                      }
                      className={`text-xs font-semibold px-3 py-1 rounded-full transition ${style.color} ${
                        isSelected ? "ring-2 ring-gray-900" : "hover:opacity-80"
                      }`}
                    >
                      {style.icon} {lang}
                    </button>
                  );
                })}
              </div>
              {selectedLanguages.length === 0 && (
                <p className="text-red-600 text-xs mt-1.5">Select at least one language.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Why do you want to mentor? <span className="text-gray-400 font-normal">(2–3 sentences)</span>
              </label>
              <textarea
                required
                rows={3}
                value={form.why}
                onChange={(e) => updateField("why", e.target.value)}
                placeholder="What do you wish you knew before starting your degree? What would you tell your 16-year-old self?"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                LinkedIn profile <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                value={form.linkedin}
                onChange={(e) => updateField("linkedin", e.target.value)}
                placeholder="linkedin.com/in/yourname"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>

            {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-800 transition disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Application →"}
            </button>
          </form>
        </div>

        {/* Sidebar */}
        <div className="bg-green-800 text-white rounded-2xl p-8 h-fit">
          <h2 className="text-xl font-bold mb-2">What Mentors Get</h2>
          <p className="text-green-100 text-sm mb-6">
            Being a PeerVia mentor isn't just volunteering. It's something you can build on.
          </p>

          <div className="space-y-5">
            {[
              { icon: "📜", title: "Verified Certificate", text: "A PeerVia mentor certificate you can add to your LinkedIn — showing you've guided students." },
              { icon: "🧩", title: "Public Answer Portfolio", text: "Every answer you write becomes a public showcase of your knowledge, rated by real students." },
              { icon: "🌍", title: "NL × UK Student Network", text: "Access to a private community of ambitious students across both countries." },
              { icon: "🎯", title: "Make a Real Difference", text: "You wished someone told you the truth before you committed. Now you can." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-lg shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="font-semibold text-sm mb-0.5">{item.title}</p>
                  <p className="text-green-100 text-xs leading-relaxed">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}