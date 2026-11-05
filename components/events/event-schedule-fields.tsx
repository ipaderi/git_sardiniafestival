"use client";

import { dictionary } from "@/lib/dictionary";
import it from "@/messages/it/account.json";
import enMessages from "@/messages/en/account.json";

import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ComuneSelect } from "@/components/site/comune-select";

export type EventType = "SINGLE_DAY" | "MULTI_DAY" | "MULTI_LOCATION" | "ONLINE";
export type ScheduleDate = {
  startsAt: string;
  endsAt: string;
  label: string;
  labelEn?: string;
  venue: string;
  address: string;
  city: string;
  province: string;
  comuneId: string;
  latitude?: number | null;
  longitude?: number | null;
  originalStartsAt?: string;
  originalEndsAt?: string;
};

export const eventTypeLabels: Record<EventType, string> = it.schedule.eventTypes;

export function emptyScheduleDate(): ScheduleDate {
  return { startsAt: "", endsAt: "", label: "", labelEn: "", venue: "", address: "", city: "", province: "", comuneId: "" };
}

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

// Map a wall-clock time in Rome to its UTC instant, independently of the browser timezone.
// During the autumn overlap two instants exist: a new time uses the first one.
// During the spring gap no instant exists and null triggers a validation message.
function romeTimeToInstant(value: string, original?: string): Date | null {
  if (original && toLocalDateTime(original) === value) return new Date(original);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const wall = new Date(0);
  wall.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  wall.setUTCHours(Number(hour), Number(minute), 0, 0);
  const wallTime = wall.getTime();
  if (wall.toISOString().slice(0, 16) !== value) return null;
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 6) {
    const probe = wallTime + hours * 3_600_000;
    const local = toLocalDateTime(new Date(probe));
    const [localDate, localTime] = local.split("T");
    const [localYear, localMonth, localDay] = localDate.split("-").map(Number);
    const [localHour, localMinute] = localTime.split(":").map(Number);
    const represented = new Date(0);
    represented.setUTCFullYear(localYear, localMonth - 1, localDay);
    represented.setUTCHours(localHour, localMinute, 0, 0);
    offsets.add(represented.getTime() - probe);
  }
  const candidates = [...offsets].map((offset) => wallTime - offset)
    .filter((instant) => toLocalDateTime(new Date(instant)) === value)
    .sort((a, b) => a - b);
  return candidates.length ? new Date(candidates[0]) : null;
}

export function serializeSchedule(type: EventType, dates: ScheduleDate[]) {
  return (type === "SINGLE_DAY" ? dates.slice(0, 1) : dates).map((date) => ({
    startsAt: romeTimeToInstant(date.startsAt, date.originalStartsAt)!.toISOString(),
    endsAt: date.endsAt ? romeTimeToInstant(date.endsAt, date.originalEndsAt)!.toISOString() : null,
    label: date.label.trim() || null,
    labelEn: date.labelEn?.trim() || null,
    ...(type === "MULTI_LOCATION" ? {
      venue: date.venue.trim(), address: date.address.trim() || null,
      comuneId: date.comuneId,
      latitude: date.latitude ?? null, longitude: date.longitude ?? null,
    } : {}),
  }));
}

export function validateSchedule(type: EventType, dates: ScheduleDate[], locale = "it") {
  const t = dictionary(locale, it, enMessages).schedule;
  const visibleDates = type === "SINGLE_DAY" ? dates.slice(0, 1) : dates;
  if (!visibleDates.length || visibleDates.length > 100) return t.enterBetween1And100Occurrences;
  for (const date of visibleDates) {
    const start = romeTimeToInstant(date.startsAt, date.originalStartsAt);
    const end = date.endsAt ? romeTimeToInstant(date.endsAt, date.originalEndsAt) : null;
    if (!start || (date.endsAt && !end)) return t.checkTheTimesThisTimeDoesNot;
    if (end && end < start) return t.anOccurrenceMustEndOnOrAfter;
  }
  if (type === "MULTI_DAY" && visibleDates.length === 1 && (!visibleDates[0].endsAt || visibleDates[0].startsAt.slice(0, 10) === visibleDates[0].endsAt.slice(0, 10))) return t.forAMultiDayEventAddAn;
  if (type === "MULTI_LOCATION" && (visibleDates.length < 2 || visibleDates.some((date) => !date.comuneId || !date.venue.trim()))) return t.chooseAMunicipalityAndVenueForEach;
  return "";
}

