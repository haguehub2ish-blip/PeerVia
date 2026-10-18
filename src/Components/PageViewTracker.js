"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function getOrCreateVisitorId() {
  try {
    let visitorId = localStorage.getItem("peervia_visitor_id");
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem("peervia_visitor_id", visitorId);
    }
    return visitorId;
  } catch {
    return null;
  }
}

// A session lasts until the tab closes or 30 minutes pass without activity.
function getSession() {
  try {
    const now = Date.now();
    let id = sessionStorage.getItem("peervia_session_id");
    const last = Number(sessionStorage.getItem("peervia_session_last") || 0);
    let isNew = false;
    if (!id || now - last > SESSION_TIMEOUT_MS) {
      id = crypto.randomUUID();
      isNew = true;
      sessionStorage.setItem("peervia_session_id", id);
    }
    sessionStorage.setItem("peervia_session_last", String(now));
    return { id, isNew };
  } catch {
    return { id: null, isNew: false };
  }
}

export default function PageViewTracker() {
  const pathname = usePathname();
  const lastLogged = useRef(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    if (lastLogged.current === pathname) return; // avoids double logging in dev mode
    lastLogged.current = pathname;

    (async () => {
      try {
        const session = getSession();
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;

        // Referrer and campaign tag are only meaningful on the first page of a session
        const params = new URLSearchParams(window.location.search);
        const referrer = session.isNew ? document.referrer || null : null;
        const utmSource = session.isNew ? params.get("utm_source") || params.get("ref") : null;

        await fetch("/api/track", {
          method: "POST",
          keepalive: true,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            path: pathname,
            visitorId: getOrCreateVisitorId(),
            sessionId: session.id,
            referrer,
            utmSource,
          }),
        });
      } catch {
        // never let analytics break the page
      }
    })();
  }, [pathname]);

  return null;
}