/** Helpers for "wall clock" date-times (YYYY-MM-DDTHH:mm) expressed in Italian time. */
const romeDateTime = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function toLocalDateTime(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(romeDateTime.formatToParts(date).map(({ type, value: part }) => [type, part]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

// The wall clock is carried in a UTC Date so that arithmetic and formatting ignore DST and the browser timezone.
function parseWallClock(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addDaysToWallClock(value: string, days: number) {
  const date = parseWallClock(value);
  if (!date) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 16);
}

/** Formats an occurrence as e.g. "sab 12 lug 2026, 21:00 – 23:00". Returns "" without a valid start. */
export function formatWallClockRange(start: string, end: string | null | undefined, localeTag: string) {
  const from = parseWallClock(start);
  if (!from) return "";
  const dayFormat = new Intl.DateTimeFormat(localeTag, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const timeFormat = new Intl.DateTimeFormat(localeTag, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" });
  const label = `${dayFormat.format(from)}, ${timeFormat.format(from)}`;
  const to = end ? parseWallClock(end) : null;
  if (!to) return label;
  return start.slice(0, 10) === end!.slice(0, 10) ? `${label} – ${timeFormat.format(to)}` : `${label} → ${dayFormat.format(to)}, ${timeFormat.format(to)}`;
}
