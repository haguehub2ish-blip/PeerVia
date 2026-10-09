"use client";
import { useState } from "react";
import Navbar from "@/Components/Navbar";

// Swap any of these for a different file in /public/images, or set to "" to hide that photo.
const ABOUT_HERO_PHOTO_URL = "/images/PV_AboutUs.jpg";
const ABOUT_MISSION_PHOTO_URL = "/images/campus-medicine.jpg";
const ABOUT_STUDENTS_PHOTO_URL = "/images/PV_HomePage2.jpg";

function PhotoBlock({ src, alt = "", className = "", tint = 55, opacity = 100 }) {
  if (!src) return null;
  return (
    <div className={className} style={{ opacity: opacity / 100 }}>
      <div className="relative w-full h-full overflow-hidden">
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover grayscale contrast-[1.08]"
        />
        <div
          className="absolute inset-0 bg-primary mix-blend-multiply"
          style={{ opacity: tint / 100 }}
        />
      </div>
    </div>
  );
}

const values = [
  {
    number: "01",
    title: "Student-First",
    text: "Every decision we make prioritises what genuinely benefits students.",
  },
  {
    number: "02",
    title: "Authenticity",
    text: "We value honesty over perfection and encourage mentors to share both the challenges and rewards of the journey.",
  },
  {
    number: "03",
    title: "Accessibility",
    text: "We strive to make high quality guidance available to as many students as possible with no cost.",
  },
  {
    number: "04",
    title: "Community",
    text: "We are a community where students support one another, share experiences and inspire future generations.",
  },
  {
    number: "05",
    title: "Trust",
    text: "We are committed to maintaining high standards of integrity and transparency in everything we do.",
  },
  {
    number: "06",
    title: "Growth",
    text: "We encourage curiosity, exploration and continuous development for students seeking guidance and mentors sharing their experience.",
  },
];

export default function About() {
  const [problemExpanded, setProblemExpanded] = useState(false);
  const [solutionExpanded, setSolutionExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-background bg-grain">
      <Navbar />

          {/* Hero */}
      <section className="relative overflow-hidden bg-ink px-6 py-24 md:py-32 text-center">
        {ABOUT_HERO_PHOTO_URL && (
          <>
            <PhotoBlock
              src={ABOUT_HERO_PHOTO_URL}
              className="absolute inset-0 w-full h-full"
              tint={70}
            />
            <div className="absolute inset-0 bg-ink/60" />
          </>
        )}
        <div className="relative max-w-3xl mx-auto">
          <p className="inline-block font-label text-[11px] tracking-[0.15em] uppercase border border-white/30 rounded-full px-4 py-2 text-white/80 mb-7">
            About Us
          </p>
          <h1
            className="font-display text-4xl md:text-6xl text-white leading-[1.08] mb-6"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.45)" }}
          >
            We know how overwhelming{" "}
            <span className="italic text-white">the future can feel.</span>
          </h1>
          <p className="text-lg text-white/80 leading-relaxed max-w-xl mx-auto">
            At some point, every student asks themselves the same question:{" "}
            <span className="italic text-white">&ldquo;What do I want to do in the future?&rdquo;</span>
          </p>
        </div>
      </section>
      {/* Problem → Solution cards */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="bg-surface border border-border rounded-2xl p-8">
            <p className="font-display text-3xl text-primary/40 mb-4">01</p>
            <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-3">
              The Problem
            </p>
            <h2 className="font-display text-2xl text-ink mb-4">We Noticed a Problem</h2>
            <p className={`text-muted leading-relaxed ${!problemExpanded ? "line-clamp-3" : ""}`}>
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
              className="font-label text-[11px] tracking-[0.1em] uppercase text-primary mt-5 hover:text-primary-dark transition"
            >
              {problemExpanded ? "Show Less" : "Read More →"}
            </button>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-8">
            <p className="font-display text-3xl text-primary/40 mb-4">02</p>
            <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-3">
              Our Solution
            </p>
            <h2 className="font-display text-2xl text-ink mb-4">Why We Created PeerVia</h2>
            <p className={`text-muted leading-relaxed ${!solutionExpanded ? "line-clamp-3" : ""}`}>
              We experienced this ourselves. This is why we created PeerVia. It is a
              student-led career guidance platform built to help high school students make
              informed decisions about their futures through honest and open conversations with
              university students who have already walked the path they aspire to follow.
            </p>
            <button
              onClick={() => setSolutionExpanded(!solutionExpanded)}
              className="font-label text-[11px] tracking-[0.1em] uppercase text-primary mt-5 hover:text-primary-dark transition"
            >
              {solutionExpanded ? "Show Less" : "Read More →"}
            </button>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="relative overflow-hidden bg-ink text-white">
        {ABOUT_MISSION_PHOTO_URL && (
          <div
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              maskImage:
                "linear-gradient(to bottom, transparent, rgba(0,0,0,0.6) 20%, rgba(0,0,0,0.6) 80%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent, rgba(0,0,0,0.6) 20%, rgba(0,0,0,0.6) 80%, transparent)",
            }}
          >
            <PhotoBlock
              src={ABOUT_MISSION_PHOTO_URL}
              className="w-full h-full"
              tint={45}
              opacity={22}
            />
          </div>
        )}
        <div className="relative max-w-3xl mx-auto px-6 py-24 text-center">
          <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-4">
            Our Mission
          </p>
          <h2 className="font-display text-3xl md:text-5xl mb-6 leading-snug">
            Making career exploration{" "}
            <span className="italic text-primary">accessible for every student.</span>
          </h2>
          <p className="text-white/75 leading-relaxed max-w-2xl mx-auto">
            We believe every student deserves to understand their options before making
            important decisions about their future. Our platform helps you explore different
            pathways, understand what careers involve, discover the steps needed to reach them
            and make informed choices with confidence.
          </p>
        </div>
      </section>

      {/* Built by students */}
      <section className="px-6 py-20 md:py-24">
        <div
          className={`max-w-5xl mx-auto grid grid-cols-1 gap-12 items-center ${
            ABOUT_STUDENTS_PHOTO_URL ? "md:grid-cols-2" : ""
          }`}
        >
          {ABOUT_STUDENTS_PHOTO_URL && (
            <PhotoBlock
              src={ABOUT_STUDENTS_PHOTO_URL}
              className="w-full aspect-[4/3] rounded-2xl border border-border overflow-hidden shadow-xl"
              tint={40}
            />
          )}
          <div>
            <h2 className="font-display text-3xl md:text-4xl text-ink mb-5">
              Built by Students, <span className="italic text-primary">For Students</span>
            </h2>
            <p className="text-muted leading-relaxed mb-6">
              We are students just like you. We know what it feels like to search through countless
              websites, compare confusing pathways and wonder whether we are making the &ldquo;right&rdquo;
              choices. PeerVia was created from our own experiences, because we wanted to build the
              resource we wished we had.
            </p>
            <p className="font-display text-xl italic text-primary">
              Your future. Your choices. Your PeerVia.
            </p>
          </div>
        </div>
      </section>

      {/* Core values */}
      <section className="bg-surface border-t border-border px-6 pt-20 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-xl mb-12">
            <p className="font-label text-[11px] tracking-[0.15em] uppercase text-primary mb-3">
              What We Stand For
            </p>
            <h2 className="font-display text-3xl md:text-4xl text-ink">Our Core Values</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
            {values.map((value) => (
              <div key={value.title} className="border-t border-border pt-6">
                <p className="font-display text-3xl text-primary/40 mb-4">{value.number}</p>
                <h3 className="font-display text-xl text-ink mb-2">{value.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{value.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}