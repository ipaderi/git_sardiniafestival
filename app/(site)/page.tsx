import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, Music2, Utensils, Theater, Palette, Mountain, Waves, ChevronRight, MapPin, CalendarDays } from "lucide-react";
import { SearchForm, SearchHint } from "@/components/site/search-form";
import { EventCard } from "@/components/site/event-card";
import { getPublicEvents } from "@/lib/public-events";
import { prisma } from "@/lib/prisma";
import { slugifyComune } from "@/lib/comuni";
import type { FestivalEvent } from "@/lib/public-events";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { alternates: { canonical: "/" } };

const categories = [
  { name: "Musica", count: "Concerti e festival", icon: Music2, tint: "bg-[#e7f5f2] text-[#087567]", href: "/categorie/musica" },
  { name: "Tradizione", count: "Sagre e feste", icon: Utensils, tint: "bg-[#fff0e9] text-[#bd573c]", href: "/categorie/tradizione" },
  { name: "Teatro", count: "Palchi e spettacoli", icon: Theater, tint: "bg-[#eef0fb] text-[#505a9a]", href: "/categorie/teatro" },
  { name: "Arte & cultura", count: "Mostre e incontri", icon: Palette, tint: "bg-[#f5edfa] text-[#844b98]", href: "/categorie/arte-e-cultura" },
];

function IslandGraphic({ events }: { events: FestivalEvent[] }) {
  const mapEvents = events.filter((event) => event.latitude !== null && event.longitude !== null).slice(0, 4);
  return (
    <div className="relative mx-auto flex h-[350px] w-full max-w-[460px] items-center justify-center md:h-[430px]">
      <div className="absolute inset-3 rounded-full bg-[#16a6a0]/10 blur-3xl" />
      <div className="absolute left-1/2 top-1/2 h-[84%] aspect-[300/370] -translate-x-1/2 -translate-y-1/2">
        <img src="/brand/sardinia-outline.svg" alt="Profilo geografico della Sardegna" className="h-full w-full object-contain drop-shadow-[0_16px_22px_rgba(0,20,37,.2)]" />
        {mapEvents.map((event) => {
          const left = ((event.longitude! - 8.1338) / (9.8267 - 8.1338)) * 100;
          const top = ((41.2626 - event.latitude!) / (41.2626 - 38.8643)) * 100;
          return <Link key={event.id} href={`/eventi/${event.slug}`} title={event.title} style={{ left: `${left}%`, top: `${top}%` }} className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-white/80 bg-white px-2.5 py-2 text-[10px] font-bold text-ink shadow-lg"><span className="size-2 rounded-full bg-coral ring-4 ring-coral/15" /><span className="max-w-24 truncate">{event.city}</span></Link>;
        })}
      </div>
      <div className="absolute bottom-1 right-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-xs text-blue-50 shadow-xl backdrop-blur-md"><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-teal-300" /> {mapEvents.length ? `${mapEvents.length} eventi mappati` : "Tutta la Sardegna, da esplorare"}</span></div>
    </div>
  );
}