export function EventScheduleFields({ type, onTypeChange, dates, onDatesChange, compact = false, locale }: {
  type: EventType;
  onTypeChange: (type: EventType) => void;
  dates: ScheduleDate[];
  onDatesChange: (dates: ScheduleDate[]) => void;
  compact?: boolean;
  locale?: string;
}) {
  const t = dictionary(locale, it, enMessages).schedule;
  const id = useId();
  const label = compact ? "grid gap-1.5 text-[11px] font-bold text-ink" : "grid gap-2 text-xs font-bold text-ink";
  const input = compact ? "focus-ring h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-normal text-ink" : undefined;
  const select = compact ? input : "focus-ring h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-normal text-ink";
  const visibleDates = type === "SINGLE_DAY" ? dates.slice(0, 1) : dates;
  function update(index: number, changes: Partial<ScheduleDate>) {
    onDatesChange(dates.map((date, i) => i === index ? { ...date, ...changes } : date));
  }
  function changeType(value: EventType) {
    onTypeChange(value);
    if (value === "MULTI_LOCATION" && dates.length < 2) onDatesChange([...dates, emptyScheduleDate()]);
  }
  return <div className="space-y-4 sm:col-span-2">
    <label className={label} htmlFor={`${id}-type`}>{t.eventType} *
      <select id={`${id}-type`} className={select} value={type} onChange={(event) => changeType(event.target.value as EventType)}>
        {(Object.keys(eventTypeLabels) as EventType[]).map((value) => <option key={value} value={value}>{t.eventTypes[value]}</option>)}
      </select>
    </label>
    <p className="text-xs leading-5 text-muted">{t.timesUseTheItalianTimeZoneRome}</p>
    <div className="space-y-3">
      {visibleDates.map((date, index) => <fieldset key={index} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <legend className="px-1 text-xs font-bold text-ink">{type === "SINGLE_DAY" ? (t.dateAndTime) : `${t.occurrence} ${index + 1}`}</legend>
        <label className={label}>{t.start} *<Input className={input} required type="datetime-local" value={date.startsAt} onChange={(event) => update(index, { startsAt: event.target.value })} /></label>
        <label className={label}>{t.endOptional}<Input className={input} type="datetime-local" value={date.endsAt} onChange={(event) => update(index, { endsAt: event.target.value })} /></label>
        {type !== "SINGLE_DAY" && <>
          <label className={label}>{t.occurrenceNameItalianOptional}<Input className={input} maxLength={120} value={date.label} onChange={(event) => update(index, { label: event.target.value })} placeholder={t.italianExample} /></label>
          <label className={label}>{t.occurrenceNameEnglishOptional}<Input className={input} maxLength={120} value={date.labelEn || ""} onChange={(event) => update(index, { labelEn: event.target.value })} placeholder={t.englishExample} /></label>
        </>}
        {type === "MULTI_LOCATION" && <>
          <label className={label}>{t.municipalityAndProvince} *<ComuneSelect locale={locale} required className={select} value={date.comuneId} onChange={(comune) => update(index, { comuneId: comune?.id || "", city: comune?.name || "", province: comune?.provinceCode || "", latitude: null, longitude: null })} /></label>
          <label className={label}>{t.venue} *<Input className={input} required minLength={2} maxLength={120} value={date.venue} onChange={(event) => update(index, { venue: event.target.value, latitude: null, longitude: null })} placeholder={t.squareTheatreVenue} /></label>
          <label className={label}>{t.addressOptional}<Input className={input} maxLength={200} value={date.address} onChange={(event) => update(index, { address: event.target.value, latitude: null, longitude: null })} /></label>
        </>}
        {type !== "SINGLE_DAY" && dates.length > (type === "MULTI_LOCATION" ? 2 : 1) && <div className="sm:col-span-2"><button type="button" className="focus-ring inline-flex items-center gap-1 rounded px-1 py-1 text-xs font-bold text-rose-700" onClick={() => onDatesChange(dates.filter((_, i) => i !== index))}><Trash2 size={14} /> {t.removeOccurrence}</button></div>}
      </fieldset>)}
    </div>
    {type !== "SINGLE_DAY" && dates.length < 100 && <button type="button" className="focus-ring inline-flex items-center gap-1 rounded px-1 py-1 text-xs font-bold text-sea" onClick={() => onDatesChange([...dates, emptyScheduleDate()])}><Plus size={15} /> {t.addOccurrence}</button>}
    {type === "MULTI_DAY" && <p className="text-xs leading-5 text-muted">{t.forAContinuousEventEnterAStart}</p>}
    {type === "MULTI_LOCATION" && <p className="text-xs leading-5 text-muted">{t.addAtLeastTwoOccurrencesEachWith}</p>}
  </div>;
}
