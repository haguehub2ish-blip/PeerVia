"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

function getOrCreateVisitorId() {
  let visitorId = localStorage.getItem("peervia_visitor_id");
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem("peervia_visitor_id", visitorId);
  }
  return visitorId;
}

export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    async function logView() {
      const { data: userData } = await supabase.auth.getUser();
      const visitorId = getOrCreateVisitorId();

      await supabase.from("page_views").insert({
        path: pathname,
        user_id: userData?.user?.id || null,
        visitor_id: visitorId,
      });
    }
    logView();
  }, [pathname]);

  return null;
}