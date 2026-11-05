import { EventStatus } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findFirst({
    where: { slug, status: EventStatus.PUBLISHED },
    omit: { contactEmail: true, organizerId: true },
    include: { dates: { orderBy: [{ startsAt: "asc" }, { sortOrder: "asc" }] } },
  });
  if (!event) return NextResponse.json({ error: "Evento non trovato." }, { status: 404 });
  return NextResponse.json({ event });
}
