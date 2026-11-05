import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { MapPin } from "lucide-react";
import { EventCard } from "@/components/site/event-card";
import { isLocale, type Locale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { getProvinceBySlug } from "@/lib/provinces";
import { getPublicEvents } from "@/lib/public-events";

type Props = { params: Promise<{ locale: string; province: string }> };
export const dynamic = "force-dynamic";

const getListing = cache(async (slug: string, locale: Locale) => {
  const province = getProvinceBySlug(slug);
  if (!province) return null;
  const [towns, events] = await Promise.all([
    prisma.comune.findMany({ where: { provinceCode: province.code }, select: { name: true, slug: true }, orderBy: { name: "asc" } }),
    getPublicEvents({ provinceCode: province.code, locale }),
  ]);
  return { province, towns, events };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, province: slug } = await params;
  const listing = await getListing(slug, isLocale(locale) ? locale : "it");
  if (!listing) return { robots: { index: false, follow: false } };
  const english = locale === "en";
  const title = english ? `Events in ${listing.province.name}` : `Eventi in provincia di ${listing.province.name}`;
  const description = english ? `Explore events and towns in the province of ${listing.province.name}, Sardinia.` : `Scopri eventi e comuni della provincia di ${listing.province.name}, in Sardegna.`;
  const canonical = `/${locale}/events/province/${slug}`;
  return { title, description, alternates: { canonical, languages: { it: `/it/events/province/${slug}`, en: `/en/events/province/${slug}` } }, openGraph: { title, description, url: canonical } };
}

export default async function ProvincePage({ params }: Props) {
  const { locale: language, province: slug } = await params;
  const locale = isLocale(language) ? language : "it";
  const english = locale === "en";
  const listing = await getListing(slug, locale);
  if (!listing) notFound();
  const { province, towns, events } = listing;
  const now = Date.now();
  const upcoming = events.filter((event) => event.dates.some((date) => new Date(date.endsAt ?? date.startsAt).getTime() >= now));
  const past = events.filter((event) => !upcoming.includes(event));

  return (
    <main className="min-h-[70vh] bg-[#f6f7f4] px-5 py-9 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav aria-label={english ? "Breadcrumb" : "Percorso"} className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
          <Link href={`/${locale}`} className="hover:text-sea">Home</Link><span aria-hidden="true">/</span><Link href={`/${locale}/events/province`} className="hover:text-sea">{english ? "Provinces" : "Province"}</Link><span aria-hidden="true">/</span><span aria-current="page" className="text-ink">{province.name}</span>
        </nav>
        <section className="relative mt-6 overflow-hidden rounded-[28px] bg-[#082848] px-6 py-10 text-white md:px-10 md:py-12">
          <div aria-hidden="true" className="absolute -right-12 -top-28 size-80 rounded-full border-[42px] border-white/5" />
          <div className="relative max-w-3xl">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.17em] text-teal-200"><MapPin size={14} /> {english ? "Province" : "Provincia"} · {province.code}</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-.05em] md:text-5xl">{province.name}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-100/80">{english ? `Discover events and explore ${towns.length} towns in this territory.` : `Scopri gli eventi ed esplora i ${towns.length} comuni di questo territorio.`}</p>
          </div>
        </section>
        <section className="mt-10" aria-labelledby="province-events">
          <h2 id="province-events" className="font-display text-2xl font-semibold tracking-[-.035em] text-ink">{english ? "Upcoming events" : "Eventi in programma"}</h2>
          {upcoming.length ? <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{upcoming.map((event) => <EventCard key={event.id} event={event} locale={locale} />)}</div> : <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-muted">{english ? "There are no upcoming events in this province yet." : "Non ci sono ancora eventi in programma in questa provincia."}</p>}
        </section>
        {past.length > 0 && <section className="mt-10" aria-labelledby="past-events"><h2 id="past-events" className="font-display text-2xl font-semibold tracking-[-.035em] text-ink">{english ? "Past events" : "Eventi passati"}</h2><div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{past.map((event) => <EventCard key={event.id} event={event} locale={locale} />)}</div></section>}
        <section className="mt-12" aria-labelledby="province-towns">
          <p className="text-[11px] font-bold uppercase tracking-[.17em] text-sea">{english ? "Explore the territory" : "Esplora il territorio"}</p>
          <h2 id="province-towns" className="mt-2 font-display text-2xl font-semibold tracking-[-.035em] text-ink">{english ? `Towns in ${province.name}` : `I comuni della provincia di ${province.name}`}</h2>
          <ul className="mt-5 columns-1 gap-x-8 rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:columns-2 sm:px-7 lg:columns-3 xl:columns-4">
            {towns.map((town) => <li key={town.slug} className="break-inside-avoid"><Link href={`/${locale}/events/city/${town.slug}`} prefetch={false} className="focus-ring block rounded py-2 text-sm text-ink hover:text-sea hover:underline">{town.name}</Link></li>)}
          </ul>
        </section>
      </div>
    </main>
  );
}
