import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://sardiniafestival.com").replace(/\/+$/, "");
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin/", "/dashboard/", "/accedi", "/registrati", "/api/"] },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
