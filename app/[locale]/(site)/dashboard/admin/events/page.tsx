import { dictionary, interpolate } from "@/lib/dictionary";
import adminIt from "@/messages/it/admin.json";
import adminEn from "@/messages/en/admin.json";
import accountIt from "@/messages/it/account.json";
import accountEn from "@/messages/en/account.json";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Search, Star, X } from "lucide-react";
import { EventActions } from "@/components/admin/event-actions";
import { EventStatusBadge, type EventStatus } from "@/components/admin/event-status-badge";
import { categoryName } from "@/lib/event-categories";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;
const statuses: EventStatus[] = ["PENDING", "PUBLISHED", "REJECTED", "CANCELLED"];

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const { locale } = await params;
  const query = await searchParams;
  const heading = dictionary(locale, adminIt, adminEn).eventsPage.manageEvents;
  const t = dictionary(locale, adminIt, adminEn).events;
  const eventTypes = dictionary(locale, accountIt, accountEn).schedule.eventTypes;
  const en = locale === "en";
  const status = statuses.find((value) => value === query.status);
  const q = query.q?.trim().slice(0, 120) || "";
  const baseHref = `/${locale}/dashboard/admin/events`;
  const href = (changes: { status?: string; q?: string; page?: number }) => {
    const next = { status: status as string | undefined, q, page: undefined as number | undefined, ...changes };
    const search = new URLSearchParams();
    if (next.status) search.set("status", next.status);
    if (next.q) search.set("q", next.q);
    if (next.page && next.page > 1) search.set("page", String(next.page));
    const value = search.toString();
    return value ? `${baseHref}?${value}` : baseHref;
  };

  const contains = { contains: q, mode: "insensitive" as const };
  const textFilter = q ? { OR: [{ title: contains }, { titleEn: contains }, { location: contains }, { venue: contains }, { dates: { some: { OR: [{ city: contains }, { venue: contains }] } } }, { organizer: { is: { OR: [{ email: contains }, { name: contains }] } } }] } : {};
  const where = { ...textFilter, ...(status ? { status } : {}) };
  const [grouped, total] = await Promise.all([
    prisma.event.groupBy({ by: ["status"], where: textFilter, _count: { _all: true } }),
    prisma.event.count({ where }),
  ]);
  const counts = Object.fromEntries(grouped.map((group) => [group.status, group._count._all])) as Partial<Record<EventStatus, number>>;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(query.page || "1", 10) || 1));
  const events = await prisma.event.findMany({
    where,
    select: {
      id: true, title: true, titleEn: true, category: true, eventType: true, location: true, province: true, venue: true, startsAt: true, status: true, featured: true, image: true,
      organizer: { select: { name: true, email: true } },
      images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }], take: 1, select: { id: true } },
      _count: { select: { dates: true } },
    },
    // Reviews come first, soonest event at the top; elsewhere the newest dates are the ones being worked on.
    orderBy: status === "PENDING" ? [{ startsAt: "asc" }] : [{ status: "asc" }, { startsAt: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const filters = [
    { key: undefined, label: t.all, count: grouped.reduce((sum, group) => sum + group._count._all, 0) },
    { key: "PENDING", label: t.inReview, count: counts.PENDING ?? 0 },
    { key: "PUBLISHED", label: t.published, count: counts.PUBLISHED ?? 0 },
    { key: "REJECTED", label: t.rejected, count: counts.REJECTED ?? 0 },
    { key: "CANCELLED", label: t.hidden, count: counts.CANCELLED ?? 0 },
  ];
  const dateFormat = new Intl.DateTimeFormat(t.dateLocale, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Rome" });

  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-3xl font-semibold">{heading}</h1>
      <Link href={`${baseHref}/new`} className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl bg-sea-bright px-5 text-sm font-semibold text-ink hover:bg-[#4bd0c2]"><Plus size={16} /> {t.newEvent}</Link>
    </div>

    <form method="get" action={baseHref} role="search" className="mt-6 flex gap-2 text-sm font-semibold">
      {status && <input type="hidden" name="status" value={status} />}
      <div className="relative min-w-0 flex-1 font-normal">
        <Search size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="search" name="q" defaultValue={q} aria-label={t.search} placeholder={t.searchPlaceholder} className="focus-ring h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-ink placeholder:text-slate-400" />
      </div>
      <button type="submit" className="focus-ring h-11 shrink-0 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-ink hover:bg-slate-50">{t.search}</button>
      {q && <Link href={href({ q: "" })} aria-label={t.clearSearch} title={t.clearSearch} className="focus-ring grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-slate-100"><X size={16} /></Link>}
    </form>

    <nav aria-label={t.filterByStatus} className="mt-4 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
      {filters.map(({ key, label, count }) => <Link key={label} href={href({ status: key })} aria-current={status === key ? "page" : undefined} className={cn("focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold", status === key ? "bg-ink text-white" : "bg-white text-muted hover:bg-slate-100")}>{label}<span className={cn("tabular-nums font-semibold", status === key ? "text-white/70" : "text-slate-400")}>{count}</span></Link>)}
    </nav>

    <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {events.length ? events.map((event) => {
        const thumbnail = event.images[0] ? `/api/images/${event.images[0].id}` : event.image;
        const place = event.eventType === "ONLINE" ? t.online : [event.location && event.province ? `${event.location} (${event.province})` : event.location, event.venue].filter(Boolean).join(" · ");
        return <li key={event.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex min-w-0 gap-4">
            <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">
              {thumbnail ? <img src={thumbnail} alt="" loading="lazy" className="size-full object-cover" /> : <CalendarDays size={20} aria-hidden />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Link href={`${baseHref}/${event.id}`} className="focus-ring rounded font-semibold text-ink hover:text-sea">{en ? event.titleEn || event.title : event.title}</Link>
                <EventStatusBadge status={event.status} label={t.statuses[event.status]} />
                {event.featured && <span title={t.featured} className="text-amber-500"><Star size={14} fill="currentColor" aria-label={t.featured} /></span>}
              </div>
              <p className="mt-1 text-xs text-muted">{dateFormat.format(event.startsAt)}{event._count.dates > 1 ? ` · ${interpolate(t.occurrenceCount, { count: event._count.dates })}` : ""}{place ? ` · ${place}` : ""}</p>
              <p className="mt-0.5 text-[11px] text-muted">{categoryName(event.category, locale)} · {eventTypes[event.eventType]} · {t.submittedBy} {event.organizer?.name || event.organizer?.email || t.guest}</p>
            </div>
          </div>
          <EventActions id={event.id} status={event.status} featured={event.featured} locale={locale} />
        </li>;
      }) : <li className="px-5 py-14 text-center text-sm text-muted">{q ? t.noSearchResults : t.noEventsInThisSection}</li>}
    </ul>

    {pages > 1 && <nav aria-label={t.pagination} className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold text-muted">
      {page > 1 ? <Link href={href({ page: page - 1 })} className="focus-ring inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-ink hover:bg-slate-50"><ChevronLeft size={14} /> {t.previousPage}</Link> : <span />}
      <span>{interpolate(t.pageOf, { page, pages })}</span>
      {page < pages ? <Link href={href({ page: page + 1 })} className="focus-ring inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-ink hover:bg-slate-50">{t.nextPage} <ChevronRight size={14} /></Link> : <span />}
    </nav>}
  </div>;
}
