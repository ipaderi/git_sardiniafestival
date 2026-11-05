import type { MetadataRoute } from "next";
import { eventCategories, slugifyCategory } from "@/lib/event-categories";

export type SitemapEvent = {
  slug: string;
  updatedAt: Date;
  startsAt: Date;
  endsAt: Date | null;
  eventType: "SINGLE_DAY" | "MULTI_DAY" | "MULTI_LOCATION" | "ONLINE";
  category: string;
  subcategory: string | null;
  location: string | null;
  comuneId: string | null;
  comune: { slug: string } | null;
  dates: { startsAt: Date; endsAt: Date | null; city: string | null; comuneId: string | null; comune: { slug: string } | null }[];
};

/** The caller supplies published events and all their occurrences, including past ones. */
export function contentSitemapEntries(
  base: string,
  now: Date,
  events: SitemapEvent[],
  comuni: { name: string; slug: string }[],
): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${base}/eventi/${event.slug}`,
    lastModified: event.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  for (const category of eventCategories) {
    const matchingEvents = events.filter((event) => event.category.toLowerCase() === category.name.toLowerCase());
    if (!matchingEvents.length) continue;
    const lastModified = matchingEvents.reduce((latest, event) => event.updatedAt > latest ? event.updatedAt : latest, new Date(0));
    pages.push({ url: `${base}/categorie/${slugifyCategory(category.name)}`, lastModified, changeFrequency: "weekly", priority: 0.7 });
  }

  // Local pages also display legacy events whose city name matches without a comuneId.
  const comuneByName = new Map(comuni.map((comune) => [comune.name.toLowerCase(), comune.slug]));
  const localPages = new Map<string, Date>();
  const addLocalPage = (path: string, updatedAt: Date) => {
    const previous = localPages.get(path);
    if (!previous || updatedAt > previous) localPages.set(path, updatedAt);
  };
  const resolveSlug = (comune: { slug: string } | null, comuneId: string | null, name: string | null) =>
    comune?.slug ?? (comuneId === null && name ? comuneByName.get(name.toLowerCase()) : undefined);
  for (const event of events) {
    if (event.eventType === "ONLINE") continue;
    const isSagra = event.category.toLowerCase() === "tradizione" || event.subcategory?.toLowerCase().includes("sagr");
    const mainSlug = resolveSlug(event.comune, event.comuneId, event.location);
    if (event.eventType === "MULTI_LOCATION" && event.dates.length) {
      for (const date of event.dates) {
        const slug = resolveSlug(date.comune, date.comuneId, date.city);
        if (!slug) continue;
        addLocalPage(`/citta/${slug}`, event.updatedAt);
        if (isSagra && (date.endsAt ?? date.startsAt) >= now) addLocalPage(`/sagre-a/${slug}`, event.updatedAt);
      }
      continue;
    }
    if (!mainSlug) continue;
    addLocalPage(`/citta/${mainSlug}`, event.updatedAt);
    const hasUpcomingDate = event.dates.length
      ? event.dates.some((date) => (date.endsAt ?? date.startsAt) >= now)
      : (event.endsAt ?? event.startsAt) >= now;
    if (isSagra && hasUpcomingDate) addLocalPage(`/sagre-a/${mainSlug}`, event.updatedAt);
  }
  for (const [path, lastModified] of localPages) {
    pages.push({ url: `${base}${path}`, lastModified, changeFrequency: "weekly", priority: 0.65 });
  }
  return pages;
}
