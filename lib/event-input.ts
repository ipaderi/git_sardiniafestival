import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const optionalDate = z.string().datetime().nullable().optional().or(z.literal(""));
const optionalCoordinate = z.number().finite().nullable().optional();

export const eventTypes = ["SINGLE_DAY", "MULTI_DAY", "MULTI_LOCATION", "ONLINE"] as const;

export const occurrenceSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: optionalDate,
  label: optionalText(120),
  city: optionalText(80),
  province: optionalText(3),
  venue: optionalText(120),
  comuneId: optionalText(80),
  address: optionalText(200),
  latitude: optionalCoordinate.refine((v) => v == null || (v >= -90 && v <= 90)),
  longitude: optionalCoordinate.refine((v) => v == null || (v >= -180 && v <= 180)),
}).strict();

export const onlineUrlSchema = z.string().trim().max(2048).nullable().optional().refine((value) => {
  if (!value) return true;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}, "Inserisci un link online HTTP o HTTPS valido.");

export type OccurrenceInput = z.infer<typeof occurrenceSchema>;
export type EventTypeInput = (typeof eventTypes)[number];

export type ScheduleInput = {
  eventType: EventTypeInput;
  dates: OccurrenceInput[];
  location?: string | null;
  province?: string | null;
  venue?: string | null;
  comuneId?: string | null;
  onlineUrl?: string | null;
};

const romeDay = (value: string) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date(value));

/** Returns a user-facing error, including for a PATCH merged with saved data. */
export function validateSchedule(schedule: ScheduleInput): string | null {
  const { eventType, dates } = schedule;
  if (!dates.length || dates.length > 100) return "Inserisci da 1 a 100 date.";
  if (eventType === "SINGLE_DAY" && dates.length !== 1) return "Un evento di un giorno deve avere una sola data.";
  if (eventType === "MULTI_DAY" && dates.length === 1 && (!dates[0].endsAt || romeDay(dates[0].startsAt) === romeDay(dates[0].endsAt))) return "Per un evento su più giorni aggiungi un appuntamento oppure indica una fine in un giorno successivo.";
  if (eventType === "MULTI_LOCATION" && dates.length < 2) return "Aggiungi almeno due date con le rispettive sedi.";
  if (eventType === "ONLINE" && !schedule.onlineUrl?.trim()) return "Inserisci il link dell'evento online.";
  if ((eventType === "SINGLE_DAY" || eventType === "MULTI_DAY") &&
      (!schedule.comuneId?.trim() || !schedule.venue?.trim())) {
    return "Seleziona un comune e indica la sede dell'evento.";
  }
  for (const date of dates) {
    if (date.endsAt && new Date(date.endsAt).getTime() < new Date(date.startsAt).getTime()) return "La fine di una data precede l'inizio.";
    if ((date.latitude == null) !== (date.longitude == null)) return "Inserisci entrambe le coordinate della sede.";
    if (eventType === "MULTI_LOCATION" && (!date.comuneId?.trim() || !date.venue?.trim())) {
      return "Seleziona il comune e indica la sede per ogni data.";
    }
  }
  return null;
}
