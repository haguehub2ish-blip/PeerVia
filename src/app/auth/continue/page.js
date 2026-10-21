"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Where people land after signing in with Google or Microsoft.
// Mentors go to their dashboard, new students go to the age check (so the parent flow starts automatically),
// and everyone else goes home.
export default function AuthContinue() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function go() {
      // give Supabase a moment to pick up the sign-in from the address bar
      let session = null;
      for (let i = 0; i < 24; i++) {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          session = data.session;
          break;
        }
        await new Promise((r) => setTimeout(r, 250));
      }

      if (!session) {
        setFailed(true);
        return;
      }

      const user = session.user;

      // Signed in with a mentor's backup email? Switch to the real mentor account.
      try {
        const res = await fetch("/api/mentor-switch", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const result = await res.json();
        if (result.switch && result.token_hash) {
          const { error: switchError } = await supabase.auth.verifyOtp({
            token_hash: result.token_hash,
            type: "magiclink",
          });
          if (!switchError) {
            window.location.replace("/mentor-account/dashboard");
            return;
          }
        }
      } catch (e) {}

      if (user.user_metadata?.role === "mentor") {
        window.location.replace("/mentor-account/dashboard");
        return;
      }

      const { data: profile } = await supabase
        .from("student_profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      window.location.replace(profile ? "/" : "/verify-age?next=/");
    }
    go();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <p className="text-ink text-center text-sm">
        {failed ? (
          <>
            We couldn't sign you in. <a href="/login" className="underline font-medium">Back to login</a>
          </>
        ) : (
          "Signing you in…"
        )}
      </p>
    </div>
  );
}