import type { MetadataRoute } from "next";
import { eventCategories, slugifyCategory } from "@/lib/event-categories";
import { locales } from "@/lib/i18n";

export type SitemapEvent = {
  slug: string;
  titleEn?: string | null;
  descriptionEn?: string | null;
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

type EntryOptions = Omit<MetadataRoute.Sitemap[number], "url" | "alternates">;

/** Every language entry points to the complete set of equivalent localized URLs. */
export function localizedSitemapEntries(base: string, path: string, options: EntryOptions = {}): MetadataRoute.Sitemap {
  const languages = { it: `${base}/it${path}`, en: `${base}/en${path}` };
  return locales.map((locale) => ({ url: languages[locale], alternates: { languages }, ...options }));
}

/** The caller supplies published events and all their occurrences, including past ones. */
export function contentSitemapEntries(
  base: string,
  _now: Date,
  events: SitemapEvent[],
  comuni: { name: string; slug: string }[],
): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = events.flatMap((event) => {
    const path = `/event/${event.slug}`;
    const options = { lastModified: event.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 };
    if (event.titleEn?.trim() && event.descriptionEn?.trim()) return localizedSitemapEntries(base, path, options);
    return [{ url: `${base}/it${path}`, ...options }];
  });

  for (const category of eventCategories) {
    const matchingEvents = events.filter((event) => event.category.toLocaleLowerCase("it-IT") === category.name.toLocaleLowerCase("it-IT"));
    if (!matchingEvents.length) continue;
    const lastModified = matchingEvents.reduce((latest, event) => event.updatedAt > latest ? event.updatedAt : latest, new Date(0));
    const categorySlug = slugifyCategory(category.name);
    pages.push(...localizedSitemapEntries(base, `/events/category/${categorySlug}`, { lastModified, changeFrequency: "weekly", priority: 0.7 }));
    const subcategories = new Map<string, Date>();
    for (const event of matchingEvents) {
      const slug = event.subcategory ? slugifyCategory(event.subcategory) : "";
      if (!slug) continue;
      const previous = subcategories.get(slug);
      if (!previous || event.updatedAt > previous) subcategories.set(slug, event.updatedAt);
    }
    for (const [slug, lastModified] of subcategories) {
      pages.push(...localizedSitemapEntries(base, `/events/category/${categorySlug}/${slug}`, { lastModified, changeFrequency: "weekly", priority: 0.65 }));
    }
  }

  // Legacy events can have only the municipality name; resolve it without inventing cities.
  const comuneByName = new Map(comuni.map((comune) => [comune.name.toLocaleLowerCase("it-IT"), comune.slug]));
  const localPages = new Map<string, Date>();
  const addLocalPage = (path: string, updatedAt: Date) => {
    const previous = localPages.get(path);
    if (!previous || updatedAt > previous) localPages.set(path, updatedAt);
  };
  const resolveSlug = (comune: { slug: string } | null, comuneId: string | null, name: string | null) =>
    comune?.slug ?? (comuneId === null && name ? comuneByName.get(name.toLocaleLowerCase("it-IT")) : undefined);
  for (const event of events) {
    if (event.eventType === "ONLINE") continue;
    const category = eventCategories.find((item) => item.name.toLocaleLowerCase("it-IT") === event.category.toLocaleLowerCase("it-IT"));
    const addCity = (slug: string) => {
      addLocalPage(`/events/city/${slug}`, event.updatedAt);
      if (category) addLocalPage(`/events/city/${slug}/${slugifyCategory(category.name)}`, event.updatedAt);
    };
    if (event.eventType === "MULTI_LOCATION" && event.dates.length) {
      for (const date of event.dates) {
        const slug = resolveSlug(date.comune, date.comuneId, date.city);
        if (slug) addCity(slug);
      }
      continue;
    }
    const mainSlug = resolveSlug(event.comune, event.comuneId, event.location);
    if (mainSlug) addCity(mainSlug);
  }
  for (const [path, lastModified] of localPages) {
    pages.push(...localizedSitemapEntries(base, path, { lastModified, changeFrequency: "weekly", priority: 0.65 }));
  }
  return pages;
}
