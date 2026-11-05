import { apiEventMessages } from "@/lib/api-locale";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getLocalizedText, toLocalizedTextMap } from "@/lib/localized-text";

const inputSchema = z.object({
  comuneId: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500),
  descriptionEn: z.string().trim().max(500).nullable().optional(),
  imageUrl: z.string().trim().max(2048).refine((value) => {
    if (!value) return true;
    try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
  }),
  featured: z.boolean(),
  sortOrder: z.number().int().min(0).max(10000),
}).strict();

const orderSchema = z.object({
  order: z.array(z.string().trim().min(1).max(100)).min(1).max(1000),
  toggle: z.object({ id: z.string().trim().min(1).max(100), featured: z.boolean() }).strict().optional(),
}).strict();

/** Save the whole list order, and optionally one town's active state, in a single step. */
export async function PATCH(request: Request) {
  const messages = apiEventMessages(request);
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized", message: messages.unauthorized }, { status: 403 });
  const parsed = orderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_data", message: messages.invalidCityData }, { status: 400 });
  const { order, toggle } = parsed.data;
  const existing = await prisma.featuredCity.findMany({ select: { id: true, sortOrder: true, featured: true } });
  const known = new Set(existing.map((city) => city.id));
  // A list that does not match what is saved was changed elsewhere: renumbering it would lose that change.
  const matches = new Set(order).size === order.length && order.length === known.size && order.every((id) => known.has(id));
  if (!matches || (toggle && !known.has(toggle.id))) return NextResponse.json({ error: "stale_order", message: messages.invalidCityData }, { status: 409 });
  const updates = existing.flatMap((city) => {
    const sortOrder = order.indexOf(city.id) * 10;
    const featured = toggle?.id === city.id ? toggle.featured : city.featured;
    if (sortOrder === city.sortOrder && featured === city.featured) return [];
    return [prisma.featuredCity.update({ where: { id: city.id }, data: { sortOrder, featured } })];
  });
  await prisma.$transaction(updates);
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const messages = apiEventMessages(request);
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized", message: messages.unauthorized }, { status: 403 });
  const cities = await prisma.featuredCity.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return NextResponse.json({ cities: cities.map(toCityResponse) });
}

function toCityResponse<T extends { descriptions: unknown }>(city: T) {
  const { descriptions, ...fields } = city;
  return {
    ...fields,
    description: getLocalizedText(descriptions, "it"),
    descriptionEn: getLocalizedText(descriptions, "en", "") || null,
  };
}

export async function PUT(request: Request) {
  const messages = apiEventMessages(request);
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized", message: messages.unauthorized }, { status: 403 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_data", message: messages.invalidCityData }, { status: 400 });
  const { comuneId, description, descriptionEn, imageUrl, featured, sortOrder } = parsed.data;
  const comune = await prisma.comune.findUnique({ where: { id: comuneId }, select: { name: true, slug: true, provinceCode: true } });
  if (!comune) return NextResponse.json({ error: "invalid_city", message: messages.invalidCity }, { status: 400 });
  // Slugs are unique. Also recognize older records created with the city name but a different slug.
  const matches = await prisma.featuredCity.findMany({ where: { OR: [{ slug: comune.slug }, { name: { equals: comune.name, mode: "insensitive" } }] }, select: { id: true, descriptions: true } });
  if (matches.length > 1) return NextResponse.json({ error: "duplicate_city", message: messages.duplicateCity }, { status: 409 });
  const descriptions: Record<string, string> = { ...toLocalizedTextMap(matches[0]?.descriptions), it: description };
  if (descriptionEn !== undefined) {
    if (descriptionEn) descriptions.en = descriptionEn;
    else delete descriptions.en;
  }
  const data = { name: comune.name, slug: comune.slug, province: comune.provinceCode, descriptions, imageUrl: imageUrl || null, featured, sortOrder };
  try {
    const city = matches[0]
      ? await prisma.featuredCity.update({ where: { id: matches[0].id }, data })
      : await prisma.featuredCity.create({ data });
    return NextResponse.json({ city: { ...toCityResponse(city), comuneId } });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "duplicate_city", message: messages.duplicateCity }, { status: 409 });
    throw error;
  }
}
