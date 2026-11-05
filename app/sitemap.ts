import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { contentSitemapEntries } from "@/lib/sitemap-entries";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://sardiniafestival.com").replace(/\/+$/, "");
  const pages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/eventi`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/categorie`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/segnala-evento`, changeFrequency: "monthly", priority: 0.5 },
  ];
  try {
    const now = new Date();
    const [events, comuni] = await Promise.all([
      prisma.event.findMany({
        where: { status: "PUBLISHED" },
        select: {
          slug: true,
          updatedAt: true,
          startsAt: true,
          endsAt: true,
          eventType: true,
          category: true,
          subcategory: true,
          location: true,
          comuneId: true,
          comune: { select: { slug: true } },
          dates: { select: { startsAt: true, endsAt: true, city: true, comuneId: true, comune: { select: { slug: true } } } },
        },
      }),
      prisma.comune.findMany({ select: { name: true, slug: true } }),
    ]);
    pages.push(...contentSitemapEntries(base, now, events, comuni));
  } catch { /* A sitemap without database events is valid while the portal is empty. */ }
  return pages;
}
