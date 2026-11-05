import { dictionary } from "@/lib/dictionary";
import adminIt from "@/messages/it/admin.json";
import adminEn from "@/messages/en/admin.json";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { EventForm } from "@/components/admin/event-form";
import { EventGallery } from "@/components/admin/event-gallery";
import { EventPoiManagement } from "@/components/admin/event-poi-management";
import { EventStatusBadge } from "@/components/admin/event-status-badge";
import { getLocalizedText } from "@/lib/localized-text";
import { prisma } from "@/lib/prisma";

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { locale, id } = await params;
  const { created } = await searchParams;
  const t = dictionary(locale, adminIt, adminEn);
  const saved = await prisma.event.findUnique({ where: { id }, include: { dates: { orderBy: { startsAt: "asc" } }, images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } });
  if (!saved) notFound();
  const { descriptionTranslations, ...event } = saved;
  const eventsHref = `/${locale}/dashboard/admin/events`;
  const sections = [["content", t.eventForm.sectionContent], ["schedule", t.eventForm.sectionSchedule], ["details", t.eventForm.sectionDetails], ["images", t.gallery.eventImages], ["pois", t.poi.pointsOfInterest]];
  return <div className="mx-auto max-w-4xl">
    <nav aria-label={t.eventDetail.breadcrumb} className="flex min-w-0 items-center gap-1 text-xs font-semibold text-muted">
      <Link className="focus-ring shrink-0 rounded hover:text-ink" href={eventsHref}>{t.layout.events}</Link><ChevronRight size={12} aria-hidden className="shrink-0" />
      <Link className="focus-ring truncate rounded hover:text-ink" href={`${eventsHref}/${event.id}`}>{event.title}</Link><ChevronRight size={12} aria-hidden className="shrink-0" />
      <span aria-current="page" className="shrink-0">{t.events.edit}</span>
    </nav>
    <div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="font-display text-3xl font-semibold">{t.eventForm.editEvent}</h1><EventStatusBadge status={event.status} label={t.events.statuses[event.status]} /></div>
    <nav aria-label={t.eventForm.jumpTo} className="mt-4 flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">{sections.map(([anchor, label]) => <a key={anchor} href={`#${anchor}`} className="focus-ring shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-muted hover:bg-slate-100 hover:text-ink">{label}</a>)}</nav>
    {created && <p role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900"><CheckCircle2 size={16} aria-hidden className="mt-0.5 shrink-0" /> {t.eventForm.created}</p>}
    <div className="mt-5 space-y-5">
      <EventForm locale={locale} event={{ ...event, descriptionEn: getLocalizedText(descriptionTranslations, "en", "") || null }} />
      <EventGallery locale={locale} eventId={event.id} images={event.images} />
      <EventPoiManagement locale={locale} eventId={event.id} />
    </div>
  </div>;
}
