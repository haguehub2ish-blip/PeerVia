"use client";
import { useState, useEffect, useRef } from "react";
import Navbar from "@/Components/Navbar";
import MultiSelect from "@/Components/MultiSelect";
import { supabase } from "@/lib/supabase";
import { courseGuides, allUniversityNames } from "@/data/courseGuides"
import { getSubjectStyle, getFlag, getLanguageStyle } from "@/data/mentors";

const sections = [
  { id: "account", label: "Account" },
  { id: "notifications", label: "Notifications" },
  { id: "danger", label: "Danger Zone" },
];

export default function Settings() {
  const [activeSection, setActiveSection] = useState("account");

  const [user, setUser] = useState(null);
  const [allMentors, setAllMentors] = useState([]);

  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [selectedSchools, setSelectedSchools] = useState([]);
  const [selectedMentors, setSelectedMentors] = useState([]);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [notifyOwnQuestions, setNotifyOwnQuestions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const savedTimeoutRef = useRef(null);

  const [mentorPhoto, setMentorPhoto] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const currentUser = data?.user || null;
      setUser(currentUser);

      if (currentUser?.user_metadata?.role === "mentor") {
        supabase
          .from("mentorss")
          .select("photo_url")
          .eq("user_id", currentUser.id)
          .single()
          .then(({ data: mentorRow }) => {
            if (mentorRow?.photo_url) setMentorPhoto(mentorRow.photo_url);
          });
      }

      const prefs = currentUser?.user_metadata?.emailPreferences;
      if (prefs) {
        setSelectedFields(prefs.fields || []);
        setSelectedLanguages(prefs.languages || []);
        setSelectedSchools(prefs.schools || []);
        setSelectedMentors(prefs.mentors || []);
        setSelectedCountries(prefs.countries || []);
        setNotifyOwnQuestions(prefs.notifyOwnQuestions ?? true);
      }
      setPrefsLoading(false);
    });
    supabase.from("mentorss").select("*").then(({ data }) => {
      if (data) setAllMentors(data);
    });

    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  const fieldOptions = [...new Set(allMentors.map((m) => m.subject).filter(Boolean))];
  const languageOptions = [
    ...new Set(
      allMentors.flatMap((m) =>
        typeof m.languages === "string"
          ? m.languages.split(",").map((l) => l.trim())
          : m.languages || []
      )
    ),
  ];
  const schoolOptions = [
    ...new Set([
      ...allMentors.map((m) => m.school).filter(Boolean),
      ...allUniversityNames,
    ]),
  ];
  const mentorOptions = allMentors.map((m) => m.name).filter(Boolean);
  const countryOptions = [
    ...new Set([
      ...allMentors.map((m) => m.country).filter(Boolean),
      ...courseGuides.map((u) => u.country),
    ]),
  ];

    const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  function handleAvatarSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please upload an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Image must be under 5MB.");
      return;
    }

    setAvatarError("");
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleUploadAvatar() {
    if (!avatarFile) return;

    setAvatarUploading(true);
    setAvatarError("");

    const fileExt = avatarFile.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, avatarFile);

    if (uploadError) {
      setAvatarError("Upload failed: " + uploadError.message);
      setAvatarUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const { data, error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: urlData.publicUrl },
    });

    setAvatarUploading(false);

    if (updateError) {
      setAvatarError(updateError.message);
    } else {
      setUser(data.user);
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  }
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteError, setDeleteError] = useState(null);

  function handleDeleteAccount() {
    setDeleteError(null);
    setConfirmEmail("");
    setConfirmPassword("");
    setShowDeleteConfirm(true);
  }

  async function handleConfirmDelete(e) {
    e.preventDefault();
    setDeleteError(null);
    setDeleting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: confirmEmail,
      password: confirmPassword,
    });

    if (signInError) {
      setDeleteError("Incorrect email or password.");
      setDeleting(false);
      return;
    }

    if (confirmEmail.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
      setDeleteError("That email doesn't match your account.");
      setDeleting(false);
      return;
    }

    const res = await fetch("/api/delete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });

    const result = await res.json();

    if (result.error) {
      setDeleteError(result.error);
      setDeleting(false);
    } else {
      await supabase.auth.signOut();
      window.location.href = "/";
    }
  }

  async function handleSavePreferences() {
    setSaving(true);
    setSaved(false);

    const { data, error } = await supabase.auth.updateUser({
      data: {
        emailPreferences: {
          fields: selectedFields,
          languages: selectedLanguages,
          schools: selectedSchools,
          mentors: selectedMentors,
          countries: selectedCountries,
          notifyOwnQuestions,
        },
      },
    });

    setSaving(false);

    if (!error) {
      setUser(data.user);
      setSaved(true);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="font-display text-3xl text-ink mb-1">Settings</h1>
        <p className="text-muted text-sm mb-10">
          Manage your account details, notification preferences, and data.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-10">
          {/* Sidebar nav */}
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible border-b md:border-b-0 md:border-r border-border pb-2 md:pb-0 md:pr-6">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`text-left px-3 py-2.5 text-sm font-medium transition whitespace-nowrap relative border-l-2 ${
                  activeSection === s.id
                    ? "border-l-primary text-ink bg-surface"
                    : "border-l-transparent text-muted hover:text-ink hover:bg-surface/60"
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div>
            {/* ACCOUNT */}
            {activeSection === "account" && (
              <div>
                <h2 className="font-display text-xl text-ink mb-1">Account</h2>
                <p className="text-muted text-sm mb-6">Your basic account information.</p>

                <div className="flex items-center gap-4 bg-surface border border-border rounded-lg p-5 mb-6 shadow-sm">
                  <div className="relative shrink-0">
                    {avatarPreview || mentorPhoto || user?.user_metadata?.avatar_url ? (
                      <img
                        src={avatarPreview || mentorPhoto || user.user_metadata.avatar_url}
                        alt="Profile"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-ink text-white flex items-center justify-center font-display text-base">
                        {(user?.user_metadata?.name || user?.email || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    {!mentorPhoto && (
                      <label className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center text-[10px] cursor-pointer hover:bg-surface transition">
                        ✎
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-base text-ink leading-tight truncate">
                      {user?.user_metadata?.name || "Unnamed User"}
                    </p>
                    <p className="text-muted text-sm truncate">{user?.email}</p>
                  </div>
                  {user?.user_metadata?.role === "mentor" && (
                    <span className="ml-auto text-xs font-medium text-primary border border-primary/30 px-2.5 py-1 rounded-md shrink-0">
                      Mentor
                    </span>
                  )}
                </div>

                {avatarFile && (
                  <div className="flex items-center gap-2 -mt-3 mb-6">
                    <button
                      onClick={handleUploadAvatar}
                      disabled={avatarUploading}
                      className="bg-ink text-white px-4 py-1.5 rounded-md text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
                    >
                      {avatarUploading ? "Uploading..." : "Save photo"}
                    </button>
                    <button
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview(null);
                      }}
                      className="text-xs font-medium text-muted hover:text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {avatarError && (
                  <p className="text-red-600 text-xs -mt-4 mb-6">{avatarError}</p>
                )}

                <div className="border border-border rounded-lg divide-y divide-border bg-surface shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4">
                    <span className="text-sm text-muted">Full name</span>
                    <span className="text-sm text-ink font-medium">
                      {user?.user_metadata?.name || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-5 py-4">
                    <span className="text-sm text-muted">Email address</span>
                    <span className="text-sm text-ink font-medium">{user?.email}</span>
                  </div>
                  <div className="flex items-center justify-between px-5 py-4">
                    <span className="text-sm text-muted">Account type</span>
                    <span className="text-sm text-ink font-medium">
                      {user?.user_metadata?.role === "mentor" ? "Mentor" : "Student"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS */}
            {activeSection === "notifications" && (
              <div>
                <h2 className="font-display text-xl text-ink mb-1">Notifications</h2>
                <p className="text-muted text-sm mb-6">
                  Choose what you'd like to receive email updates about.
                </p>

                <div className="border border-border rounded-lg mb-8 bg-surface shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-ink">
                        Notify me when a mentor answers my question
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        Sent whenever one of your own questions gets a response.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyOwnQuestions}
                      onChange={(e) => setNotifyOwnQuestions(e.target.checked)}
                      className="w-4 h-4 accent-primary shrink-0 ml-4"
                    />
                  </div>
                </div>

                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                  Notify me about new questions matching
                </p>

                {prefsLoading ? (
                  <div className="space-y-3 animate-pulse">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-11 bg-surface rounded-md" />
                    ))}
                  </div>
                ) : (
                  <div className="border border-border rounded-lg divide-y divide-border bg-surface shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2 sm:gap-0 px-5 py-4 items-center hover:bg-background/60 transition-colors">
                      <span className="text-sm text-muted">Field</span>
                      <MultiSelect
                        options={fieldOptions}
                        selected={selectedFields}
                        onChange={setSelectedFields}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2 sm:gap-0 px-5 py-4 items-center hover:bg-background/60 transition-colors">
                      <span className="text-sm text-muted">Language</span>
                      <MultiSelect
                        options={languageOptions}
                        selected={selectedLanguages}
                        onChange={setSelectedLanguages}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2 sm:gap-0 px-5 py-4 items-center hover:bg-background/60 transition-colors">
                      <span className="text-sm text-muted">School</span>
                      <MultiSelect
                        options={schoolOptions}
                        selected={selectedSchools}
                        onChange={setSelectedSchools}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2 sm:gap-0 px-5 py-4 items-center hover:bg-background/60 transition-colors">
                      <span className="text-sm text-muted">Mentor</span>
                      <MultiSelect
                        options={mentorOptions}
                        selected={selectedMentors}
                        onChange={setSelectedMentors}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2 sm:gap-0 px-5 py-4 items-center hover:bg-background/60 transition-colors">
                      <span className="text-sm text-muted">Country</span>
                      <MultiSelect
                        options={countryOptions}
                        selected={selectedCountries}
                        onChange={setSelectedCountries}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 mt-6">
                  <button
                    onClick={handleSavePreferences}
                    disabled={saving}
                    className="bg-ink text-white px-5 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                  {saved && (
                    <span className="text-sm text-primary font-medium">Saved</span>
                  )}
                </div>
              </div>
            )}

            {/* DANGER ZONE */}
            {activeSection === "danger" && (
              <div>
                <h2 className="font-display text-xl text-red-700 mb-1">Danger Zone</h2>
                <p className="text-muted text-sm mb-6">
                  Permanently delete your account and all associated data. This cannot be undone.
                </p>

                <div className="border border-red-200 bg-red-50/50 rounded-lg p-5">
                  {!showDeleteConfirm ? (
                    <button
                      onClick={handleDeleteAccount}
                      className="border border-red-300 text-red-700 px-5 py-2 rounded-md text-sm font-semibold hover:bg-red-100 transition"
                    >
                      Delete account
                    </button>
                  ) : (
                    <form onSubmit={handleConfirmDelete} className="space-y-3">
                      <p className="text-sm text-ink font-medium">
                        Confirm your email and password to permanently delete your account.
                      </p>
                      <input
                        type="email"
                        required
                        placeholder="Email"
                        value={confirmEmail}
                        onChange={(e) => setConfirmEmail(e.target.value)}
                        className="w-full border border-border rounded-md px-3 py-2 text-sm text-ink bg-background focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                      <input
                        type="password"
                        required
                        placeholder="Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full border border-border rounded-md px-3 py-2 text-sm text-ink bg-background focus:outline-none focus:ring-2 focus:ring-red-400"
                      />

                      {deleteError && (
                        <p className="text-red-600 text-sm font-medium">{deleteError}</p>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={deleting}
                          className="bg-red-600 text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50"
                        >
                          {deleting ? "Deleting..." : "Confirm delete"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="border border-border text-ink px-5 py-2 rounded-md text-sm font-semibold hover:bg-surface transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}