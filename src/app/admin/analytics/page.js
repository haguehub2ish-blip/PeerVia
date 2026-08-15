"use client";
import { useState, useEffect } from "react";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";

function StatCard({ icon, label, value, sublabel, color }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg mb-3 ${color}`}>
        {icon}
      </div>
      <p className="text-3xl font-extrabold text-gray-900">{value}</p>
      <p className="text-gray-600 text-sm font-medium mt-0.5">{label}</p>
      {sublabel && <p className="text-gray-400 text-xs mt-1">{sublabel}</p>}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAnalytics() {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setError("You Must Be Logged In To View This Page.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/admin/analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();

      if (result.error) {
        setError(result.error);
      } else {
        setData(result);
      }
      setLoading(false);
    }
    loadAnalytics();
  }, []);

  const maxDaily = data
    ? Math.max(...Object.values(data.signupsByDay), 1)
    : 1;
  const totalWeekSignups = data
    ? Object.values(data.signupsByDay).reduce((sum, n) => sum + n, 0)
    : 0;

  return (
    <div className="min-h-screen bg-[#FFF9F2]">
      <Navbar />

      {/* Header */}
      <section className="bg-white border-b border-gray-200 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-2">
            Admin
          </p>
          <h1 className="text-3xl font-extrabold text-gray-900">Analytics Overview</h1>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {loading ? (
          <p className="text-gray-500">Loading Analytics...</p>
        ) : error ? (
          <p className="text-red-600 font-semibold">{error}</p>
        ) : (
          <>
            {/* People */}
            <SectionLabel>People</SectionLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
              <StatCard
                icon="👥"
                label="Total Users"
                value={data.totalUsers}
                color="bg-blue-100 text-blue-700"
              />
              <StatCard
                icon="🎓"
                label="Approved Mentors"
                value={data.mentorCount}
                color="bg-green-100 text-green-700"
              />
              <StatCard
                icon="✍️"
                label="Community Questions"
                value={data.questionCount}
                color="bg-purple-100 text-purple-700"
              />
            </div>

            {/* Engagement */}
            <SectionLabel>Engagement</SectionLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
              <StatCard
                icon="💬"
                label="Mentor Answers"
                value={data.answerCount}
                color="bg-amber-100 text-amber-700"
              />
              <StatCard
                icon="👍"
                label="Total Likes"
                value={data.likeCount}
                color="bg-pink-100 text-pink-700"
              />
              <StatCard
                icon="🗨️"
                label="Total Comments"
                value={data.commentCount}
                color="bg-indigo-100 text-indigo-700"
              />
            </div>

            {/* Applications */}
            <SectionLabel>Mentor Applications</SectionLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
              <StatCard
                icon="⏳"
                label="Pending Review"
                value={data.applicationStats.pending}
                sublabel={`${data.applicationStats.total} Total Applications`}
                color="bg-yellow-100 text-yellow-700"
              />
              <StatCard
                icon="✅"
                label="Approved"
                value={data.applicationStats.approved}
                color="bg-green-100 text-green-700"
              />
              <StatCard
                icon="✕"
                label="Rejected"
                value={data.applicationStats.rejected}
                color="bg-red-100 text-red-700"
              />
            </div>

            {/* Signups chart */}
            <SectionLabel>Growth</SectionLabel>
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">
                  New Signups
                </h2>
                <span className="text-sm font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">
                  {totalWeekSignups} This Week
                </span>
              </div>
              <div className="flex items-end gap-3 h-40">
                {Object.entries(data.signupsByDay).map(([date, count]) => (
                  <div key={date} className="flex-1 flex flex-col items-center gap-2 group">
                    <p className="text-xs font-bold text-gray-700 opacity-0 group-hover:opacity-100 transition">
                      {count}
                    </p>
                    <div className="w-full flex items-end justify-center h-28">
                      <div
                        className={`w-full rounded-t-lg transition-all ${
                          count > 0 ? "bg-green-600" : "bg-gray-100"
                        }`}
                        style={{
                          height: `${Math.max((count / maxDaily) * 100, count > 0 ? 10 : 4)}%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-[11px] font-medium text-gray-400">
                      {new Date(date).toLocaleDateString("en-GB", { weekday: "short" })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}