import { apiEventMessages } from "@/lib/api-locale";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { deleteImage, detectImageType, putImage } from "@/lib/s3";

const maxBytes = 8 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const messages = apiEventMessages(request);
  if (!(await requireAdmin())) return NextResponse.json({ error: messages.unauthorized }, { status: 403 });
  const { id } = await params;
  if (!await prisma.event.findUnique({ where: { id }, select: { id: true } })) return NextResponse.json({ error: messages.eventNotFound }, { status: 404 });
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxBytes + 64 * 1024) return NextResponse.json({ error: messages.imageTooLarge }, { status: 413 });
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: messages.invalidFile }, { status: 400 }); }
  const file = form.get("file");
  const alt = String(form.get("alt") || "").trim();
  const altEn = String(form.get("altEn") || "").trim();
  if (!(file instanceof File) || !file.size || file.size > maxBytes || alt.length > 180 || altEn.length > 180) return NextResponse.json({ error: messages.invalidImage }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const imageType = detectImageType(bytes);
  if (!imageType || imageType.type !== file.type) return NextResponse.json({ error: messages.invalidImageType }, { status: 400 });
  const key = `events/${id}/${randomUUID()}.${imageType.extension}`;
  try { await putImage(key, bytes, imageType.type); }
  catch (error) { console.error("Upload S3 non riuscito", error); return NextResponse.json({ error: messages.imageStorageUnavailable }, { status: 503 }); }
  try {
    const image = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({ where: { id }, select: { image: true, _count: { select: { images: true } } } });
      if (!event) throw new Error(messages.eventNotFound);
      if (event._count.images >= 20) throw new Error("EVENT_IMAGE_LIMIT");
      const cover = event._count.images === 0 && !event.image;
      const created = await tx.eventImage.create({ data: { eventId: id, objectKey: key, contentType: imageType.type, alt: alt || null, altEn: altEn || null, isCover: cover, sortOrder: event._count.images } });
      if (cover) await tx.event.update({ where: { id }, data: { image: `/api/images/${created.id}` } });
      return created;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    try { await deleteImage(key); } catch (cleanupError) { console.error("Pulizia immagine S3 non riuscita", cleanupError); }
    const message = error instanceof Error && error.message === "EVENT_IMAGE_LIMIT" ? messages.imageLimit : messages.imageSaveFailed;
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
