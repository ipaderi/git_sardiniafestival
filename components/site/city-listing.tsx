import { dictionary, interpolate } from "@/lib/dictionary";
import publicIt from "@/messages/it/public.json";
import publicEn from "@/messages/en/public.json";
import Link from "next/link";
import { EventCard } from "@/components/site/event-card";
import { categoryName, eventCategories, slugifyCategory } from "@/lib/event-categories";
import type { FestivalEvent } from "@/lib/public-events";
import { getProvinceByCode } from "@/lib/provinces";

export function CityListing({ locale, city, events, allEvents = events, selectedCategory }: { locale: string; city: { name: string; slug: string; provinceName: string; provinceCode: string }; events: FestivalEvent[]; allEvents?: FestivalEvent[]; selectedCategory?: string }) {
  const province = getProvinceByCode(city.provinceCode);
  const now = Date.now();
  const upcoming = events.filter((event) => event.dates.some((date) => new Date(date.endsAt || date.startsAt).getTime() >= now));
  const past = events.filter((event) => !upcoming.includes(event));
  return <main className="min-h-[70vh] bg-[#f6f7f4] px-5 py-9 lg:px-8"><div className="mx-auto max-w-7xl">
    <nav aria-label={dictionary(locale, publicIt, publicEn).breadcrumb} className="flex flex-wrap gap-2 text-xs font-semibold text-muted"><Link href={`/${locale}`}>Home</Link><span>/</span><Link href={`/${locale}/events/city`}>{dictionary(locale, publicIt, publicEn).townsHeading}</Link><span>/</span>{selectedCategory ? <><Link href={`/${locale}/events/city/${city.slug}`}>{city.name}</Link><span>/</span><span aria-current="page">{categoryName(selectedCategory, locale)}</span></> : <span aria-current="page">{city.name}</span>}</nav>
    <div className="mt-6 rounded-[28px] bg-[#082848] px-6 py-9 text-white md:px-10"><p className="text-[11px] font-bold uppercase tracking-[.17em] text-teal-200">{province ? <Link href={`/${locale}/events/province/${province.slug}`} className="hover:underline">{city.provinceName}</Link> : city.provinceName}</p><h1 className="mt-3 font-display text-4xl font-semibold tracking-[-.05em]">{selectedCategory ? interpolate(dictionary(locale, publicIt, publicEn).categoryInCity, { category: categoryName(selectedCategory, locale), city: city.name }) : interpolate(dictionary(locale, publicIt, publicEn).eventsInCity, { city: city.name })}</h1><p className="mt-3 text-sm text-blue-100/75">{dictionary(locale, publicIt, publicEn).exploreLocalEventsAndPastEditions}</p></div>
    <section className="mt-8"><h2 className="font-display text-2xl font-semibold text-ink">{dictionary(locale, publicIt, publicEn).browseByCategory}</h2><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{eventCategories.map((category) => { const count = allEvents.filter((event) => event.category.toLowerCase() === category.name.toLowerCase()).length; return <Link key={category.name} href={`/${locale}/events/city/${city.slug}/${slugifyCategory(category.name)}`} className={`rounded-xl border px-4 py-3 text-sm font-semibold ${selectedCategory === category.name ? "border-sea bg-[#e7f5f2] text-sea" : "border-slate-200 bg-white text-ink"}`}><span>{categoryName(category.name, locale)}</span><span className="float-right text-xs text-muted">{count}</span></Link>; })}</div>{selectedCategory && <Link className="mt-4 inline-block text-sm font-bold text-sea" href={`/${locale}/events/city/${city.slug}`}>{dictionary(locale, publicIt, publicEn).allEventsIn} {city.name}</Link>}</section>
    <section className="mt-9"><h2 className="font-display text-2xl font-semibold text-ink">{dictionary(locale, publicIt, publicEn).cityUpcomingEvents}</h2>{upcoming.length ? <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{upcoming.map((event) => <EventCard key={event.id} event={event} locale={locale} />)}</div> : <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-muted">{dictionary(locale, publicIt, publicEn).emptyCityEvents}</p>}</section>
    {past.length > 0 && <section className="mt-10"><h2 className="font-display text-2xl font-semibold text-ink">{dictionary(locale, publicIt, publicEn).pastEvents}</h2><div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{past.map((event) => <EventCard key={event.id} event={event} locale={locale} />)}</div></section>}
  </div></main>;
}
