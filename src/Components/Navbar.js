"use client";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user || null);
      setUserLoaded(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setUserLoaded(true);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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

  const mobileLinkClass = (href) => {
    const isActive = pathname === href;
    return `block w-full text-left px-4 py-3 rounded-lg text-sm transition ${
      isActive
        ? "bg-green-600 text-white font-semibold"
        : "text-gray-700 font-medium hover:bg-gray-50"
    }`;
  };

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="text-xl font-bold text-gray-900 shrink-0">
          PeerVia
        </a>

        {/* Centered nav links — desktop only */}
        <nav className="hidden lg:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
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
          {userLoaded && (
            user?.user_metadata?.role === "mentor" ? (
              <a href="/mentor-account/dashboard" className={linkClass("/mentor-account/dashboard")}>
                Mentor Dashboard
              </a>
            ) : (
              <a href="/apply" className={linkClass("/apply")}>
                Become a Mentor
              </a>
            )
          )}
        </nav>

        {/* Right side — desktop only */}
        <div className="hidden lg:flex items-center gap-4 text-sm shrink-0">
          {user ? (
            <>
              <a href="/settings" className="w-9 h-9 rounded-full bg-green-800 text-white flex items-center justify-center font-bold text-sm hover:bg-green-700 transition shrink-0">
                {getInitials(user)}
              </a>
              <button
                onClick={handleLogout}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition whitespace-nowrap"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <a href="/login" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">
                Login
              </a>
              <a href="/signup" className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition whitespace-nowrap">
                Sign up
              </a>
            </>
          )}
        </div>

        {/* Hamburger button — mobile/tablet only */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="lg:hidden w-9 h-9 flex items-center justify-center text-gray-700"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <span className="text-2xl leading-none">✕</span>
          ) : (
            <span className="text-2xl leading-none">☰</span>
          )}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-gray-200 px-4 py-3 space-y-1">
          <a href="/" className={mobileLinkClass("/")}>Home</a>
          <a href="/mentors" className={mobileLinkClass("/mentors")}>Mentors</a>
          <a href="/course-guides" className={mobileLinkClass("/course-guides")}>Course Guides</a>
          <a href="/community" className={mobileLinkClass("/community")}>Community</a>
          {userLoaded && (
            user?.user_metadata?.role === "mentor" ? (
              <a href="/mentor-account/dashboard" className={mobileLinkClass("/mentor-account/dashboard")}>
                Mentor Dashboard
              </a>
            ) : (
              <a href="/apply" className={mobileLinkClass("/apply")}>Become a Mentor</a>
            )
          )}

          <div className="border-t border-gray-100 my-2"></div>

          {user ? (
            <>
              <a href="/settings" className={mobileLinkClass("/settings")}>
                Settings
              </a>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <a href="/login" className={mobileLinkClass("/login")}>Login</a>
              <a href="/signup" className={mobileLinkClass("/signup")}>Sign up</a>
            </>
          )}
        </div>
      )}
    </header>
  );
}