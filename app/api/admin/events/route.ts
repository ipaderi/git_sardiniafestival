import { apiEventMessages, requestLocale } from "@/lib/api-locale";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getLocalizedText } from "@/lib/localized-text";
import { eventCategories } from "@/lib/event-categories";
import { eventTypes, occurrenceSchema, onlineUrlSchema, validateSchedule } from "@/lib/event-input";
import { prepareSchedule } from "@/lib/event-schedule";
import { slugify } from "@/lib/utils";

const createSchema = z.object({
  title: z.string().trim().min(4).max(120),
  titleEn: z.string().trim().max(120).nullable().optional(),
  category: z.string().trim().refine((value) => eventCategories.some((category) => category.name === value)),
  description: z.string().trim().min(30).max(5000),
  descriptionEn: z.string().trim().max(5000).nullable().optional(),
  subcategory: z.string().trim().max(80).nullable().optional(),
  subcategoryEn: z.string().trim().max(80).nullable().optional(),
  venue: z.string().trim().max(120).nullable().optional(),
  comuneId: z.string().trim().max(80).nullable().optional(),
  eventType: z.enum(eventTypes),
  onlineUrl: onlineUrlSchema,
  dates: z.array(occurrenceSchema).min(1).max(100),
  price: z.string().trim().max(80).optional(),
  priceEn: z.string().trim().max(80).nullable().optional(),
  website: z.string().url().optional().or(z.literal("")),
  contactEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
  status: z.enum(["PENDING", "PUBLISHED"]).default("PENDING"),
  featured: z.boolean().default(false),
}).strict();

export async function GET(request: Request) {
  const messages = apiEventMessages(request);
  if (!(await requireAdmin())) return NextResponse.json({ error: messages.unauthorized }, { status: 403 });
  const events = await prisma.event.findMany({ include: { dates: { orderBy: { startsAt: "asc" } }, organizer: { select: { name: true, email: true } } }, orderBy: [{ status: "asc" }, { startsAt: "asc" }] });
  return NextResponse.json({ events: events.map(({ descriptionTranslations, ...event }) => ({
    ...event,
    descriptionEn: getLocalizedText(descriptionTranslations, "en", "") || null,
  })) });
}

export async function POST(request: Request) {
  const messages = apiEventMessages(request);
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: messages.unauthorized }, { status: 403 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: messages.checkRequiredFields }, { status: 400 });
  const data = parsed.data;
  const input = { eventType: data.eventType, dates: data.dates, comuneId: data.comuneId, venue: data.venue, onlineUrl: data.onlineUrl };
  const scheduleError = validateSchedule(input, requestLocale(request));
  if (scheduleError) return NextResponse.json({ error: scheduleError }, { status: 400 });
  const schedule = await prepareSchedule(input);
  if (!schedule) return NextResponse.json({ error: messages.invalidMunicipalities }, { status: 400 });
  const { dates: eventDates, ...eventSchedule } = schedule;
  const event = await prisma.event.create({
    data: {
      title: data.title,
      titleEn: data.titleEn || null,
      slug: `${slugify(data.title) || "evento"}-${Math.random().toString(36).slice(2, 7)}`,
      description: data.description,
      descriptionTranslations: data.descriptionEn ? { en: data.descriptionEn } : {},
      category: data.category,
      subcategory: data.subcategory || null,
      subcategoryEn: data.subcategoryEn || null,
      ...eventSchedule,
      ...(data.eventType === "MULTI_LOCATION" ? { address: eventDates[0].address, latitude: eventDates[0].latitude, longitude: eventDates[0].longitude } : {}),
      dates: { create: eventDates },
      price: data.price || null,
      priceEn: data.priceEn || null,
      website: data.website || null,
      contactEmail: data.contactEmail || null,
      status: data.status,
      featured: data.featured,
      organizerId: admin.id,
    },
    select: { id: true, slug: true, status: true },
  });
  return NextResponse.json({ event }, { status: 201 });
}
