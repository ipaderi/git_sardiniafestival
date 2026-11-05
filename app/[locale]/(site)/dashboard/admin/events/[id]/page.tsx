import { dictionary, interpolate } from "@/lib/dictionary";
import adminIt from "@/messages/it/admin.json";
import adminEn from "@/messages/en/admin.json";
import accountIt from "@/messages/it/account.json";
import accountEn from "@/messages/en/account.json";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronDown, ChevronRight, ExternalLink, ImageIcon, MapPin, Pencil, Star } from "lucide-react";
import { EventActions } from "@/components/admin/event-actions";
import { EventStatusBadge } from "@/components/admin/event-status-badge";
import { categoryName } from "@/lib/event-categories";
import { getLocalizedText } from "@/lib/localized-text";
import { formatWallClockRange, toLocalDateTime } from "@/lib/event-wall-clock";
import { prisma } from "@/lib/prisma";

type DateRow = { id: string; startsAt: Date; endsAt: Date | null; label: string | null; labelEn: string | null; city: string | null; province: string | null; venue: string | null; address: string | null; comuneId: string | null };

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white">
    <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5"><h2 className="font-display text-base font-semibold text-ink">{title}</h2>{action}</header>
    <div className="p-5">{children}</div>
  </section>;
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-0.5"><dt className="text-[11px] font-semibold text-muted">{label}</dt><dd className="min-w-0 break-words text-sm text-ink">{children}</dd></div>;
}

