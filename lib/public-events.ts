import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type FestivalEvent = {
  id: string;
  eventType: "SINGLE_DAY" | "MULTI_DAY" | "MULTI_LOCATION" | "ONLINE";
  cityFiltered: boolean;
  slug: string;
  title: string;
  category: string;
  city: string;
  province: string;
  venue: string;
  date: string;
  dateLabel: string;
  price: string;
  image: string;
  featured: boolean;
  description: string;
  subcategory: string | null;
  subcategoryEn: string | null;
  latitude: number | null;
  longitude: number | null;
  comuneSlug: string | null;
  dates: { startsAt: string; endsAt: string | null; label: string | null; city: string | null; province: string | null; venue: string | null; address: string | null; latitude: number | null; longitude: number | null; comuneSlug: string | null }[];
  pois: { id: string; name: string; address: string | null; latitude: number | null; longitude: number | null }[];
};

type PublicEventFilters = {
  comuneId?: string;
  cityName?: string;
  provinceCode?: string;
  locale?: string;
  sagreOnly?: boolean;
  upcomingOnly?: boolean;
};

function eventDateLabel(dates: FestivalEvent["dates"], locale = "it") {
  const first = dates[0];
  const start = new Date(first.startsAt);
  const end = first.endsAt ? new Date(first.endsAt) : null;
  const format = (value: Date) => value.toLocaleDateString(locale === "en" ? "en-GB" : "it-IT", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Rome" });
  if (dates.length > 1) return `${locale === "en" ? "Multiple dates · from" : "Più date · da"} ${format(start)}`;
  if (end && format(end) !== format(start)) return `${format(start)} – ${format(end)}`;
  return format(start);
}

export async function getPublicEvents(filters: PublicEventFilters = {}): Promise<FestivalEvent[]> {
  try {
    const conditions: Prisma.EventWhereInput[] = [];
    const now = new Date();
    const eventUpcoming: Prisma.EventWhereInput = {
      OR: [
        { startsAt: { gte: now } },
        { endsAt: { gte: now } },
        { dates: { some: { OR: [{ startsAt: { gte: now } }, { endsAt: { gte: now } }] } } },
      ],
    };
    if (filters.comuneId || filters.cityName) {
      const eventCity: Prisma.EventWhereInput = { OR: [
        ...(filters.comuneId ? [{ comuneId: filters.comuneId }] : []),
        ...(filters.cityName ? [{ ...(filters.comuneId ? { comuneId: null } : {}), location: { equals: filters.cityName, mode: "insensitive" as const } }] : []),
      ] };
      const occurrenceCity: Prisma.EventDateWhereInput = { OR: [
        ...(filters.comuneId ? [{ comuneId: filters.comuneId }] : []),
        ...(filters.cityName ? [{ ...(filters.comuneId ? { comuneId: null } : {}), city: { equals: filters.cityName, mode: "insensitive" as const } }] : []),
      ] };
      conditions.push({
        OR: [
          { eventType: { in: ["SINGLE_DAY", "MULTI_DAY"] }, AND: [eventCity, ...(filters.upcomingOnly ? [eventUpcoming] : [])] },
          { eventType: "MULTI_LOCATION", dates: { some: {
            AND: [occurrenceCity, ...(filters.upcomingOnly ? [{ OR: [{ startsAt: { gte: now } }, { endsAt: { gte: now } }] }] : [])],
          } } },
        ],
      });
    }
    if (filters.provinceCode) {
      const provinceCode = filters.provinceCode;
      const upcomingOccurrence: Prisma.EventDateWhereInput = filters.upcomingOnly ? { OR: [{ startsAt: { gte: now } }, { endsAt: { gte: now } }] } : {};
      conditions.push({ OR: [
        { eventType: { in: ["SINGLE_DAY", "MULTI_DAY"] }, OR: [{ comune: { is: { provinceCode: { equals: provinceCode, mode: "insensitive" } } } }, { comuneId: null, province: { equals: provinceCode, mode: "insensitive" } }], ...(filters.upcomingOnly ? { AND: [eventUpcoming] } : {}) },
        { eventType: "MULTI_LOCATION", dates: { some: { AND: [{ OR: [{ comune: { is: { provinceCode: { equals: provinceCode, mode: "insensitive" } } } }, { comuneId: null, province: { equals: provinceCode, mode: "insensitive" } }] }, upcomingOccurrence] } } },
      ] });
    }
    if (filters.sagreOnly) {
      conditions.push({
        OR: [
          { category: { equals: "Tradizione", mode: "insensitive" } },
          { subcategory: { contains: "sagr", mode: "insensitive" } },
        ],
      });
    }
    if (filters.upcomingOnly && !filters.comuneId && !filters.cityName && !filters.provinceCode) conditions.push(eventUpcoming);

    const saved = await prisma.event.findMany({
      where: { status: "PUBLISHED", AND: conditions },
      include: {
        comune: { select: { slug: true, provinceCode: true } },
        dates: { include: { comune: { select: { slug: true, provinceCode: true } } }, orderBy: [{ startsAt: "asc" }, { sortOrder: "asc" }] },
        pois: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      },
      orderBy: [{ featured: "desc" }, { startsAt: "asc" }],
    });
    return saved.map((event) => {
      const allDates = event.dates.length ? event.dates : [{ startsAt: event.startsAt, endsAt: event.endsAt, label: null, labelEn: null, city: event.location, province: event.province, venue: event.venue, address: event.address, latitude: event.latitude, longitude: event.longitude, comune: event.comune }];
      const cityDates = event.eventType === "MULTI_LOCATION" && (filters.comuneId || filters.cityName)
        ? allDates.filter((date) => {
          if (filters.comuneId && "comuneId" in date && date.comuneId === filters.comuneId) return true;
          if (filters.comuneId && "comuneId" in date && date.comuneId !== null) return false;
          return !!filters.cityName && date.city?.toLocaleLowerCase("it-IT") === filters.cityName.toLocaleLowerCase("it-IT");
        })
        : allDates;
      const relevantDates = event.eventType === "MULTI_LOCATION" && filters.provinceCode
        ? cityDates.filter((date) => (date.comune?.provinceCode ?? date.province)?.toLocaleLowerCase("it-IT") === filters.provinceCode?.toLocaleLowerCase("it-IT"))
        : cityDates;
      const dates = relevantDates.map((date) => ({
        startsAt: date.startsAt.toISOString(),
        endsAt: date.endsAt?.toISOString() ?? null,
        label: filters.locale === "en" ? date.labelEn || date.label : date.label,
        city: date.city,
        province: date.province,
        venue: date.venue,
        address: date.address,
        latitude: date.latitude,
        longitude: date.longitude,
        comuneSlug: date.comune?.slug ?? null,
      }));
      const currentDates = relevantDates.filter((date) => date.startsAt >= now || (date.endsAt !== null && date.endsAt >= now));
      const cardDates = (currentDates.length ? currentDates : relevantDates.length ? relevantDates : allDates).map((date) => ({
        startsAt: date.startsAt.toISOString(), endsAt: date.endsAt?.toISOString() ?? null, label: filters.locale === "en" ? date.labelEn || date.label : date.label,
        city: date.city, province: date.province, venue: date.venue, address: date.address,
        latitude: date.latitude, longitude: date.longitude, comuneSlug: date.comune?.slug ?? null,
      }));
      return {
        id: event.id,
        eventType: event.eventType,
        cityFiltered: Boolean(filters.comuneId || filters.cityName),
        slug: event.slug,
        title: filters.locale === "en" ? event.titleEn || event.title : event.title,
        category: event.category,
        city: event.location ?? "",
        province: event.province ?? "",
        venue: event.venue ?? "",
        date: cardDates[0].startsAt.slice(0, 10),
        dateLabel: eventDateLabel(cardDates, filters.locale),
        price: (filters.locale === "en" ? event.priceEn || event.price : event.price) || (filters.locale === "en" ? "See details" : "Dettagli sul sito"),
        image: event.image || "",
        featured: event.featured,
        description: filters.locale === "en" ? event.descriptionEn || event.description : event.description,
        subcategory: event.subcategory,
        subcategoryEn: event.subcategoryEn,
        latitude: event.latitude,
        longitude: event.longitude,
        comuneSlug: event.comune?.slug ?? null,
        dates,
        pois: event.pois.map((poi) => ({ id: poi.id, name: filters.locale === "en" ? poi.nameEn || poi.name : poi.name, address: poi.address, latitude: poi.latitude, longitude: poi.longitude })),
      };
    });
  } catch {
    // Public pages never invent events when the database is unavailable.
  }
  return [];
}
