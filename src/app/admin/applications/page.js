"use client";
import { useState, useEffect } from "react";
import Navbar from "@/Components/Navbar";
import { supabase } from "@/lib/supabase";

const statusStyles = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  async function loadApplications() {
    setLoading(true);
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      setError("You must be logged in to view this page.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/admin/applications", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();

    if (result.error) {
      setError(result.error);
    } else {
      setApplications(result.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadApplications();
  }, []);

  async function handleDecision(app, status) {
    setProcessingId(app.id);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const res = await fetch("/api/admin/applications-update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: app.id, status, application: app }),
    });

    const result = await res.json();
    setProcessingId(null);

    if (result.error) {
      alert("Error: " + result.error);
    } else {
      loadApplications();
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF9F2]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-6">
          Mentor Applications
        </h1>

        {loading ? (
          <p className="text-gray-500">Loading applications...</p>
        ) : error ? (
          <p className="text-red-600 font-semibold">{error}</p>
        ) : applications.length === 0 ? (
          <p className="text-gray-500">No applications yet.</p>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-white border border-gray-200 rounded-2xl p-6"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      {app.first_name} {app.last_name}
                    </h3>
                    <p className="text-gray-500 text-sm">{app.email}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${statusStyles[app.status] || "bg-gray-100 text-gray-700"}`}
                  >
                    {app.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <span className="text-gray-500">University: </span>
                    <span className="text-gray-900 font-medium">{app.university}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Year: </span>
                    <span className="text-gray-900 font-medium">{app.year}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Field: </span>
                    <span className="text-gray-900 font-medium">{app.field}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Country: </span>
                    <span className="text-gray-900 font-medium">{app.country}</span>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-3">{app.why}</p>

                {app.linkedin && (
                  <a
                    href={app.linkedin.startsWith("http") ? app.linkedin : `https://${app.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-700 text-sm font-medium hover:underline"
                  >
                    View LinkedIn →
                  </a>
                )}

                {app.status === "pending" && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleDecision(app, "approved")}
                      disabled={processingId === app.id}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {processingId === app.id ? "Processing..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleDecision(app, "rejected")}
                      disabled={processingId === app.id}
                      className="border border-red-300 text-red-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}