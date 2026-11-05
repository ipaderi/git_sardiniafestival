import { apiEventMessages, requestLocale } from "@/lib/api-locale";
import { EventStatus } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { eventTypes, occurrenceSchema, onlineUrlSchema, validateSchedule } from "@/lib/event-input";
import { prepareSchedule } from "@/lib/event-schedule";
import { eventCategories } from "@/lib/event-categories";
import { getCurrentUser } from "@/lib/authz";
import { getLocalizedText } from "@/lib/localized-text";

const eventSchema = z.object({
  title: z.string().trim().min(4).max(120),
  titleEn: z.string().trim().max(120).optional().or(z.literal("")),
  category: z.string().trim().refine((value) => eventCategories.some((category) => category.name === value)),
  description: z.string().trim().min(30).max(5000),
  descriptionEn: z.string().trim().max(5000).optional().or(z.literal("")),
  subcategory: z.string().trim().max(80).optional().or(z.literal("")),
  subcategoryEn: z.string().trim().max(80).nullable().optional(),
  city: z.string().trim().max(80).nullable().optional(),
  province: z.string().trim().max(3).nullable().optional(),
  venue: z.string().trim().max(120).nullable().optional(),
  comuneId: z.string().trim().max(80).nullable().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional().or(z.literal("")),
  eventType: z.enum(eventTypes).default("SINGLE_DAY"),
  onlineUrl: onlineUrlSchema,
  dates: z.array(occurrenceSchema).max(100).optional(),
  price: z.string().trim().max(80).optional(),
  priceEn: z.string().trim().max(80).nullable().optional(),
  website: z.string().url().optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
  requireAccount: z.boolean().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const city = url.searchParams.get("city")?.trim();
  const category = url.searchParams.get("category")?.trim();
  const from = url.searchParams.get("from");
  const parsedFrom = from ? new Date(from) : null;
  const fromDate = parsedFrom && !Number.isNaN(parsedFrom.getTime()) ? parsedFrom : null;
  const threshold = fromDate || new Date();
  const occurrenceActive = { OR: [{ startsAt: { gte: threshold } }, { endsAt: { gte: threshold } }] };

  const events = await prisma.event.findMany({
    where: {
      status: EventStatus.PUBLISHED,
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }, { location: { contains: q, mode: "insensitive" as const } }, { dates: { some: { city: { contains: q, mode: "insensitive" as const } } } }] } : {}),
      ...(category ? { category: { equals: category, mode: "insensitive" as const } } : {}),
      AND: city ? [{ OR: [
        { eventType: { in: ["SINGLE_DAY", "MULTI_DAY"] }, location: { contains: city, mode: "insensitive" }, OR: [{ startsAt: { gte: threshold } }, { endsAt: { gte: threshold } }, { dates: { some: occurrenceActive } }] },
        { eventType: "MULTI_LOCATION", dates: { some: { city: { contains: city, mode: "insensitive" }, ...occurrenceActive } } },
      ] }] : [{ OR: [{ startsAt: { gte: threshold } }, { endsAt: { gte: threshold } }, { dates: { some: occurrenceActive } }] }],
    },
    orderBy: [{ featured: "desc" }, { startsAt: "asc" }],
    take: 100,
    omit: { contactEmail: true, organizerId: true },
    include: { dates: { orderBy: { startsAt: "asc" } } },
  });
  return NextResponse.json({ events: events.map(({ descriptionTranslations, ...event }) => ({
    ...event,
    descriptionEn: getLocalizedText(descriptionTranslations, "en", "") || null,
  })) });
}

export async function POST(request: Request) {
  const messages = apiEventMessages(request);
  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: messages.checkRequiredFields }, { status: 400 });

  const user = await getCurrentUser();
  const data = parsed.data;
  if (data.requireAccount && !user) return NextResponse.json({ error: messages.loginToSubmit }, { status: 401 });
  const dates = data.dates ?? (data.startsAt ? [{ startsAt: data.startsAt, endsAt: data.endsAt }] : []);
  const input = { eventType: data.eventType, dates, comuneId: data.comuneId, location: data.city, province: data.province, venue: data.venue, onlineUrl: data.onlineUrl };
  const scheduleError = validateSchedule(input, requestLocale(request));
  if (scheduleError) return NextResponse.json({ error: scheduleError }, { status: 400 });
  const schedule = await prepareSchedule(input);
  if (!schedule) return NextResponse.json({ error: messages.invalidMunicipalities }, { status: 400 });
  const { dates: eventDates, ...eventSchedule } = schedule;
  const baseSlug = slugify(data.title) || "evento";
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
  const event = await prisma.event.create({
    data: {
      title: data.title,
      titleEn: data.titleEn || null,
      slug,
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
      status: EventStatus.PENDING,
      organizerId: user?.id || null,
    },
    select: { id: true, slug: true, status: true },
  });
  return NextResponse.json({ event, message: messages.eventSubmitted }, { status: 201 });
}
