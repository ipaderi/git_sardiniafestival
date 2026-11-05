import { apiEventMessages } from "@/lib/api-locale";
import { EventStatus } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalizedText } from "@/lib/localized-text";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const messages = apiEventMessages(request);
  const { slug } = await params;
  const event = await prisma.event.findFirst({
    where: { slug, status: EventStatus.PUBLISHED },
    omit: { contactEmail: true, organizerId: true },
    include: { dates: { orderBy: [{ startsAt: "asc" }, { sortOrder: "asc" }] } },
  });
  if (!event) return NextResponse.json({ error: messages.eventNotFound }, { status: 404 });
  const { descriptionTranslations, ...fields } = event;
  return NextResponse.json({ event: { ...fields, descriptionEn: getLocalizedText(descriptionTranslations, "en", "") || null } });
}
