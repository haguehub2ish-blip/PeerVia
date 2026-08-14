"use client";
import { useState } from "react";
import Navbar from "@/Components/Navbar";

const values = [
  {
    icon: "🎓",
    title: "Student-First",
    text: "Every decision we make prioritises what genuinely benefits students.",
  },
  {
    icon: "💬",
    title: "Authenticity",
    text: "We value honesty over perfection and encourage mentors to share both the challenges and rewards of the journey.",
  },
  {
    icon: "🌍",
    title: "Accessibility",
    text: "We strive to make high quality guidance available to as many students as possible with no cost.",
  },
  {
    icon: "🤝",
    title: "Community",
    text: "We are a community where students support one another, share experiences and inspire future generations.",
  },
  {
    icon: "🛡️",
    title: "Trust",
    text: "We are committed to maintaining high standards of integrity and transparency in everything we do.",
  },
  {
    icon: "🌱",
    title: "Growth",
    text: "We encourage curiosity, exploration and continuous development for students seeking guidance and mentors sharing their experience.",
  },
];

export default function About() {
  const [problemExpanded, setProblemExpanded] = useState(false);
  const [solutionExpanded, setSolutionExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-[#FFF9F2]">
      <Navbar />

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-8 text-center">
        <p className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-4">
          About Us
        </p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-5 leading-tight max-w-xl mx-auto">
          We know how overwhelming the future can feel.
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed max-w-xl mx-auto">
          At some point, every student asks themselves the same question:{" "}
          <span className="italic text-gray-900">"What do I want to do in the future?"</span>
        </p>
      </section>

      {/* Problem → Solution cards */}
      <section className="max-w-4xl mx-auto px-6 pt-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-sm font-bold shrink-0">
                !
              </div>
              <h2 className="font-bold text-gray-900 text-lg">We Noticed a Problem</h2>
            </div>
            <p className={`text-gray-600 leading-relaxed ${!problemExpanded ? "line-clamp-3" : ""}`}>
              Finding the answer is rarely simple. There are so many career options, changing
              industries, unfamiliar pathways and important choices like subject selections
              that many students feel pressured to make decisions before they even understand
              their options. Traditional guidance focuses on university rankings, entry
              requirements and application processes, but this leaves students with unanswered
              questions about what studying a specific course is actually like, whether that
              career is the right fit for them and how different careers compare.
            </p>
            <button
              onClick={() => setProblemExpanded(!problemExpanded)}
              className="text-green-700 font-semibold text-sm mt-3 hover:text-green-800"
            >
              {problemExpanded ? "▲ Show Less" : "▼ Read More"}
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold shrink-0">
                ✓
              </div>
              <h2 className="font-bold text-gray-900 text-lg">Why We Created PeerVia</h2>
            </div>
            <p className={`text-gray-600 leading-relaxed ${!solutionExpanded ? "line-clamp-3" : ""}`}>
              We experienced this ourselves. This is why we created PeerVia. It is a
              student-led career guidance platform built to help high school students make
              informed decisions about their futures through honest and open conversations with
              university students who have already walked the path they aspire to follow.
            </p>
            <button
              onClick={() => setSolutionExpanded(!solutionExpanded)}
              className="text-green-700 font-semibold text-sm mt-3 hover:text-green-800"
            >
              {solutionExpanded ? "▲ Show Less" : "▼ Read More"}
            </button>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-green-800 text-white">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <p className="text-xs font-semibold text-green-300 uppercase tracking-widest mb-4">
            Our Mission
          </p>
          <h2 className="text-2xl md:text-3xl font-bold mb-4 leading-snug">
            Making career exploration accessible for every student.
          </h2>
          <p className="text-green-100 leading-relaxed max-w-2xl mx-auto">
            We believe every student deserves to understand their options before making
            important decisions about their future. Our platform helps you explore different
            pathways, understand what careers involve, discover the steps needed to reach them
            and make informed choices with confidence.
          </p>
        </div>
      </section>

      {/* Built by students */}
      <section className="max-w-2xl mx-auto px-6 pt-8 pb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Built by Students, For Students
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          We are students just like you. We know what it feels like to search through countless
          websites, compare confusing pathways and wonder whether we are making the "right"
          choices. PeerVia was created from our own experiences, because we wanted to build the
          resource we wished we had.
        </p>
        <p className="text-xl font-bold text-green-700">
          Your future. Your choices. Your PeerVia.
        </p>
      </section>

      {/* Core values */}
      <section className="bg-orange-50 pt-6 pb-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Our Core Values</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {values.map((value) => (
              <div
                key={value.title}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition"
              >
                <span className="text-2xl mb-3 block">{value.icon}</span>
                <h3 className="font-bold text-gray-900 mb-1.5">{value.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{value.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}