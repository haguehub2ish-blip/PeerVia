import { supabase } from "@/lib/supabase";

const baseUrl = "https://peervia.org";

export default async function sitemap() {
  const staticRoutes = [
    "",
    "/mentors",
    "/course-guides",
    "/community",
    "/about",
    "/apply",
    "/volunteer",
    "/login",
    "/signup",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));

  // Mentor profiles and course guides are real pages people search for, so list them too.
  // If the database can't be reached the sitemap still works with the static pages above.
  let mentorRoutes = [];
  let guideRoutes = [];
  try {
    const { data: mentors } = await supabase.from("mentorss").select("id");
    mentorRoutes = (mentors || []).map((m) => ({
      url: `${baseUrl}/mentors/${m.id}`,
      lastModified: new Date(),
    }));

    const { data: guides } = await supabase.from("course_guides").select("id");
    guideRoutes = (guides || []).map((g) => ({
      url: `${baseUrl}/course-guides/${g.id}`,
      lastModified: new Date(),
    }));
  } catch (e) {}

  return [...staticRoutes, ...mentorRoutes, ...guideRoutes];
}