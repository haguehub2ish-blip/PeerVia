"use client";
import { usePathname } from "next/navigation";
import ContactWidget from "@/Components/ContactWidget";

// Pages where the floating "?" button should NOT appear
const HIDDEN_ON = ["/settings", "/mentor-account/dashboard", "/admin"];

export default function GlobalContactWidget() {
  const pathname = usePathname() || "";

  const hidden = HIDDEN_ON.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (hidden) return null;
  return <ContactWidget />;
}