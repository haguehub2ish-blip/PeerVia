export default function sitemap() {
  const baseUrl = "https://peervia.org";

  const routes = [
    "",
    "/mentors",
    "/course-guides",
    "/community",
    "/about",
    "/apply",
    "/login",
    "/signup",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));
}