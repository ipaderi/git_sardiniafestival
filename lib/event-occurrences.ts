import { addDaysToWallClock, toLocalDateTime } from "@/lib/event-wall-clock";

export type OccurrenceStatus = "past" | "ongoing" | "upcoming";
export type OccurrenceWhen = {
  /** No real time is known: editors store these occurrences at 00:00. */
  allDay: boolean;
  startDay: string;
  endDay: string;
  startTime: string | null;
  endTime: string | null;
  start: string;
  activeUntil: string;
};

/** Before this hour, an end on the following day still belongs to the same night out. */
const LATE_NIGHT_END = "06:00";

const day = (value: string) => value.slice(0, 10);
const time = (value: string) => value.slice(11, 16);

/**
 * Reads an occurrence in Italian time. An end at 00:00 closes the previous day, so
 * 18 Sep 00:00 → 22 Sep 00:00 means "18–21 September", without any time.
 */
export function occurrenceWhen(startsAt: Date, endsAt: Date | null): OccurrenceWhen {
  const start = toLocalDateTime(startsAt);
  const rawEnd = endsAt && endsAt.getTime() > startsAt.getTime() ? toLocalDateTime(endsAt) : "";
  const startsAtMidnight = time(start) === "00:00";
  const endsAtMidnight = !!rawEnd && time(rawEnd) === "00:00";
  const allDay = startsAtMidnight && (!rawEnd || endsAtMidnight);
  const startDay = day(start);
  let endDay = rawEnd ? day(rawEnd) : startDay;
  if (endsAtMidnight) endDay = day(addDaysToWallClock(rawEnd, -1));
  else if (rawEnd && !startsAtMidnight && time(rawEnd) < LATE_NIGHT_END && day(addDaysToWallClock(start, 1)) === endDay) endDay = startDay;
  return {
    allDay, startDay, endDay, start,
    startTime: allDay ? null : time(start),
    endTime: allDay || !rawEnd ? null : time(rawEnd),
    activeUntil: rawEnd && !allDay ? rawEnd : `${endDay}T23:59`,
  };
}

export function occurrenceStatus(when: OccurrenceWhen, now: Date): OccurrenceStatus {
  const current = toLocalDateTime(now);
  if (when.activeUntil < current) return "past";
  return when.start <= current ? "ongoing" : "upcoming";
}

const utc = (value: string) => new Date(`${value}T12:00:00Z`);
const format = (value: string, localeTag: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(localeTag, { ...options, timeZone: "UTC" }).format(utc(value));
const capitalize = (value: string) => value.charAt(0).toLocaleUpperCase() + value.slice(1);

/** e.g. "18–21 set 2026", "28 set – 2 ott 2026" or "sabato 31 ottobre 2026". */
export function formatDaySpan(startDay: string, endDay: string, localeTag: string) {
  if (startDay === endDay) return format(startDay, localeTag, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const year = format(endDay, localeTag, { year: "numeric" });
  const endLabel = format(endDay, localeTag, { day: "numeric", month: "short" });
  if (startDay.slice(0, 7) === endDay.slice(0, 7)) return `${format(startDay, localeTag, { day: "numeric" })}–${endLabel} ${year}`;
  if (startDay.slice(0, 4) === endDay.slice(0, 4)) return `${format(startDay, localeTag, { day: "numeric", month: "short" })} – ${endLabel} ${year}`;
  return `${format(startDay, localeTag, { day: "numeric", month: "short", year: "numeric" })} – ${endLabel} ${year}`;
}

/** The two lines of the date block: "18–21" over "set", or "28 set" over "2 ott". */
export function dateBadge(when: OccurrenceWhen, localeTag: string) {
  const { startDay, endDay } = when;
  const month = (value: string) => format(value, localeTag, { month: "short" }).replace(".", "");
  const number = (value: string) => format(value, localeTag, { day: "numeric" });
  if (startDay === endDay) return { top: number(startDay), bottom: month(startDay) };
  if (startDay.slice(0, 7) === endDay.slice(0, 7)) return { top: `${number(startDay)}–${number(endDay)}`, bottom: month(startDay) };
  return { top: `${number(startDay)} ${month(startDay)}`, bottom: `${number(endDay)} ${month(endDay)}` };
}

/** The weekdays and times that the date block leaves out, e.g. "sabato · 21:00 – 23:00" or "ven – lun". */
export function occurrenceDetail(when: OccurrenceWhen, localeTag: string) {
  const { startDay, endDay } = when;
  const days = Math.round((utc(endDay).getTime() - utc(startDay).getTime()) / 86_400_000);
  const weekdays = days === 0 ? format(startDay, localeTag, { weekday: "long" })
    : days < 7 ? `${format(startDay, localeTag, { weekday: "short" })} – ${format(endDay, localeTag, { weekday: "short" })}` : "";
  return [weekdays, occurrenceTimes(when)].filter(Boolean).join(" · ");
}

export function occurrenceTimes({ startTime, endTime }: OccurrenceWhen) {
  return startTime ? (endTime ? `${startTime} – ${endTime}` : startTime) : "";
}

export function monthHeading(value: string, localeTag: string) {
  return capitalize(format(value, localeTag, { month: "long", year: "numeric" }));
}

/** Keeps a long text readable: everything up to a paragraph break after `target` characters, then the rest. */
export function splitLongText(text: string, target = 500) {
  const trimmed = text.trim();
  if (trimmed.length < target * 1.5) return { intro: trimmed, rest: "" };
  const breakAt = trimmed.indexOf("\n", target);
  const cut = breakAt > 0 && breakAt < target * 1.5 ? breakAt : trimmed.indexOf(" ", target);
  if (cut < 0) return { intro: trimmed, rest: "" };
  return { intro: trimmed.slice(0, cut).trimEnd(), rest: trimmed.slice(cut).trimStart() };
}
