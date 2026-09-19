"use client";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

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

      supabase.auth.getUser().then(({ data: freshData }) => {
        if (freshData?.user) {
          setUser(freshData.user);
        }
      });
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
    return `font-label text-[11px] tracking-[0.08em] uppercase px-4 py-2 rounded-full transition whitespace-nowrap ${
      isActive
        ? "bg-primary text-white font-semibold"
        : "text-muted font-medium hover:bg-primary hover:text-white"
    }`;
  };

  const mobileLinkClass = (href) => {
    const isActive = pathname === href;
    return `font-label text-xs tracking-[0.05em] uppercase block w-full text-left px-4 py-3 rounded-lg transition ${
      isActive
        ? "bg-primary text-white font-semibold"
        : "text-ink font-medium hover:bg-surface"
    }`;
  };

  return (
    <header className="border-b border-border bg-background sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.png" alt="PeerVia logo" width={36} height={36} priority />
          <span className="font-display text-xl text-ink">PeerVia</span>
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
          <a href="/about" className={linkClass("/about")}>
            About Us
          </a>
          <div className="w-[150px] flex justify-center">
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
          </div>
        </nav>

        {/* Right side — desktop only */}
        <div className="hidden lg:flex items-center gap-4 text-sm shrink-0">
          {user ? (
            <>
              {["leotweeling@gmail.com", "info.peervia@gmail.com"].includes(user.email) && (
                <a href="/admin" className="font-label text-[11px] tracking-[0.05em] uppercase text-muted font-semibold hover:text-ink transition whitespace-nowrap">
                  Admin
                </a>
              )}
              <a href="/settings" className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm hover:bg-primary-dark transition shrink-0">
                {getInitials(user)}
              </a>
              <button
                onClick={handleLogout}
                className="font-label text-[11px] tracking-[0.05em] uppercase bg-ink text-white px-4 py-2 rounded-lg hover:opacity-90 transition whitespace-nowrap"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <a href="/login" className="font-label text-[11px] tracking-[0.05em] uppercase text-muted hover:text-ink transition whitespace-nowrap">
                Login
              </a>
              <a href="/signup" className="font-label text-[11px] tracking-[0.05em] uppercase bg-ink text-white px-4 py-2 rounded-lg hover:opacity-90 transition whitespace-nowrap">
                Sign up
              </a>
            </>
          )}
        </div>

        {/* Hamburger button — mobile/tablet only */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="lg:hidden w-9 h-9 flex items-center justify-center text-ink"
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
        <div className="lg:hidden border-t border-border bg-background px-4 py-3 space-y-1">
          <a href="/" className={mobileLinkClass("/")}>Home</a>
          <a href="/mentors" className={mobileLinkClass("/mentors")}>Mentors</a>
          <a href="/course-guides" className={mobileLinkClass("/course-guides")}>Course Guides</a>
          <a href="/community" className={mobileLinkClass("/community")}>Community</a>
          <a href="/about" className={mobileLinkClass("/about")}>About Us</a>
          {userLoaded && (
            user?.user_metadata?.role === "mentor" ? (
              <a href="/mentor-account/dashboard" className={mobileLinkClass("/mentor-account/dashboard")}>
                Mentor Dashboard
              </a>
            ) : (
              <a href="/apply" className={mobileLinkClass("/apply")}>Become a Mentor</a>
            )
          )}

          <div className="border-t border-border my-2"></div>

          {user ? (
            <>
              {["leotweeling@gmail.com", "info.peervia@gmail.com"].includes(user.email) && (
                <a href="/admin" className={mobileLinkClass("/admin")}>
                  Admin
                </a>
              )}
              <a href="/settings" className={mobileLinkClass("/settings")}>
                Settings
              </a>
              <button
                onClick={handleLogout}
                className="font-label text-xs tracking-[0.05em] uppercase block w-full text-left px-4 py-3 rounded-lg font-medium text-red-600 hover:bg-red-50 transition"
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