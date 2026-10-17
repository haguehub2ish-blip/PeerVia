"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";

const adminLinks = [
  {
    href: "/admin/applications",
    icon: "📋",
    title: "Mentor Applications",
    text: "Review, approve, or reject pending mentor applications.",
  },
  {
    href: "/admin/analytics",
    icon: "📊",
    title: "Analytics",
    text: "View site-wide stats — users, mentors, questions, and engagement.",
  },
  {
    href: "/admin/course-guides",
    icon: "🎓",
    title: "Course Guides",
    text: "View, edit, and manage the current university and course guide listings.",
  },
];

export default function AdminHub() {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const { data } = await supabase.auth.getUser();
      // This is just a UI convenience check — real security lives server-side
      // in each /api/admin/* route, which always re-verifies the session.
      setAuthorized(!!data?.user);
      setChecking(false);
    }
    checkAdmin();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <p className="font-label text-[10px] tracking-[0.15em] uppercase text-primary mb-2">
          Admin
        </p>
        <h1 className="font-display text-3xl md:text-4xl text-ink leading-tight mb-2">
          Admin Dashboard
        </h1>
        <p className="text-muted text-sm mb-10">
          Everything you need to run PeerVia in one place.
        </p>

        {checking ? (
          <p className="text-muted text-sm">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group bg-surface border border-border rounded-lg p-6 shadow-sm hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg mb-4">
                  {link.icon}
                </div>
                <h2 className="font-display text-xl text-ink mb-1">{link.title}</h2>
                <p className="text-muted text-sm leading-relaxed mb-4">{link.text}</p>
                <span className="font-label text-[10px] tracking-[0.1em] uppercase text-primary group-hover:underline underline-offset-4">
                  Open →
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}