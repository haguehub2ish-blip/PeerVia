"use client";
import { useState, useEffect } from "react";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";

const adminLinks = [
  {
    href: "/admin/applications",
    icon: "📋",
    title: "Mentor Applications",
    text: "Review, approve, or reject pending mentor applications.",
    color: "bg-yellow-100 text-yellow-700",
  },
  {
    href: "/admin/analytics",
    icon: "📊",
    title: "Analytics",
    text: "View site-wide stats — users, mentors, questions, and engagement.",
    color: "bg-blue-100 text-blue-700",
  },
  {
    href: "/admin/course-guides",
    icon: "🎓",
    title: "Course Guides",
    text: "View, edit, and manage the current university and course guide listings.",
    color: "bg-purple-100 text-purple-700",
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
    <div className="min-h-screen bg-[#FFF9F2]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-2">
          Admin
        </p>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">
          Admin Dashboard
        </h1>

        {checking ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {adminLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg mb-4 ${link.color}`}>
                  {link.icon}
                </div>
                <h2 className="font-bold text-gray-900 text-lg mb-1">{link.title}</h2>
                <p className="text-gray-600 text-sm leading-relaxed">{link.text}</p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}