import { dictionary } from "@/lib/dictionary";
import adminIt from "@/messages/it/admin.json";
import adminEn from "@/messages/en/admin.json";
import { EventManagement } from "@/components/admin/event-management";
import { prisma } from "@/lib/prisma";
import { getLocalizedText } from "@/lib/localized-text";
export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string }> }) {
 const { locale } = await params; const t = dictionary(locale, adminIt, adminEn).eventsPage; const { status } = await searchParams; const allowed = ["ALL", "PENDING", "PUBLISHED", "REJECTED", "CANCELLED"];
 const initialFilter = (allowed.includes(status || "") ? status : "ALL") as "ALL" | "PENDING" | "PUBLISHED" | "REJECTED" | "CANCELLED";
 const saved = await prisma.event.findMany({ include: { dates: { orderBy: { startsAt: "asc" } }, images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }, organizer: { select: { name: true, email: true } } }, orderBy: [{ status: "asc" }, { startsAt: "asc" }] });
 const events = saved.map(({ descriptionTranslations, ...event }) => ({ ...event, descriptionEn: getLocalizedText(descriptionTranslations, "en", "") || null }));
 return <div className="mx-auto max-w-6xl"><h1 className="font-display text-3xl font-semibold">{t.manageEvents}</h1><div className="mt-7"><EventManagement events={events} initialFilter={initialFilter} locale={locale}/></div></div>;
}
