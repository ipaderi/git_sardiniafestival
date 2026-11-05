import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { eventTypes, occurrenceSchema, onlineUrlSchema, validateSchedule } from "@/lib/event-input";
import { prepareSchedule } from "@/lib/event-schedule";
import { deleteImage } from "@/lib/s3";
import { eventCategories } from "@/lib/event-categories";

const updateSchema = z.object({
  status: z.enum(["PENDING", "PUBLISHED", "REJECTED", "CANCELLED"]).optional(),
  featured: z.boolean().optional(),
  title: z.string().trim().min(4).max(120).optional(),
  titleEn: z.string().trim().max(120).nullable().optional(),
  category: z.string().trim().refine((value) => eventCategories.some((category) => category.name === value)).optional(),
  description: z.string().trim().min(30).max(5000).optional(),
  descriptionEn: z.string().trim().max(5000).nullable().optional(),
  subcategory: z.string().trim().max(80).nullable().optional(),
  subcategoryEn: z.string().trim().max(80).nullable().optional(),
  location: z.string().trim().max(80).nullable().optional(),
  province: z.string().trim().max(3).nullable().optional(),
  venue: z.string().trim().max(120).nullable().optional(),
  comuneId: z.string().trim().max(80).nullable().optional(),
  eventType: z.enum(eventTypes).optional(),
  onlineUrl: onlineUrlSchema,
  dates: z.array(occurrenceSchema).max(100).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional().or(z.literal("")),
  price: z.string().trim().max(80).optional(),
  priceEn: z.string().trim().max(80).nullable().optional(),
  website: z.string().url().optional().or(z.literal("")),
}).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !Object.keys(parsed.data).length) return NextResponse.json({ error: "Aggiornamento non valido." }, { status: 400 });
  const { id } = await params;
  const saved = await prisma.event.findUnique({ where: { id }, include: { dates: { orderBy: { startsAt: "asc" } } } });
  if (!saved) return NextResponse.json({ error: "Evento non trovato." }, { status: 404 });
  const { eventType, onlineUrl, dates, startsAt, endsAt, comuneId, location, province, venue, ...other } = parsed.data;
  const scheduleChanged = [eventType, onlineUrl, dates, startsAt, endsAt, comuneId, location, province, venue].some((value) => value !== undefined);
  let scheduleData = {};
  if (scheduleChanged) {
    const currentDates = saved.dates.length ? saved.dates.map((date) => ({
      startsAt: date.startsAt.toISOString(), endsAt: date.endsAt?.toISOString() ?? null,
      label: date.label, labelEn: date.labelEn, city: date.city, province: date.province, venue: date.venue,
      address: date.address, latitude: date.latitude, longitude: date.longitude, comuneId: date.comuneId,
    })) : [{ startsAt: saved.startsAt.toISOString(), endsAt: saved.endsAt?.toISOString() ?? null }];
    // Legacy clients can still update the first occurrence through startsAt/endsAt.
    const nextDates = dates ?? currentDates.map((date, index) => index === 0 ? {
      ...date, ...(startsAt !== undefined ? { startsAt } : {}), ...(endsAt !== undefined ? { endsAt } : {}),
    } : date);
    const scheduleInput = {
      eventType: eventType ?? saved.eventType,
      onlineUrl: onlineUrl === undefined ? saved.onlineUrl : onlineUrl,
      comuneId: comuneId === undefined ? saved.comuneId : comuneId,
      location: location === undefined ? saved.location : location,
      province: province === undefined ? saved.province : province,
      venue: venue === undefined ? saved.venue : venue,
      dates: nextDates,
    };
    const error = validateSchedule(scheduleInput);
    if (error) return NextResponse.json({ error }, { status: 400 });
    const schedule = await prepareSchedule(scheduleInput);
    if (!schedule) return NextResponse.json({ error: "Seleziona comuni validi dall'elenco." }, { status: 400 });
    const { dates: eventDates, ...fields } = schedule;
    scheduleData = {
      ...fields,
      ...(schedule.eventType === "ONLINE" ? { address: null, latitude: null, longitude: null } : {}),
      ...(schedule.eventType === "MULTI_LOCATION" ? { address: eventDates[0].address, latitude: eventDates[0].latitude, longitude: eventDates[0].longitude } : {}),
      ...((schedule.eventType === "SINGLE_DAY" || schedule.eventType === "MULTI_DAY") && schedule.comuneId !== saved.comuneId ? { address: null, latitude: null, longitude: null } : {}),
      dates: { deleteMany: {}, create: eventDates },
    };
  }
  const event = await prisma.event.update({ where: { id }, data: {
    ...other,
    ...(other.titleEn !== undefined ? { titleEn: other.titleEn || null } : {}),
    ...(other.descriptionEn !== undefined ? { descriptionEn: other.descriptionEn || null } : {}),
    ...(other.subcategory !== undefined ? { subcategory: other.subcategory || null } : {}),
    ...(other.subcategoryEn !== undefined ? { subcategoryEn: other.subcategoryEn || null } : {}),
    ...(other.price !== undefined ? { price: other.price || null } : {}),
    ...(other.priceEn !== undefined ? { priceEn: other.priceEn || null } : {}),
    ...(other.website !== undefined ? { website: other.website || null } : {}),
    ...scheduleData,
  }, include: { dates: { orderBy: { startsAt: "asc" } } } });
  return NextResponse.json({ event });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true, images: { select: { objectKey: true } } } });
  if (!event) return NextResponse.json({ error: "Evento non trovato." }, { status: 404 });
  await prisma.event.delete({ where: { id } });
  const deletions = await Promise.allSettled(event.images.map((image) => deleteImage(image.objectKey)));
  const remaining = event.images.filter((_, index) => deletions[index].status === "rejected");
  if (remaining.length) {
    console.error("Oggetti S3 da rimuovere dopo eliminazione evento", { eventId: id, keys: remaining.map((image) => image.objectKey) });
    return NextResponse.json({ ok: true, warning: "Evento eliminato, ma alcune immagini non sono state rimosse dallo storage. Controlla i log del server." });
  }
  return NextResponse.json({ ok: true });
}
