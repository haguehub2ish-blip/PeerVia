"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/Components/Navbar";
import { getSubjectStyle, getFlag } from "@/data/mentors";
import { questions } from "@/data/questions";

const fields = ["All fields", "Medicine", "Engineering", "Law", "Business", "Computer Science", "Psychology", "Biology", "Architecture"];
const countries = ["NL & UK", "Netherlands", "United Kingdom"];

export default function QAFeed() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFF9F2]" />}>
      <QAFeedContent />
    </Suspense>
  );
}

function QAFeedContent() {
  const searchParams = useSearchParams();
  const [openIndex, setOpenIndex] = useState(0);
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      const index = questions.findIndex((q) => q.id === hash);
      if (index !== -1) {
        setOpenIndex(index);
      }
    }
  }, []);
  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("NL & UK");

 useEffect(() => {
    const fieldParam = searchParams.get("field");
    if (fieldParam) {
      const validFields = fieldParam.split(",").filter((f) => fields.includes(f));
      if (validFields.length > 0) {
        setSelectedFields(validFields);
      }
    }

    const countryParam = searchParams.get("country");
    const countryDisplayMap = { NL: "Netherlands", UK: "United Kingdom" };
    if (countryParam) {
      const firstCode = countryParam.split(",")[0];
      if (countryDisplayMap[firstCode]) {
        setSelectedCountry(countryDisplayMap[firstCode]);
      }
    }
  }, [searchParams]);
  const [search, setSearch] = useState("");

  const toggleField = (field) => {
    if (field === "All fields") {
      setSelectedFields([]);
      return;
    }
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const countryCodeMap = { "Netherlands": "NL", "United Kingdom": "UK" };

  const filteredQuestions = questions.filter((q) => {
    const matchesField = selectedFields.length === 0 || selectedFields.includes(q.subject);
    const matchesCountry =
      selectedCountry === "NL & UK" || q.country === countryCodeMap[selectedCountry];
    const matchesSearch = q.question.toLowerCase().includes(search.toLowerCase());
    return matchesField && matchesCountry && matchesSearch;
  });
  return (
   <div className="min-h-screen bg-[#FFF9F2]">
      <Navbar />
      <div className="flex">
      {/* Sidebar */}
  <aside className="w-64 bg-white border-r border-gray-300 p-6 hidden md:block">
        <p className="text-xs font-semibold text-gray-500 mb-3 tracking-wide">CAREER FIELD</p>
       <div className="space-y-1 mb-8">
          {fields.map((field) => {
            const isActive =
              field === "All fields" ? selectedFields.length === 0 : selectedFields.includes(field);
            return (
              <button
                key={field}
                onClick={() => toggleField(field)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition ${
                  isActive
                    ? "bg-green-50 text-green-800 font-semibold"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isActive ? "bg-green-600" : "bg-gray-300"
                  }`}
                ></span>
                {field}
              </button>
            );
          })}
        </div>

        <p className="text-xs font-semibold text-gray-500 mb-3 tracking-wide">COUNTRY</p>
        <div className="space-y-1">
          {countries.map((country) => (
            <button
              key={country}
              onClick={() => setSelectedCountry(country)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition ${
                selectedCountry === country
                  ? "bg-green-50 text-green-800 font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  selectedCountry === country ? "bg-green-600" : "bg-gray-300"
                }`}
              ></span>
              {country}
            </button>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 md:p-10">
        {/* Top bar */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 shrink-0">Q&A Feed</h1>
          <div className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2.5 flex items-center gap-2">
            <span>🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="flex-1 focus:outline-none text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Ask a question box */}
        <div className="bg-white border border-gray-300 rounded-xl px-5 py-4 flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-full bg-green-800 text-white flex items-center justify-center font-bold text-sm shrink-0">
            You
          </div>
          <input
            type="text"
            placeholder="Ask a question to verified mentors..."
            className="flex-1 focus:outline-none text-gray-900 placeholder-gray-400"
          />
          <button className="bg-green-700 text-white px-5 py-2 rounded-lg font-medium hover:bg-green-800 transition shrink-0">
            Ask
          </button>
        </div>

        {/* Question cards */}
        <div className="space-y-4">
          {filteredQuestions.map((q, i) => {
            const isOpen = openIndex === i;
            return (
             <div
                key={i}
                id={q.id}
                className="bg-white border border-gray-300 rounded-xl overflow-hidden scroll-mt-24"
              >
                <div className="p-5">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span
                      className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${getSubjectStyle(q.subject).color}`}
                    >
                      {getSubjectStyle(q.subject).icon} {q.subject}
                    </span>
                    <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                      {getFlag(q.country)} {q.country}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{q.question}</h3>
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="text-green-700 font-semibold text-sm flex items-center gap-1 hover:text-green-800"
                  >
                    {isOpen ? "▲ Hide answer" : "▼ Show answer"}
                  </button>
                </div>

                {isOpen && (
                  <>
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4 text-gray-600 leading-relaxed">
                      {q.answer}
                    </div>
                    <div className="bg-gray-50 px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {q.initials}
                        </div>
                        <div>
                          <p className="font-semibold text-green-800 text-sm">{q.name}</p>
                          <p className="text-gray-500 text-xs">
                            {q.school} · {q.year}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>👍 {q.helpful} found helpful</span>
                        <span>👁 {q.views} views</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
     </main>
      </div>
    </div>
  );
}