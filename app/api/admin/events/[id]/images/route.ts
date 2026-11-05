import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { deleteImage, detectImageType, putImage } from "@/lib/s3";

const maxBytes = 8 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  const { id } = await params;
  if (!await prisma.event.findUnique({ where: { id }, select: { id: true } })) return NextResponse.json({ error: "Evento non trovato." }, { status: 404 });
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxBytes + 64 * 1024) return NextResponse.json({ error: "L'immagine deve essere al massimo 8 MB." }, { status: 413 });
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: "File non valido." }, { status: 400 }); }
  const file = form.get("file");
  const alt = String(form.get("alt") || "").trim();
  if (!(file instanceof File) || !file.size || file.size > maxBytes || alt.length > 180) return NextResponse.json({ error: "Seleziona un'immagine fino a 8 MB e usa un testo alternativo di massimo 180 caratteri." }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const imageType = detectImageType(bytes);
  if (!imageType || imageType.type !== file.type) return NextResponse.json({ error: "Sono consentiti file JPEG, PNG, WebP e GIF validi." }, { status: 400 });
  const key = `events/${id}/${randomUUID()}.${imageType.extension}`;
  try { await putImage(key, bytes, imageType.type); }
  catch (error) { console.error("Upload S3 non riuscito", error); return NextResponse.json({ error: "Storage immagini non disponibile o non configurato." }, { status: 503 }); }
  try {
    const image = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({ where: { id }, select: { image: true, _count: { select: { images: true } } } });
      if (!event) throw new Error("Evento non trovato.");
      if (event._count.images >= 20) throw new Error("È possibile caricare fino a 20 immagini per evento.");
      const cover = event._count.images === 0 && !event.image;
      const created = await tx.eventImage.create({ data: { eventId: id, objectKey: key, contentType: imageType.type, alt: alt || null, isCover: cover, sortOrder: event._count.images } });
      if (cover) await tx.event.update({ where: { id }, data: { image: `/api/images/${created.id}` } });
      return created;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    try { await deleteImage(key); } catch (cleanupError) { console.error("Pulizia immagine S3 non riuscita", cleanupError); }
    const message = error instanceof Error && error.message.includes("20 immagini") ? error.message : "Salvataggio immagine non riuscito. Riprova.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
