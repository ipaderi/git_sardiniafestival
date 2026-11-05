import type { Metadata } from "next";
import { EventManagement } from "@/components/admin/event-management";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Gestione eventi" };

export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const allowedFilters = ["ALL", "PENDING", "PUBLISHED", "REJECTED", "CANCELLED"];
  const initialFilter = (allowedFilters.includes(params.status || "") ? params.status : "ALL") as "ALL" | "PENDING" | "PUBLISHED" | "REJECTED" | "CANCELLED";
  const events = await prisma.event.findMany({ include: { dates: { orderBy: { startsAt: "asc" } }, images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }, organizer: { select: { name: true, email: true } } }, orderBy: [{ status: "asc" }, { startsAt: "asc" }] });
  return <div className="mx-auto max-w-6xl"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-sea">Contenuti</p><h1 className="mt-1 font-display text-3xl font-semibold tracking-[-.04em] text-ink">Gestione eventi</h1><p className="mt-2 text-sm text-muted">Modifica i dettagli, approva, metti in evidenza o aggiorna lo stato degli eventi.</p><div className="mt-7"><EventManagement events={events} initialFilter={initialFilter} /></div></div>;
}
