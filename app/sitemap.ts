import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { PROVINCES } from "@/lib/provinces";
import { contentSitemapEntries, localizedSitemapEntries } from "@/lib/sitemap-entries";
import { getLocalizedText } from "@/lib/localized-text";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://sardiniafestival.com").replace(/\/+$/, "");
  const pages: MetadataRoute.Sitemap = [
    ...localizedSitemapEntries(base, "", { changeFrequency: "daily", priority: 1 }),
    ...localizedSitemapEntries(base, "/events", { changeFrequency: "daily", priority: 0.9 }),
    ...localizedSitemapEntries(base, "/events/category", { changeFrequency: "weekly", priority: 0.7 }),
    ...localizedSitemapEntries(base, "/events/city", { changeFrequency: "weekly", priority: 0.8 }),
    ...localizedSitemapEntries(base, "/events/province", { changeFrequency: "weekly", priority: 0.8 }),
    ...PROVINCES.flatMap((province) => localizedSitemapEntries(base, `/events/province/${province.slug}`, { changeFrequency: "weekly", priority: 0.7 })),
  ];
  // Surface database failures as an error instead of publishing an incomplete sitemap.
  const [events, comuni] = await Promise.all([
    prisma.event.findMany({
      where: { status: "PUBLISHED" },
      select: {
        slug: true, titleEn: true, descriptionTranslations: true, updatedAt: true, startsAt: true, endsAt: true, eventType: true,
        category: true, subcategory: true, location: true, comuneId: true,
        comune: { select: { slug: true } },
        dates: { select: { startsAt: true, endsAt: true, city: true, comuneId: true, comune: { select: { slug: true } } } },
      },
    }),
    prisma.comune.findMany({ select: { name: true, slug: true } }),
  ]);
  pages.push(...contentSitemapEntries(base, new Date(), events.map(({ descriptionTranslations, ...event }) => ({
    ...event,
    descriptionEn: getLocalizedText(descriptionTranslations, "en", "") || null,
  })), comuni));
  return pages;
}
