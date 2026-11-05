import type { Metadata } from "next";
import Link from "next/link";
import { Map as MapIcon, Search } from "lucide-react";
import { EventCard } from "@/components/site/event-card";
import { EventMap } from "@/components/site/event-map";
import { eventCategories, categoryName, findCategoryBySlug, slugifyCategory } from "@/lib/event-categories";
import { getPublicEvents } from "@/lib/public-events";
import { dateInRome, getEventMapMarkers } from "@/lib/event-map-data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const query = await searchParams;
  const filtered = Object.values(query).some((v) => Boolean(one(v)));
  const title = locale === "en" ? "Events in Sardinia" : "Eventi in Sardegna";
  return { title, alternates: { canonical: `/${locale}/events`, languages: { it: "/it/events", en: "/en/events" } }, robots: { index: !filtered, follow: true } };
}

export default async function EventsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const en = locale === "en";
  const query = await searchParams;
  const q = one(query.q)?.trim() || "";
  const city = one(query.city)?.trim() || "";
  const categorySlug = one(query.category)?.trim() || "";
  const from = one(query.from)?.trim() || "";
  const category = findCategoryBySlug(categorySlug);
  const [events, comuni] = await Promise.all([
    getPublicEvents({ ...(city ? { cityName: city } : {}), locale }),
    prisma.comune.findMany({ select: { name: true, slug: true }, orderBy: { name: "asc" } }),
  ]);
  const selected = events.filter((event) =>
    (!q || [event.title, event.city, event.venue, event.category, event.description, ...event.dates.flatMap((date) => [date.city, date.venue, date.address])].filter(Boolean).join(" ").toLocaleLowerCase().includes(q.toLocaleLowerCase())) &&
    (!categorySlug || !!category && event.category.toLocaleLowerCase() === category.name.toLocaleLowerCase()) &&
    (!from || event.dates.some((date) => dateInRome(date.endsAt ?? date.startsAt) >= from))
  );
  const markerTitles = new Map(selected.map((event) => [`/${locale}/event/${event.slug}`, event.title]));
  const markers = (await getEventMapMarkers(selected.map((event) => event.id), { city, from, locale })).map((marker) => ({ ...marker, title: markerTitles.get(marker.href) || marker.title }));
  return <main className="min-h-[70vh] bg-[#f6f7f4]">
    <section className="bg-[#082848] px-5 py-9 text-white lg:px-8"><div className="mx-auto max-w-7xl"><p className="text-[11px] font-bold uppercase tracking-[.17em] text-teal-200">{en ? "Discover the island" : "Scopri l'isola"}</p><h1 className="mt-2 font-display text-4xl font-semibold tracking-[-.05em] md:text-5xl">{en ? "Events in Sardinia" : "Eventi in Sardegna"}</h1><p className="mt-3 text-sm text-blue-100/75">{en ? "Find your next festival, concert or local celebration." : "Trova il tuo prossimo festival, concerto o festa di paese."}</p></div></section>
    <div className="mx-auto max-w-[1500px] px-5 py-8 lg:px-8">
      <form className="mb-7 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr_auto]" action={`/${locale}/events`}>
        <label className="grid gap-1 text-xs font-bold text-ink">{en ? "Search" : "Cosa cerchi?"}<input name="q" defaultValue={q} placeholder={en ? "Event or keyword" : "Evento o parola chiave"} className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-normal" /></label>
        <label className="grid gap-1 text-xs font-bold text-ink">{en ? "Town" : "Comune"}<select name="city" defaultValue={city} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal"><option value="">{en ? "All towns" : "Tutti i comuni"}</option>{comuni.map((c) => <option key={c.slug} value={c.name}>{c.name}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-bold text-ink">{en ? "Category" : "Categoria"}<select name="category" defaultValue={categorySlug} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal"><option value="">{en ? "All categories" : "Tutte le categorie"}</option>{eventCategories.map((c) => <option key={c.name} value={slugifyCategory(c.name)}>{categoryName(c.name, locale)}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-bold text-ink">{en ? "From" : "Da quando"}<input type="date" name="from" defaultValue={from} className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-normal" /></label>
        <button className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-sea-bright px-5 text-sm font-bold text-ink"><Search size={16} />{en ? "Search" : "Cerca"}</button>
      </form>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,.9fr)]">
        <section><div className="mb-5 flex items-center justify-between gap-4"><h2 className="font-display text-2xl font-semibold text-ink">{selected.length} {en ? (selected.length === 1 ? "event" : "events") : (selected.length === 1 ? "evento" : "eventi")}</h2><Link href={`/${locale}/events`} className="text-xs font-bold text-sea">{en ? "Clear filters" : "Cancella filtri"}</Link></div>{selected.length ? <div className="grid gap-5 md:grid-cols-2">{selected.map((event) => <EventCard key={event.id} event={event} locale={locale} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="font-display text-xl font-semibold text-ink">{en ? "No events found" : "Nessun evento trovato"}</p><p className="mt-2 text-sm text-muted">{en ? "Try changing your filters or suggest an event." : "Cambia i filtri oppure segnala un evento."}</p><Link href={`/${locale}/dashboard/crea-evento`} className="mt-4 inline-block text-sm font-bold text-sea">{en ? "Suggest an event" : "Segnala un evento"}</Link></div>}</section>
        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white lg:sticky lg:top-5"><div className="px-5 py-4"><h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink"><MapIcon size={18} className="text-sea" />{en ? "Explore the map" : "Esplora la mappa"}</h2><p className="mt-1 text-xs text-muted">{en ? "When an exact location is unavailable, the marker shows the town centre." : "Se manca la posizione esatta, il segnaposto indica il centro del comune."}</p></div><EventMap markers={markers} locale={locale} className="h-[380px] w-full lg:h-[calc(100vh-10rem)]" /></aside>
      </div>
    </div>
  </main>;
}
