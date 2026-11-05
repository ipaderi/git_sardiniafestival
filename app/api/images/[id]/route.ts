import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getImage } from "@/lib/s3";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const image = await prisma.eventImage.findUnique({ where: { id }, include: { event: { select: { status: true } } } });
  if (!image || (image.event.status !== "PUBLISHED" && !(await requireAdmin()))) return new NextResponse(null, { status: 404 });
  try {
    const bytes = await getImage(image.objectKey);
    if (!bytes) return new NextResponse(null, { status: 404 });
    return new NextResponse(new Uint8Array(bytes).buffer, { headers: {
      "Content-Type": image.contentType, "Content-Length": String(bytes.byteLength),
      "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    } });
  } catch (error) {
    console.error("Lettura immagine S3 non riuscita", error);
    return new NextResponse(null, { status: 503 });
  }
}
