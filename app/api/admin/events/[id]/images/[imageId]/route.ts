import { apiEventMessages } from "@/lib/api-locale";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { deleteImage } from "@/lib/s3";

type Context = { params: Promise<{ id: string; imageId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const messages = apiEventMessages(request);
  if (!(await requireAdmin())) return NextResponse.json({ error: messages.unauthorized }, { status: 403 });
  const { id, imageId } = await params;
  const parsed = z.object({ cover: z.literal(true).optional(), alt: z.string().trim().max(180).optional(), altEn: z.string().trim().max(180).nullable().optional() }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success || !Object.keys(parsed.data).length) return NextResponse.json({ error: messages.invalidImageUpdate }, { status: 400 });
  const image = await prisma.eventImage.findFirst({ where: { id: imageId, eventId: id } });
  if (!image) return NextResponse.json({ error: messages.imageNotFound }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    if (parsed.data.cover) {
      await tx.eventImage.updateMany({ where: { eventId: id }, data: { isCover: false } });
      await tx.event.update({ where: { id }, data: { image: `/api/images/${imageId}` } });
    }
    await tx.eventImage.update({ where: { id: imageId }, data: { ...(parsed.data.cover ? { isCover: true } : {}), ...(parsed.data.alt !== undefined ? { alt: parsed.data.alt || null } : {}), ...(parsed.data.altEn !== undefined ? { altEn: parsed.data.altEn || null } : {}) } });
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Context) {
  const messages = apiEventMessages(request);
  if (!(await requireAdmin())) return NextResponse.json({ error: messages.unauthorized }, { status: 403 });
  const { id, imageId } = await params;
  const image = await prisma.eventImage.findFirst({ where: { id: imageId, eventId: id } });
  if (!image) return NextResponse.json({ error: messages.imageNotFound }, { status: 404 });
  try { await deleteImage(image.objectKey); }
  catch (error) { console.error("Eliminazione immagine S3 non riuscita", error); return NextResponse.json({ error: messages.imageDeleteFailed }, { status: 503 }); }
  await prisma.$transaction(async (tx) => {
    await tx.eventImage.delete({ where: { id: imageId } });
    if (image.isCover) {
      const next = await tx.eventImage.findFirst({ where: { eventId: id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
      if (next) await tx.eventImage.update({ where: { id: next.id }, data: { isCover: true } });
      await tx.event.update({ where: { id }, data: { image: next ? `/api/images/${next.id}` : null } });
    }
  });
  return NextResponse.json({ ok: true });
}
