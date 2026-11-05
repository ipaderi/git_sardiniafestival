import type { Metadata } from "next";
import { Map as MapIcon, Search, SlidersHorizontal } from "lucide-react";
import { EventCard } from "@/components/site/event-card";
import { EventMap } from "@/components/site/event-map";
import { SearchForm } from "@/components/site/search-form";
import { dateInRome, getEventMapMarkers } from "@/lib/event-map-data";
import { getPublicEvents } from "@/lib/public-events";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const params = await searchParams;
  const isFiltered = ["q", "city", "category", "from", "lat", "lon"].some((key) => Boolean(one(params[key])?.trim()));
  return {
    title: "Eventi in Sardegna",
    description: "Cerca concerti, sagre, festival, mostre e spettacoli in tutta la Sardegna.",
    alternates: { canonical: "/eventi" },
    robots: { index: !isFiltered, follow: true },
  };
}

export default async function EventsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = one(params.q)?.trim() || "";
  const city = one(params.city)?.trim() || "";
  const category = one(params.category)?.trim() || "";
  const from = one(params.from) || "";
  const events = (await getPublicEvents(city ? { cityName: city } : {})).filter((event) =>
    (!q || [event.title, event.city, event.venue, event.category, event.description, ...event.dates.flatMap((date) => [date.city, date.venue, date.address])].filter(Boolean).join(" ").toLocaleLowerCase("it-IT").includes(q.toLocaleLowerCase("it-IT"))) &&
    (!category || event.category.toLocaleLowerCase("it-IT") === category.toLocaleLowerCase("it-IT")) &&
    (!from || event.dates.some((date) => dateInRome(date.endsAt ?? date.startsAt) >= from))
  );
  const markers = await getEventMapMarkers(events.map((event) => event.id), { city, from });

  return (
    <main className="min-h-[70vh]">
      <section className="bg-[#082848] px-5 pb-8 pt-9 text-white md:pb-12 md:pt-12">
        <div className="mx-auto max-w-7xl"><p className="text-[11px] font-bold uppercase tracking-[.17em] text-teal-200">Il tuo prossimo ricordo</p><h1 className="mt-2 font-display text-4xl font-semibold tracking-[-.05em] md:text-5xl">Eventi in Sardegna</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/75">Dai grandi festival alle feste che conoscono solo in paese. Cerca per nome, luogo o data.</p><div className="mt-7"><SearchForm compact defaults={{ q, city, from }} /></div></div>
      </section>
      <div className="mx-auto max-w-7xl px-5 py-9 lg:px-8">
        <section aria-labelledby="mappa-eventi" className="mb-9 overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 sm:px-6">
            <div><h2 id="mappa-eventi" className="flex items-center gap-2 font-display text-xl font-semibold text-ink"><MapIcon size={19} className="text-sea" /> Esplora la mappa</h2><p className="mt-1 text-xs leading-5 text-muted">{markers.length ? `${markers.length} ${markers.length === 1 ? "sede sulla mappa" : "sedi sulla mappa"}. ` : "Nessuna sede da mostrare per questa ricerca. "}Quando manca la posizione esatta, il segnaposto indica il centro del comune.</p></div>
          </div>
          <EventMap markers={markers} className="h-[28rem] w-full" />
        </section>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-bold text-ink"><Search size={16} className="text-sea" /> {events.length} {events.length === 1 ? "evento" : "eventi"} da scoprire</p><p className="mt-1 text-xs text-muted">{[q && `“${q}”`, city, category, from && `dal ${new Date(`${from}T00:00:00`).toLocaleDateString("it-IT")}`].filter(Boolean).join(" · ") || "In tutta l'isola"}</p></div><span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink-soft"><SlidersHorizontal size={14} /> Ordina per data</span></div>
        {events.length ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{events.map((event) => <EventCard key={event.id} event={event} />)}</div> : <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#e7f5f2] text-sea"><Search size={21} /></span><h2 className="mt-4 font-display text-2xl font-semibold text-ink">Qui ancora nessuna festa</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Prova ad allargare la ricerca oppure segnala tu un evento che merita di essere scoperto.</p><a className="mt-5 inline-flex rounded-xl bg-sea-bright px-5 py-3 text-sm font-bold text-ink hover:bg-[#4bd0c2]" href="/segnala-evento">Segnala un evento</a></div>}
      </div>
    </main>
  );
}
