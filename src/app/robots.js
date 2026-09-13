export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/settings", "/mentor-account"],
    },
    sitemap: "https://peervia.org/sitemap.xml",
  };
}