export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const dict = dictionary(locale, adminIt, adminEn);
  const t = dict.eventDetail;
  const eventTypes = dictionary(locale, accountIt, accountEn).schedule.eventTypes;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      dates: { orderBy: { startsAt: "asc" } },
      images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      pois: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      organizer: { select: { name: true, email: true } },
    },
  });
  if (!event) notFound();

  const eventsHref = `/${locale}/dashboard/admin/events`;
  const editHref = `${eventsHref}/${event.id}/edit`;
  const descriptionEn = getLocalizedText(event.descriptionTranslations, "en", "");
  const cover = event.images.find((image) => image.isCover) ?? event.images[0];
  const coverUrl = cover ? `/api/images/${cover.id}` : event.image;
  const range = (start: Date, end: Date | null) => formatWallClockRange(toLocalDateTime(start), toLocalDateTime(end), dict.events.dateLocale);
  const dates: DateRow[] = event.dates.length ? event.dates : [{ id: "main", startsAt: event.startsAt, endsAt: event.endsAt, label: null, labelEn: null, city: null, province: null, venue: null, address: null, comuneId: null }];
  const dateName = (date: DateRow) => locale === "en" ? date.labelEn || date.label : date.label;

  // A touring event is easiest to read place by place, with each place opening onto its dates.
  const groups = new Map<string, { title: string; address: string | null; dates: DateRow[] }>();
  if (event.eventType === "MULTI_LOCATION") for (const date of dates) {
    const key = `${date.comuneId}|${date.venue}|${date.address}`;
    const group = groups.get(key) ?? { title: [date.city && date.province ? `${date.city} (${date.province})` : date.city, date.venue].filter(Boolean).join(" · ") || t.placeNotSet, address: date.address, dates: [] };
    group.dates.push(date);
    groups.set(key, group);
  }
  const dateRows = (rows: DateRow[]) => <ul className="divide-y divide-slate-100">{rows.map((date) => <li key={date.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2 first:pt-0 last:pb-0"><span className="text-sm font-medium text-ink">{range(date.startsAt, date.endsAt)}</span>{dateName(date) && <span className="text-xs text-muted">{dateName(date)}</span>}</li>)}</ul>;

  return <div className="mx-auto max-w-6xl">
    <nav aria-label={t.breadcrumb} className="flex min-w-0 items-center gap-1 text-xs font-semibold text-muted"><Link className="focus-ring shrink-0 rounded hover:text-ink" href={eventsHref}>{dict.layout.events}</Link><ChevronRight size={12} aria-hidden className="shrink-0" /><span aria-current="page" className="truncate">{event.title}</span></nav>

    <header className="mt-2 grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="font-display text-3xl font-semibold">{event.title}</h1>
          <EventStatusBadge status={event.status} label={dict.events.statuses[event.status]} />
          {event.featured && <span title={dict.events.featured} className="text-amber-500"><Star size={16} fill="currentColor" aria-label={dict.events.featured} /></span>}
        </div>
        {event.titleEn && <p className="mt-1 text-sm text-muted">{event.titleEn}</p>}
        {event.status === "PUBLISHED" && <a href={`/${locale}/event/${event.slug}`} target="_blank" rel="noreferrer" className="focus-ring mt-2 inline-flex items-center gap-1 rounded text-xs font-bold text-sea hover:text-ink">{t.viewOnSite} <ExternalLink size={12} aria-hidden /></a>}
      </div>
      <EventActions id={event.id} status={event.status} featured={event.featured} locale={locale} variant="detail" />
    </header>

    <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <Card title={t.description}>
          <p className="whitespace-pre-line text-sm leading-6 text-ink">{event.description}</p>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{t.englishVersion}</p>
            {descriptionEn ? <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-ink">{descriptionEn}</p> : <p className="mt-1.5 text-sm text-muted">{t.noTranslation}</p>}
          </div>
        </Card>

        <Card title={t.datesAndPlaces} action={<span className="text-xs font-semibold text-muted">{eventTypes[event.eventType]}</span>}>
          {event.eventType === "MULTI_LOCATION"
            ? <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">{[...groups.values()].map((group, index) => <details key={group.title + index} open={groups.size <= 3} className="group">
                <summary className="focus-ring flex cursor-pointer list-none items-center gap-3 px-3.5 py-3 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  <ChevronDown size={16} aria-hidden className="shrink-0 text-muted transition-transform group-open:rotate-180" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{group.title}</span>{group.address && <span className="block truncate text-xs text-muted">{group.address}</span>}</span>
                  <span className="shrink-0 text-xs font-semibold text-muted">{group.dates.length === 1 ? t.oneDate : interpolate(t.manyDates, { count: group.dates.length })}</span>
                </summary>
                <div className="border-t border-slate-100 px-3.5 py-3">{dateRows(group.dates)}</div>
              </details>)}</div>
            : <div className="space-y-4">
                {event.eventType === "ONLINE"
                  ? event.onlineUrl && <p className="flex items-center gap-2 text-sm"><ExternalLink size={15} aria-hidden className="shrink-0 text-muted" /><a href={event.onlineUrl} target="_blank" rel="noreferrer" className="break-all font-semibold text-sea hover:text-ink">{event.onlineUrl}</a></p>
                  : <p className="flex items-center gap-2 text-sm font-semibold text-ink"><MapPin size={15} aria-hidden className="shrink-0 text-muted" />{[event.location && event.province ? `${event.location} (${event.province})` : event.location, event.venue].filter(Boolean).join(" · ") || t.placeNotSet}</p>}
                {dateRows(dates)}
              </div>}
        </Card>

        <Card title={dict.gallery.eventImages} action={<Link href={`${editHref}#images`} className="focus-ring inline-flex items-center gap-1 rounded text-xs font-bold text-sea hover:text-ink"><Pencil size={12} aria-hidden /> {dict.events.edit}</Link>}>
          {event.images.length ? <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{event.images.map((image) => <li key={image.id} className="relative overflow-hidden rounded-xl border border-slate-200">
            <img src={`/api/images/${image.id}`} alt={image.alt || ""} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            {image.isCover && <span className="absolute left-2 top-2 rounded-full bg-ink/85 px-2 py-0.5 text-[10px] font-bold text-white">{dict.gallery.cover}</span>}
          </li>)}</ul> : <div className="grid justify-items-center gap-2 py-6 text-center text-sm text-muted"><ImageIcon size={22} aria-hidden className="text-slate-300" />{t.noImages}</div>}
        </Card>

        <Card title={dict.poi.pointsOfInterest} action={<Link href={`${editHref}#pois`} className="focus-ring inline-flex items-center gap-1 rounded text-xs font-bold text-sea hover:text-ink"><Pencil size={12} aria-hidden /> {dict.events.edit}</Link>}>
          {event.pois.length ? <ul className="divide-y divide-slate-100">{event.pois.map((poi) => <li key={poi.id} className="py-2.5 first:pt-0 last:pb-0"><p className="text-sm font-semibold text-ink">{locale === "en" ? poi.nameEn || poi.name : poi.name}</p>{poi.address && <p className="mt-0.5 text-xs text-muted">{poi.address}</p>}</li>)}</ul> : <p className="text-sm text-muted">{dict.poi.noPointsOfInterestAdded}</p>}
        </Card>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-4">
        {coverUrl && <img src={coverUrl} alt={cover?.alt || ""} className="aspect-[16/10] w-full rounded-2xl border border-slate-200 object-cover" />}
        <Card title={t.information}>
          <dl className="grid gap-3.5">
            <Info label={t.category}>{categoryName(event.category, locale)}{event.subcategory ? ` · ${locale === "en" ? event.subcategoryEn || event.subcategory : event.subcategory}` : ""}</Info>
            <Info label={t.firstDate}><span className="inline-flex items-center gap-1.5"><CalendarDays size={13} aria-hidden className="text-muted" />{range(event.startsAt, event.endsAt)}</span></Info>
            {(event.price || event.priceEn) && <Info label={t.price}>{locale === "en" ? event.priceEn || event.price : event.price}</Info>}
            {event.website && <Info label={t.website}><a href={event.website} target="_blank" rel="noreferrer" className="font-semibold text-sea hover:text-ink">{event.website.replace(/^https?:\/\//, "")}</a></Info>}
            <Info label={t.submittedBy}>{event.organizer?.name || event.organizer?.email || dict.events.guest}{event.organizer?.name && <span className="block text-xs text-muted">{event.organizer.email}</span>}</Info>
            {event.contactEmail && <Info label={t.contactEmail}><a href={`mailto:${event.contactEmail}`} className="font-semibold text-sea hover:text-ink">{event.contactEmail}</a></Info>}
            <Info label={t.permalink}><code className="text-xs text-muted">/event/{event.slug}</code></Info>
            <Info label={t.created}>{range(event.createdAt, null)}</Info>
            <Info label={t.updated}>{range(event.updatedAt, null)}</Info>
          </dl>
        </Card>
      </aside>
    </div>
  </div>;
}
