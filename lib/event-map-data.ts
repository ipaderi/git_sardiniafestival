import type { EventMapMarker } from "@/components/site/event-map";
import { prisma } from "@/lib/prisma";
import { slugifyComune } from "@/lib/comuni";

type Coordinates = { latitude: number | null; longitude: number | null };

export function dateInRome(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value instanceof Date ? value : new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function validCoordinates(point: Coordinates | null | undefined): point is { latitude: number; longitude: number } {
  return point != null && point.latitude != null && point.longitude != null &&
    Number.isFinite(point.latitude) && Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;
}

/** Resolve map points only for the events already selected by the page filters. */
export async function getEventMapMarkers(eventIds: string[], filters: { city?: string; from?: string; locale?: string } = {}): Promise<EventMapMarker[]> {
  if (!eventIds.length) return [];
  try {
    const events = await prisma.event.findMany({
      where: { id: { in: eventIds }, status: "PUBLISHED", eventType: { not: "ONLINE" } },
      select: {
        id: true, slug: true, title: true, eventType: true, location: true,
        venue: true, address: true, latitude: true, longitude: true,
        comune: { select: { latitude: true, longitude: true } },
        dates: { select: { id: true, startsAt: true, endsAt: true, city: true, venue: true, address: true, latitude: true, longitude: true, comune: { select: { latitude: true, longitude: true } } } },
      },
    });
    const missingNames = new Set<string>();
    for (const event of events) {
      if (!event.comune && event.location) missingNames.add(slugifyComune(event.location));
      for (const date of event.dates) if (!date.comune && date.city) missingNames.add(slugifyComune(date.city));
    }
    const legacyComuni = missingNames.size ? await prisma.comune.findMany({
      where: { slug: { in: [...missingNames] } }, select: { slug: true, latitude: true, longitude: true },
    }) : [];
    const comuniBySlug = new Map(legacyComuni.map((comune) => [comune.slug, comune]));
    const markers: EventMapMarker[] = [];
    for (const event of events) {
      const places = event.eventType === "MULTI_LOCATION" && event.dates.length ? event.dates.filter((date) =>
        (!filters.city || date.city?.toLocaleLowerCase("it-IT") === filters.city.toLocaleLowerCase("it-IT")) &&
        (!filters.from || dateInRome(date.endsAt ?? date.startsAt) >= filters.from)
      ).map((date) => ({
        id: date.id, city: date.city, venue: date.venue, address: date.address,
        point: date, comune: date.comune,
      })) : [{ id: event.id, city: event.location, venue: event.venue, address: event.address, point: event, comune: event.comune }];
      const seen = new Set<string>();
      for (const place of places) {
        const fallback = place.comune ?? (place.city ? comuniBySlug.get(slugifyComune(place.city)) : null);
        const exact = validCoordinates(place.point);
        const point = exact ? place.point : fallback;
        if (!validCoordinates(point)) continue;
        const key = `${point.latitude}:${point.longitude}:${place.city}:${place.venue}:${place.address}`;
        if (seen.has(key)) continue;
        seen.add(key);
        markers.push({
          id: `${event.id}-${place.id}`, title: event.title,
          place: [place.venue, place.address, place.city].filter(Boolean).join(", "),
          href: `/${filters.locale || "it"}/event/${event.slug}`, latitude: point.latitude, longitude: point.longitude,
          approximate: !exact,
        });
      }
    }
    return markers;
  } catch {
    return [];
  }
}
