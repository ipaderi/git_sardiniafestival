import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const poiSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).nullable(),
  address: z.string().trim().max(240).nullable(),
  latitude: z.number().finite().min(-90).max(90).nullable(),
  longitude: z.number().finite().min(-180).max(180).nullable(),
}).strict().refine((poi) => (poi.latitude === null) === (poi.longitude === null), {
  message: "Indica entrambe le coordinate o lasciale vuote.",
});

const editSchema = z.object({ id: z.string().min(1).max(80), poi: poiSchema }).strict();
const deleteSchema = z.object({ id: z.string().min(1).max(80) }).strict();
type Context = { params: Promise<{ id: string }> };
const forbidden = () => NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
const missing = () => NextResponse.json({ error: "Evento non trovato." }, { status: 404 });

export async function GET(_request: Request, { params }: Context) {
  if (!(await requireAdmin())) return forbidden();
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true, pois: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } });
  if (!event) return missing();
  return NextResponse.json({ pois: event.pois }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request, { params }: Context) {
  if (!(await requireAdmin())) return forbidden();
  const input = poiSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Controlla i campi e le coordinate del punto di interesse." }, { status: 400 });
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true } });
  if (!event) return missing();
  const poi = await prisma.eventPoi.create({ data: { ...input.data, description: input.data.description || null, address: input.data.address || null, eventId: id } });
  return NextResponse.json({ poi }, { status: 201 });
}

export async function PATCH(request: Request, { params }: Context) {
  if (!(await requireAdmin())) return forbidden();
  const input = editSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Controlla i campi e le coordinate del punto di interesse." }, { status: 400 });
  const { id } = await params;
  const { poi } = input.data;
  const result = await prisma.eventPoi.updateMany({ where: { id: input.data.id, eventId: id }, data: { ...poi, description: poi.description || null, address: poi.address || null } });
  if (!result.count) return NextResponse.json({ error: "Punto di interesse non trovato." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Context) {
  if (!(await requireAdmin())) return forbidden();
  const input = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Punto di interesse non valido." }, { status: 400 });
  const { id } = await params;
  const result = await prisma.eventPoi.deleteMany({ where: { id: input.data.id, eventId: id } });
  if (!result.count) return NextResponse.json({ error: "Punto di interesse non trovato." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
