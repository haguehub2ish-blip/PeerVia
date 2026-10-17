import { supabase } from "@/lib/supabase";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata({ params }) {
  const { id } = await params;

  const { data: mentor } = await supabase
    .from("mentorss")
    .select("name, subject, course, school, about_me, bio")
    .eq("id", id)
    .maybeSingle();

  if (!mentor) {
    return {
      metadataBase: new URL(SITE_URL),
      title: "Mentor | PeerVia",
      description: "Real answers from the people living it.",
    };
  }

  const studying = mentor.course || mentor.subject;
  const about = (mentor.about_me || mentor.bio || "").replace(/\s+/g, " ").trim();
  const snippet = about.length > 140 ? about.slice(0, 137).trimEnd() + "..." : about;

  const title = `${mentor.name} | PeerVia`;
  const description =
    `${mentor.name} studies ${studying} at ${mentor.school}. ` +
    (snippet || "Book a free 1-on-1 chat on PeerVia.");

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      siteName: "PeerVia",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function MentorLayout({ children }) {
  return children;
}