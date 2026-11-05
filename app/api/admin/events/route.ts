import { apiEventMessages } from "@/lib/api-locale";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getLocalizedText } from "@/lib/localized-text";

export async function GET(request: Request) {
  const messages = apiEventMessages(request);
  if (!(await requireAdmin())) return NextResponse.json({ error: messages.unauthorized }, { status: 403 });
  const events = await prisma.event.findMany({ include: { dates: { orderBy: { startsAt: "asc" } }, organizer: { select: { name: true, email: true } } }, orderBy: [{ status: "asc" }, { startsAt: "asc" }] });
  return NextResponse.json({ events: events.map(({ descriptionTranslations, ...event }) => ({
    ...event,
    descriptionEn: getLocalizedText(descriptionTranslations, "en", "") || null,
  })) });
}
