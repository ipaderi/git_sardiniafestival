import { prisma } from "@/lib/prisma";
import type { ScheduleInput } from "@/lib/event-input";

const textOrNull = (value?: string | null) => value?.trim() || null;

/** Normalize dates and resolve every physical venue against the seeded municipalities. */
export async function prepareSchedule(schedule: ScheduleInput) {
  const dates = [...schedule.dates].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const isMultiLocation = schedule.eventType === "MULTI_LOCATION";
  const isOnline = schedule.eventType === "ONLINE";
  const first = dates[0];
  const firstComuneId = isOnline ? null : textOrNull(isMultiLocation ? first.comuneId : schedule.comuneId);
  const ids = [...new Set([firstComuneId, ...dates.map((date) => isMultiLocation ? textOrNull(date.comuneId) : null)].filter((id): id is string => !!id))];
  const comuni = ids.length ? await prisma.comune.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, provinceCode: true } }) : [];
  const comuniById = new Map(comuni.map((comune) => [comune.id, comune]));
  if (ids.some((id) => !comuniById.has(id))) return null;
  const firstComune = firstComuneId ? comuniById.get(firstComuneId) : null;
  const location = firstComune?.name ?? null;
  const province = firstComune?.provinceCode ?? null;
  const venue = isOnline ? null : textOrNull(isMultiLocation ? first.venue : schedule.venue);
  return {
    eventType: schedule.eventType,
    onlineUrl: isOnline ? textOrNull(schedule.onlineUrl) : null,
    location,
    province,
    venue,
    comuneId: firstComuneId,
    startsAt: new Date(first.startsAt),
    endsAt: first.endsAt ? new Date(first.endsAt) : null,
    // Location belongs to each occurrence only for a multi-location event.
    dates: dates.map((date, sortOrder) => ({
      startsAt: new Date(date.startsAt),
      endsAt: date.endsAt ? new Date(date.endsAt) : null,
      label: textOrNull(date.label),
      city: isMultiLocation && date.comuneId ? comuniById.get(date.comuneId)?.name ?? null : null,
      province: isMultiLocation && date.comuneId ? comuniById.get(date.comuneId)?.provinceCode ?? null : null,
      venue: isMultiLocation ? textOrNull(date.venue) : null,
      address: isMultiLocation ? textOrNull(date.address) : null,
      latitude: isMultiLocation ? date.latitude ?? null : null,
      longitude: isMultiLocation ? date.longitude ?? null : null,
      comuneId: isMultiLocation ? textOrNull(date.comuneId) : null,
      sortOrder,
    })),
  };
}
