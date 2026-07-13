"use client";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const linkClass = (href) => {
    const isActive = pathname === href;
    return `px-4 py-2 rounded-full text-sm transition ${
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
          <a href="/FAQ" className={linkClass("/FAQ")}>
            Q&amp;A
          </a>
        </nav>

        <div className="flex items-center gap-4 text-sm justify-self-end">
          <a href="/login" className="text-gray-600 hover:text-gray-900">
            Login
          </a>
          <a href="/signup" className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">
            Sign up
          </a>
        </div>
      </div>
    </header>
  );
}