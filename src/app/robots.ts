import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/auth", "/login", "/signup", "/forgot-password", "/reset-password", "/pending-approval"],
      },
    ],
    sitemap: "https://lcon.leafclutch.com.np/sitemap.xml",
  };
}
