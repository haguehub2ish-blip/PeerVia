"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    async function logView() {
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("page_views").insert({
        path: pathname,
        user_id: userData?.user?.id || null,
      });
    }
    logView();
  }, [pathname]);

  return null;
}