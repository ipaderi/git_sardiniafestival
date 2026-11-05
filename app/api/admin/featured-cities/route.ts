import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

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

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const cities = await prisma.featuredCity.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return NextResponse.json({ cities });
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_data" }, { status: 400 });
  const { comuneId, description, descriptionEn, imageUrl, featured, sortOrder } = parsed.data;
  const comune = await prisma.comune.findUnique({ where: { id: comuneId }, select: { name: true, slug: true, provinceCode: true } });
  if (!comune) return NextResponse.json({ error: "invalid_city" }, { status: 400 });
  // Slugs are unique. Also recognize older records created with the city name but a different slug.
  const matches = await prisma.featuredCity.findMany({ where: { OR: [{ slug: comune.slug }, { name: { equals: comune.name, mode: "insensitive" } }] }, select: { id: true } });
  if (matches.length > 1) return NextResponse.json({ error: "duplicate_city" }, { status: 409 });
  const data = { name: comune.name, slug: comune.slug, province: comune.provinceCode, description, ...(descriptionEn !== undefined ? { descriptionEn: descriptionEn || null } : {}), imageUrl: imageUrl || null, featured, sortOrder };
  try {
    const city = matches[0]
      ? await prisma.featuredCity.update({ where: { id: matches[0].id }, data })
      : await prisma.featuredCity.create({ data });
    return NextResponse.json({ city: { ...city, comuneId } });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "duplicate_city" }, { status: 409 });
    throw error;
  }
}
