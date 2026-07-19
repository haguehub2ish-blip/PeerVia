"use client";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  function getInitials(user) {
    const name = user?.user_metadata?.name;
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || "?";
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

 const linkClass = (href) => {
  const isActive = pathname === href;
  return `px-4 py-2 rounded-full text-sm transition whitespace-nowrap ${
    isActive
      ? "bg-green-600 text-white font-semibold"
      : "text-gray-600 font-medium hover:bg-green-600 hover:text-white"
  }`;
};

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 py-4 grid grid-cols-3 items-center">
        <a href="/" className="text-xl font-bold text-gray-900 justify-self-start">
          PeerVia
        </a>

        <nav className="flex items-center gap-2 justify-self-center">
          <a href="/" className={linkClass("/")}>
            Home
          </a>
          <a href="/mentors" className={linkClass("/mentors")}>
            Mentors
          </a>
          <a href="/course-guides" className={linkClass("/course-guides")}>
            Course Guides
          </a>
         <a href="/community" className={linkClass("/community")}>
            Community
          </a>
          <a href="/apply" className={linkClass("/apply")}>
            Become a Mentor
          </a>
        </nav>

        <div className="flex items-center gap-4 text-sm justify-self-end">
          {user ? (
            <>
              {user.user_metadata?.role === "mentor" && (
                <a href="/mentor-account/dashboard" className="text-green-700 font-semibold hover:text-green-800 whitespace-nowrap">
                  Mentor Dashboard
                </a>
              )}
              <a href="/settings" className="w-9 h-9 rounded-full bg-green-800 text-white flex items-center justify-center font-bold text-sm hover:bg-green-700 transition">
                {getInitials(user)}
              </a>
              <button
                onClick={handleLogout}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <a href="/login" className="text-gray-600 hover:text-gray-900">
                Login
              </a>
              <a href="/signup" className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">
                Sign up
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}