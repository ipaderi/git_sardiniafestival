import { apiEventMessages } from "@/lib/api-locale";
import { NextResponse } from "next/server";
import { z } from "zod";
import it from "@/messages/it/api-events.json";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getLocalizedText, setLocalizedText } from "@/lib/localized-text";

const poiSchema = z.object({
  name: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(2000).nullable(),
  descriptionEn: z.string().trim().max(2000).nullable().optional(),
  address: z.string().trim().max(240).nullable(),
  latitude: z.number().finite().min(-90).max(90).nullable(),
  longitude: z.number().finite().min(-180).max(180).nullable(),
}).strict().refine((poi) => (poi.latitude === null) === (poi.longitude === null), {
  message: it.poiBothCoordinates,
});

const editSchema = z.object({ id: z.string().min(1).max(80), poi: poiSchema }).strict();
const deleteSchema = z.object({ id: z.string().min(1).max(80) }).strict();
type Context = { params: Promise<{ id: string }> };
const forbidden = (request: Request) => NextResponse.json({ error: apiEventMessages(request).unauthorized }, { status: 403 });
const missing = (request: Request) => NextResponse.json({ error: apiEventMessages(request).eventNotFound }, { status: 404 });

function toPoiResponse<T extends { descriptionTranslations: unknown }>(poi: T) {
  const { descriptionTranslations, ...fields } = poi;
  return { ...fields, descriptionEn: getLocalizedText(descriptionTranslations, "en", "") || null };
}

export async function GET(request: Request, { params }: Context) {
  if (!(await requireAdmin())) return forbidden(request);
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true, pois: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } });
  if (!event) return missing(request);
  return NextResponse.json({ pois: event.pois.map(toPoiResponse) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request, { params }: Context) {
  const messages = apiEventMessages(request);
  if (!(await requireAdmin())) return forbidden(request);
  const input = poiSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: messages.invalidPoiCoordinates }, { status: 400 });
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true } });
  if (!event) return missing(request);
  const { descriptionEn, ...poiFields } = input.data;
  const poi = await prisma.eventPoi.create({ data: {
    ...poiFields,
    nameEn: poiFields.nameEn || null,
    description: poiFields.description || null,
    descriptionTranslations: setLocalizedText({}, "en", descriptionEn),
    address: poiFields.address || null,
    eventId: id,
  } });
  return NextResponse.json({ poi: toPoiResponse(poi) }, { status: 201 });
}

export async function PATCH(request: Request, { params }: Context) {
  const messages = apiEventMessages(request);
  if (!(await requireAdmin())) return forbidden(request);
  const input = editSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: messages.invalidPoiCoordinates }, { status: 400 });
  const { id } = await params;
  const { poi } = input.data;
  const saved = await prisma.eventPoi.findFirst({ where: { id: input.data.id, eventId: id }, select: { descriptionTranslations: true } });
  if (!saved) return NextResponse.json({ error: messages.poiNotFound }, { status: 404 });
  const { descriptionEn, ...poiFields } = poi;
  const result = await prisma.eventPoi.updateMany({ where: { id: input.data.id, eventId: id }, data: {
    ...poiFields,
    ...(poi.nameEn !== undefined ? { nameEn: poi.nameEn || null } : {}),
    description: poi.description || null,
    ...(descriptionEn !== undefined ? { descriptionTranslations: setLocalizedText(saved.descriptionTranslations, "en", descriptionEn) } : {}),
    address: poi.address || null,
  } });
  if (!result.count) return NextResponse.json({ error: messages.poiNotFound }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Context) {
  const messages = apiEventMessages(request);
  if (!(await requireAdmin())) return forbidden(request);
  const input = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: messages.invalidPoi }, { status: 400 });
  const { id } = await params;
  const result = await prisma.eventPoi.deleteMany({ where: { id: input.data.id, eventId: id } });
  if (!result.count) return NextResponse.json({ error: messages.poiNotFound }, { status: 404 });
  return NextResponse.json({ ok: true });
}