export default async function HomePage() {
  const [allEvents, cities] = await Promise.all([
    getPublicEvents(),
    prisma.featuredCity.findMany({ where: { featured: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], take: 3 }).catch(() => []),
  ]);
  const comuneSlugs = cities.length
    ? await prisma.comune.findMany({ where: { slug: { in: cities.map((city) => slugifyComune(city.name)) } }, select: { name: true, slug: true } }).catch(() => [])
    : [];
  const comuneSlugByName = new Map(comuneSlugs.map((comune) => [slugifyComune(comune.name), comune.slug]));
  const events = allEvents.slice(0, 3);
  return (
    <main>
      <section className="hero-noise relative overflow-hidden bg-[#082848] text-white">
        <div className="island-grid pointer-events-none absolute inset-0 opacity-35" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-4 px-5 pb-12 pt-11 md:grid-cols-[1.05fr_.95fr] md:pb-16 md:pt-16 lg:px-8">
          <div className="relative z-10 max-w-[610px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-200/30 bg-teal-200/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.16em] text-teal-100"><span className="size-1.5 rounded-full bg-[#45d4c0]" /> Il calendario dell'isola</span>
            <h1 className="mt-6 font-display text-[clamp(3.1rem,7vw,5.6rem)] font-semibold leading-[.97] tracking-[-.065em]">La Sardegna,<br /><span className="text-[#64d6c8]">tutta da vivere.</span></h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-blue-100/80 md:text-lg">Concerti sul mare, feste di paese, notti a teatro. Trova l'evento che trasforma un giorno qualunque in un ricordo.</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold text-blue-100/70"><span className="inline-flex items-center gap-2"><CalendarDays size={15} className="text-teal-200" /> Tutte le date</span><span className="inline-flex items-center gap-2"><MapPin size={15} className="text-teal-200" /> Tutta la Sardegna</span></div>
          </div>
          <IslandGraphic events={events} />
          <div className="relative z-10 -mt-2 md:col-span-2 md:mt-0"><SearchForm /><SearchHint /></div>
        </div>
        <div aria-hidden="true" className="absolute -bottom-1 left-0 right-0 h-5 rounded-t-[50%] bg-paper" />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-10 pt-12 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-sea">Scegli il tuo ritmo</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-.04em] text-ink">Che giornata hai in mente?</h2></div><Link href="/categorie" className="hidden items-center gap-1 text-sm font-bold text-sea hover:text-ink sm:flex">Tutte le categorie <ArrowRight size={16} /></Link></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">{categories.map(({ name, count, icon: Icon, tint, href }) => <Link key={name} href={href} className="focus-ring group flex min-h-[112px] items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 transition hover:-translate-y-0.5 hover:border-sea-bright/50 hover:shadow-md sm:p-5"><span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${tint}`}><Icon size={21} strokeWidth={1.8} /></span><span><span className="block font-display text-base font-semibold text-ink group-hover:text-sea">{name}</span><span className="mt-1 block text-xs text-muted">{count}</span></span><ChevronRight size={16} className="ml-auto hidden text-slate-300 group-hover:text-sea sm:block" /></Link>)}</div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="mb-7 flex items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-coral">Da segnare in agenda</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-.04em] text-ink">La prossima festa ti aspetta</h2><p className="mt-2 text-sm text-muted">I festival che fanno battere il cuore dell'isola.</p></div><Link href="/eventi" className="focus-ring hidden items-center gap-1 rounded text-sm font-bold text-sea hover:text-ink sm:flex">Vedi tutti <ArrowRight size={16} /></Link></div>
        {events.length ? <><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{events.map((event, index) => <EventCard key={event.id} event={event} priority={index === 0} />)}</div><Link href="/eventi" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-sea sm:hidden">Vedi tutti gli eventi <ArrowRight size={16} /></Link></> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center"><p className="font-display text-lg font-semibold text-ink">Il calendario si sta riempiendo.</p><p className="mt-1 text-xs text-muted">Conosci un evento in arrivo? Aiutaci a raccontarlo.</p><Link href="/segnala-evento" className="mt-4 inline-flex text-xs font-bold text-sea">Segnala un evento <ArrowRight size={14} /></Link></div>}
      </section>

      <section id="territori" className="bg-[#f2f1eb] py-14 md:py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-7 flex items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-sea">In primo piano</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-.04em] text-ink">Città da scoprire.</h2></div><Link href="/eventi" className="hidden items-center gap-1 text-sm font-bold text-sea sm:flex">Apri la mappa <ArrowRight size={16} /></Link></div>
          {cities.length > 0 ? <div className="grid gap-4 md:grid-cols-3">{cities.map((city) => {
            const comuneSlug = comuneSlugByName.get(slugifyComune(city.name));
            const href = comuneSlug ? `/citta/${comuneSlug}` : `/eventi?city=${encodeURIComponent(city.name)}`;
            return <Link href={href} key={city.id} className="focus-ring group relative min-h-[255px] overflow-hidden rounded-2xl bg-ink">{city.imageUrl ? <img src={city.imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-65 transition duration-500 group-hover:scale-[1.04] group-hover:opacity-75" /> : <div className="absolute inset-0 bg-gradient-to-br from-[#087c78] via-[#0b4560] to-[#082848]" />}<div className="absolute inset-0 bg-gradient-to-t from-[#062440]/90 via-[#062440]/10 to-transparent" /><div className="absolute bottom-0 left-0 right-0 p-5 text-white"><span className="mb-3 flex size-9 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm"><MapPin size={17} /></span><h3 className="font-display text-xl font-semibold">{city.name}</h3><div className="mt-1 flex items-center justify-between text-xs text-white/75"><span>{city.description}</span><ArrowUpRight size={15} /></div></div></Link>;
          })}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center"><p className="font-display text-lg font-semibold text-ink">Scopri gli eventi nei territori della Sardegna.</p><p className="mt-1 text-sm text-muted">Esplora la mappa per trovare gli appuntamenti vicino a te.</p><Link href="/eventi" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-sea">Apri la mappa <ArrowRight size={15} /></Link></div>}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="relative overflow-hidden rounded-[28px] bg-[#e1f2ed] px-6 py-9 md:px-12 md:py-12"><div className="absolute -right-8 -top-12 size-64 rounded-full border-[38px] border-[#c7e8e0]/60 md:size-80" /><div className="relative flex flex-col items-start justify-between gap-7 md:flex-row md:items-center"><div className="max-w-xl"><p className="text-[11px] font-bold uppercase tracking-[.18em] text-sea">Sei parte della festa</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-.04em] text-ink md:text-4xl">Organizzi qualcosa di bello?</h2><p className="mt-3 max-w-lg text-sm leading-6 text-ink-soft/80">Fai arrivare il tuo evento alle persone che stanno cercando proprio un motivo per partire.</p></div><Link href="/segnala-evento" className="focus-ring inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-ink px-7 text-base font-semibold text-white transition-colors hover:bg-[#12446b]">Segnala un evento <ArrowRight size={17} /></Link></div></div>
      </section>
      <div className="sr-only">Scopri eventi in Sardegna con SardiniaFestival</div>
    </main>
  );
}
