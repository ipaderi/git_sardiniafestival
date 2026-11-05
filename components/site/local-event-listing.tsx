import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { EventCard } from "@/components/site/event-card";
import type { FestivalEvent } from "@/lib/public-events";
import type { LocalListingType } from "@/lib/local-events";
import { eventCategories, slugifyCategory } from "@/lib/event-categories";

type LocalEventListingProps = {
  type: LocalListingType;
  comune: { name: string; slug: string; provinceCode: string; provinceName: string; latitude: number; longitude: number };
  events: FestivalEvent[];
  category?: (typeof eventCategories)[number];
  allEvents?: FestivalEvent[];
};

export function LocalEventListing({ type, comune, events, category, allEvents = events }: LocalEventListingProps) {
  const isSagre = type === "sagre";
  const pageTitle = category ? `${category.name} a ${comune.name}` : isSagre ? `Sagre e feste a ${comune.name}` : `Eventi a ${comune.name}`;
  const alternateLabel = isSagre || category ? `Tutti gli eventi a ${comune.name}` : `Sagre e feste a ${comune.name}`;
  const alternateHref = isSagre || category ? `/citta/${comune.slug}` : `/sagre-a/${comune.slug}`;
  const pagePath = category ? `/citta/${comune.slug}/${slugifyCategory(category.name)}` : isSagre ? `/sagre-a/${comune.slug}` : `/citta/${comune.slug}`;
  const now = Date.now();
  const isUpcoming = (event: FestivalEvent) => {
    const localDates = event.eventType === "MULTI_LOCATION"
      ? event.dates.filter((date) => date.comuneSlug ? date.comuneSlug === comune.slug : date.city?.toLocaleLowerCase("it-IT") === comune.name.toLocaleLowerCase("it-IT"))
      : event.dates;
    return localDates.some((date) => new Date(date.endsAt || date.startsAt).getTime() >= now);
  };
  const upcoming = events.filter(isUpcoming);
  const past = isSagre ? [] : events.filter((event) => !isUpcoming(event));
  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL || "https://sardiniafestival.com").replace(/\/+$/, "");
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: pageTitle,
        url: `${siteBase}${pagePath}`,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: events.length,
          itemListElement: events.map((event, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: event.title,
            url: `${siteBase}/eventi/${event.slug}`,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteBase },
          { "@type": "ListItem", position: 2, name: "Città", item: `${siteBase}/citta` },
          ...(category || isSagre ? [{ "@type": "ListItem", position: 3, name: `Eventi a ${comune.name}`, item: `${siteBase}/citta/${comune.slug}` }] : []),
          { "@type": "ListItem", position: category || isSagre ? 4 : 3, name: pageTitle, item: `${siteBase}${pagePath}` },
        ],
      },
    ],
  };

  return (
    <main className="min-h-[70vh] bg-[#f6f7f4] px-5 py-9 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav aria-label="Percorso" className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
          <Link href="/" className="hover:text-sea">Home</Link><span aria-hidden="true">/</span>
          <Link href="/citta" className="hover:text-sea">Città</Link><span aria-hidden="true">/</span>
          {(category || isSagre) && <><Link href={`/citta/${comune.slug}`} className="hover:text-sea">{comune.name}</Link><span aria-hidden="true">/</span></>}
          <span aria-current="page" className="text-ink">{pageTitle}</span>
        </nav>

        <section className="relative mt-6 overflow-hidden rounded-[28px] bg-[#082848] px-6 py-8 text-white md:px-10 md:py-10">
          <div aria-hidden="true" className="absolute -right-12 -top-28 size-80 rounded-full border-[42px] border-white/5" />
          <div className="relative max-w-3xl">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.17em] text-teal-200"><MapPin size={14} /> {comune.provinceName} · {comune.provinceCode}</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-.05em] md:text-5xl">{pageTitle}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-100/80">
              {events.length
                ? `${events.length} ${isSagre ? "appuntamenti tra sagre e feste" : "eventi pubblicati"} a ${comune.name}. Date, luoghi e dettagli degli eventi su SardiniaFestival.`
                : `Il calendario ${category ? `di ${category.name}` : isSagre ? "di sagre e feste" : "degli eventi"} a ${comune.name} si sta aggiornando. Al momento non ci sono eventi pubblicati.`}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href={alternateHref} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-sea-bright px-4 py-3 text-sm font-bold text-ink"><CalendarDays size={16} /> {alternateLabel}</Link>
              <Link href="/eventi" className="focus-ring inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"><MapPin size={16} /> Mappa della Sardegna</Link>
            </div>
          </div>
        </section>

        {!isSagre && <section aria-labelledby="local-categories" className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-[11px] font-bold uppercase tracking-[.17em] text-sea">Esplora per categoria</p><h2 id="local-categories" className="mt-2 font-display text-2xl font-semibold tracking-[-.035em] text-ink">Cosa cerchi a {comune.name}?</h2></div>
            {category && <Link href={`/citta/${comune.slug}`} className="focus-ring rounded text-sm font-semibold text-sea hover:text-ink">Tutti gli eventi</Link>}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {eventCategories.map((item) => {
              const count = allEvents.filter((event) => event.category.toLocaleLowerCase("it-IT") === item.name.toLocaleLowerCase("it-IT")).length;
              const active = category?.name === item.name;
              return <Link key={item.name} href={`/citta/${comune.slug}/${slugifyCategory(item.name)}`} aria-current={active ? "page" : undefined} className={`focus-ring flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${active ? "border-sea bg-[#e7f5f2] text-sea" : "border-slate-200 bg-white text-ink hover:border-sea hover:text-sea"}`}><span>{item.name}</span><span className="shrink-0 text-xs font-medium text-muted">{count}</span></Link>;
            })}
          </div>
        </section>}

        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.17em] text-sea">{isSagre ? "Tradizione locale" : "In programma"}</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-.035em] text-ink">{isSagre ? `Cosa fare a ${comune.name}` : `I prossimi appuntamenti a ${comune.name}`}</h2>
          </div>
          <p className="text-xs text-muted">{events.length} {events.length === 1 ? "evento pubblicato" : "eventi pubblicati"}</p>
        </div>

        {upcoming.length ? <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{upcoming.map((event, index) => <EventCard key={event.id} event={event} priority={index === 0} />)}</div> : (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#e7f5f2] text-sea"><CalendarDays size={21} /></span>
            <h3 className="mt-4 font-display text-xl font-semibold text-ink">Nessun appuntamento futuro pubblicato</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Il calendario si aggiorna con le segnalazioni verificate. Se organizzi una festa o conosci un evento a {comune.name}, puoi inviarcelo.</p>
            <Link href="/segnala-evento" className="focus-ring mt-5 inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white hover:bg-[#12446b]">Segnala un evento <ArrowRight size={15} /></Link>
          </div>
        )}

        {past.length > 0 && <section className="mt-10">
          <p className="text-[11px] font-bold uppercase tracking-[.17em] text-sea">Archivio</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-.035em] text-ink">Eventi passati a {comune.name}</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{past.map((event) => <EventCard key={event.id} event={event} />)}</div>
        </section>}

        <div className="mt-9 border-t border-slate-200 pt-5">
          <Link href="/eventi" className="focus-ring inline-flex items-center gap-2 rounded text-sm font-semibold text-sea hover:text-ink"><ArrowLeft size={15} /> Tutti gli eventi in Sardegna</Link>
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    </main>
  );
}
