import { EventManagement } from "@/components/admin/event-management";
import { prisma } from "@/lib/prisma";
export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string }> }) {
 const { locale } = await params; const { status } = await searchParams; const allowed = ["ALL", "PENDING", "PUBLISHED", "REJECTED", "CANCELLED"];
 const initialFilter = (allowed.includes(status || "") ? status : "ALL") as "ALL" | "PENDING" | "PUBLISHED" | "REJECTED" | "CANCELLED";
 const events = await prisma.event.findMany({ include: { dates: { orderBy: { startsAt: "asc" } }, images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }, organizer: { select: { name: true, email: true } } }, orderBy: [{ status: "asc" }, { startsAt: "asc" }] });
 return <div className="mx-auto max-w-6xl"><h1 className="font-display text-3xl font-semibold">{locale === "en" ? "Manage events" : "Gestione eventi"}</h1><div className="mt-7"><EventManagement events={events} initialFilter={initialFilter} locale={locale}/></div></div>;
}
