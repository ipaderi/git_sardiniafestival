import { dictionary, interpolate } from "@/lib/dictionary";
import publicIt from "@/messages/it/public.json";
import publicEn from "@/messages/en/public.json";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronDown, Clock, ExternalLink, Globe2, MapPin, Ticket } from "lucide-react";
import { EventMap, type EventMapMarker } from "@/components/site/event-map";
import { EventProgramme, type ProgrammeItem } from "@/components/site/event-programme";
import { prisma } from "@/lib/prisma";
import { categoryName, eventCategories, slugifyCategory } from "@/lib/event-categories";
import { isLocale, type Locale } from "@/lib/i18n";
import { cache } from "react";
import { getLocalizedDescription } from "@/lib/localized-text";
import { dateBadge, formatDaySpan, monthHeading, occurrenceDetail, occurrenceStatus, occurrenceTimes, occurrenceWhen, splitLongText } from "@/lib/event-occurrences";

type Props = { params: Promise<{ locale: string; slug: string }> };
export const dynamic = "force-dynamic";

const findEvent = cache(async (slug: string) => {
  try {
    return await prisma.event.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: {
        comune: { select: { slug: true, latitude: true, longitude: true } },
        dates: { include: { comune: { select: { slug: true, latitude: true, longitude: true } } }, orderBy: [{ startsAt: "asc" }, { sortOrder: "asc" }] },
        images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        pois: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      },
    });
  } catch { /* The detail page remains empty when the database is unavailable. */ }
  return null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: language, slug } = await params;
  const locale = isLocale(language) ? language : "it";
  const event = await findEvent(slug);
  if (!event) return { title: dictionary(locale, publicIt, publicEn).eventNotFound, robots: { index: false } };
  const title = locale === "en" ? event.titleEn?.trim() || event.title : event.title;
  const englishDescription = getLocalizedDescription(event.description, event.descriptionTranslations, "en");
  const description = getLocalizedDescription(event.description, event.descriptionTranslations, locale).slice(0, 155);
  const coverImage = event.images.find((item) => item.isCover);
  const image = safeImageUrl(event.image) || (coverImage ? `/api/images/${encodeURIComponent(coverImage.id)}` : null);
  const canonical = `/${locale}/event/${slug}`;
  const translated = Boolean(event.titleEn?.trim() && englishDescription.trim());
  return { title, description, alternates: { canonical, languages: translated ? { it: `/it/event/${slug}`, en: `/en/event/${slug}` } : { it: `/it/event/${slug}` } }, robots: { index: locale !== "en" || translated, follow: true }, openGraph: { title, description, url: canonical, images: image ? [image] : [] } };
}

function safeExternalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch { return null; }
}

function safeImageUrl(value: string | null) {
  if (value?.startsWith("/api/images/") && /^\/api\/images\/[a-zA-Z0-9_-]+$/.test(value)) return value;
  return safeExternalUrl(value);
}

export default async function EventDetailPage({ params }: Props) {
  const { locale: language, slug } = await params;
  const locale = isLocale(language) ? language : "it";
  const english = locale === "en";
  const event = await findEvent(slug);
  if (!event) notFound();
  const title = english ? event.titleEn?.trim() || event.title : event.title;
  const description = getLocalizedDescription(event.description, event.descriptionTranslations, locale);
  const online = event.eventType === "ONLINE";
  const multiLocation = event.eventType === "MULTI_LOCATION";
  const onlineUrl = online ? safeExternalUrl(event.onlineUrl) : null;
  const website = safeExternalUrl(event.website);
  const gallery = event.images.map((image) => ({ id: image.id, url: `/api/images/${encodeURIComponent(image.id)}`, alt: (english ? image.altEn || image.alt : image.alt) || (interpolate(dictionary(locale, publicIt, publicEn).imageOf, { name: title })), isCover: image.isCover }));
  const pois = event.pois.map((poi) => ({ ...poi, name: english ? poi.nameEn || poi.name : poi.name, description: getLocalizedDescription(poi.description, poi.descriptionTranslations, locale) }));
  const price = (english ? event.priceEn || event.price : event.price) || (dictionary(locale, publicIt, publicEn).detailsOnWebsite);
  const cover = safeImageUrl(event.image) || gallery.find((image) => image.isCover)?.url || null;
  const dates = event.dates.length ? event.dates : [{
    id: "principale", startsAt: event.startsAt, endsAt: event.endsAt, label: null, labelEn: null,
    city: event.location, province: event.province, venue: event.venue, address: event.address,
    latitude: event.latitude, longitude: event.longitude, comune: event.comune,
  }];
  const locationFor = (date: typeof dates[number]) => ({
    city: (multiLocation ? date.city : event.location) || "",
    province: (multiLocation ? date.province : event.province) || "",
    venue: (multiLocation ? date.venue : event.venue) || "",
    address: multiLocation ? date.address : event.address,
    latitude: multiLocation ? date.latitude : event.latitude,
    longitude: multiLocation ? date.longitude : event.longitude,
    citySlug: multiLocation ? date.comune?.slug : event.comune?.slug,
    comuneLatitude: multiLocation ? date.comune?.latitude : event.comune?.latitude,
    comuneLongitude: multiLocation ? date.comune?.longitude : event.comune?.longitude,
  });
  const places = online ? [] : dates.map(locationFor);
  const uniquePlaces = places.filter((place, index) => places.findIndex((other) =>
    other.venue === place.venue && other.city === place.city && other.address === place.address && other.latitude === place.latitude && other.longitude === place.longitude
  ) === index);
  const towns = [...new Map(places.filter((place) => place.city).map((place) => [place.city, place] as const)).values()];
  const mapsUrl = (place: { venue: string; address: string | null; city: string; province: string }) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([place.venue, place.address, place.city, place.province, "Italia"].filter(Boolean).join(", "))}`;
  const placeLine = (place: { venue: string; address: string | null; city: string; province: string }, withVenue = true) => [withVenue ? place.venue : "", place.address, place.city && place.province ? `${place.city} (${place.province})` : place.city].filter(Boolean).join(" · ");

  const dateLocale = english ? "en-GB" : "it-IT";
  const now = new Date();
  const timeline = dates.map((date, index) => {
    const when = occurrenceWhen(date.startsAt, date.endsAt);
    return { date, index, when, status: occurrenceStatus(when, now), place: locationFor(date), label: (english ? date.labelEn || date.label : date.label) || "" };
  });
  const ongoing = timeline.filter((item) => item.status === "ongoing");
  const next = timeline.find((item) => item.status === "upcoming");
  const concluded = timeline.every((item) => item.status === "past");
  const firstDay = timeline.reduce((value, item) => item.when.startDay < value ? item.when.startDay : value, timeline[0].when.startDay);
  const lastDay = timeline.reduce((value, item) => item.when.endDay > value ? item.when.endDay : value, timeline[0].when.endDay);
  const span = formatDaySpan(firstDay, lastDay, dateLocale);
  const itemTitle = (item: typeof timeline[number]) => item.label || (multiLocation ? item.place.venue || item.place.city : "") || formatDaySpan(item.when.startDay, item.when.endDay, dateLocale);
  const programme: ProgrammeItem[] = timeline.map((item) => {
    const badge = dateBadge(item.when, dateLocale);
    const title = itemTitle(item);
    return {
      anchor: `data-${item.index + 1}`, status: item.status, isNext: item === next, badgeTop: badge.top, badgeBottom: badge.bottom,
      monthKey: item.when.startDay.slice(0, 7), monthLabel: monthHeading(item.when.startDay, dateLocale), title, detail: occurrenceDetail(item.when, dateLocale),
      place: multiLocation ? placeLine(item.place, item.place.venue !== title) : "", town: multiLocation ? item.place.city : "", mapsUrl: multiLocation && item.place.city ? mapsUrl(item.place) : null,
    };
  });
  // The map shows what can still be attended, and a town's centre where no exact venue position is known.
  const mapTimeline = multiLocation ? (concluded ? timeline : timeline.filter((item) => item.status !== "past")) : online ? [] : timeline.slice(0, 1);
  const mapMarkers: EventMapMarker[] = mapTimeline.flatMap((item) => {
    const exact = item.place.latitude != null && item.place.longitude != null;
    const latitude = exact ? item.place.latitude : item.place.comuneLatitude;
    const longitude = exact ? item.place.longitude : item.place.comuneLongitude;
    if (latitude == null || longitude == null) return [];
    const badge = dateBadge(item.when, dateLocale);
    return [{ id: `data-${item.index + 1}`, title: multiLocation ? itemTitle(item) : item.place.venue || title, place: [multiLocation ? `${badge.top} ${badge.bottom}` : "", placeLine(item.place, multiLocation && item.place.venue !== itemTitle(item))].filter(Boolean).join(" · "), href: multiLocation ? `#data-${item.index + 1}` : "#dove", latitude, longitude, approximate: !exact }];
  });
  const hasApproximateMarkers = mapMarkers.some((marker) => marker.approximate);
  mapMarkers.push(...pois.flatMap((poi) => poi.latitude !== null && poi.longitude !== null
    ? [{ id: `poi-${poi.id}`, title: poi.name, place: poi.address || "", href: `#poi-${poi.id}`, latitude: poi.latitude, longitude: poi.longitude, kind: "poi" as const }]
    : []));
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://sardiniafestival.com").replace(/\/+$/, "");
  const eventUrl = `${site}/${locale}/event/${event.slug}`;
  // Each occurrence has its own dates and venue. Online links are public only after approval.
  const schemas = dates.map((date, index) => {
    const place = locationFor(date);
    return {
      "@type": "Event", "@id": `${eventUrl}#data-${index + 1}`, url: eventUrl,
      name: timeline[index].label ? `${title}: ${timeline[index].label}` : title, description, inLanguage: locale,
      // Without a real time, schema.org dates must not claim that the event starts at midnight.
      startDate: timeline[index].when.allDay ? timeline[index].when.startDay : date.startsAt.toISOString(),
      ...(timeline[index].when.allDay ? { endDate: timeline[index].when.endDay } : date.endsAt ? { endDate: date.endsAt.toISOString() } : {}),
      ...(cover ? { image: new URL(cover, site).href } : {}),
      eventAttendanceMode: `https://schema.org/${online ? "OnlineEventAttendanceMode" : "OfflineEventAttendanceMode"}`,
      location: online ? { "@type": "VirtualLocation", ...(onlineUrl ? { url: onlineUrl } : {}) } : {
        "@type": "Place", name: place.venue,
        address: { "@type": "PostalAddress", ...(place.address ? { streetAddress: place.address } : {}), addressLocality: place.city, addressRegion: place.province, addressCountry: "IT" },
      },
    };
  });
  const typeLabel = ({ SINGLE_DAY: dictionary(locale, publicIt, publicEn).eventTypeSingle, MULTI_DAY: dictionary(locale, publicIt, publicEn).eventTypeMultiDay, MULTI_LOCATION: dictionary(locale, publicIt, publicEn).eventTypeMultiLocation, ONLINE: dictionary(locale, publicIt, publicEn).eventTypeOnline })[event.eventType];
  const knownCategory = eventCategories.find((category) => category.name.toLocaleLowerCase("it-IT") === event.category.toLocaleLowerCase("it-IT"));
  const t = dictionary(locale, publicIt, publicEn);
  const { intro, rest } = splitLongText(description);
  const whenDetail = dates.length > 1 ? `${dates.length} ${t.dates}` : occurrenceTimes(timeline[0].when);
  const townNames = towns.map((town) => town.city);
  const whereTitle = online ? t.onlineEvent : multiLocation ? `${towns.length} ${towns.length === 1 ? t.townOne : t.towns}` : event.venue || event.location || "";
  const whereDetail = online ? "" : multiLocation ? (townNames.length > 3 ? `${townNames.slice(0, 3).join(", ")} ${interpolate(t.andOthers, { count: townNames.length - 3 })}` : townNames.join(", ")) : event.venue ? placeLine({ venue: "", address: null, city: event.location || "", province: event.province || "" }) : "";
  const callToAction = (className: string) => onlineUrl ? <a href={onlineUrl} target="_blank" rel="noopener noreferrer" className={className}>{t.joinOnline} <ExternalLink size={16} /></a> : website ? <a href={website} target="_blank" rel="noopener noreferrer" className={className}>{t.ticketsAndDetails} <ExternalLink size={16} /></a> : <a href="mailto:ciao@sardiniafestival.com?subject=Info%20evento" className={className}><Ticket size={17} /> {t.askForInformation}</a>;
  const ctaClass = "focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-sea-bright font-semibold text-ink hover:bg-[#4bd0c2]";

  return (
    <main className="pb-16">
      <div className="mx-auto max-w-7xl px-5 pt-7 lg:px-8"><Link href={`/${locale}/events`} className="focus-ring inline-flex items-center gap-2 rounded text-sm font-semibold text-muted hover:text-sea"><ArrowLeft size={16} /> {dictionary(locale, publicIt, publicEn).backToEvents}</Link></div>
      <div className="mx-auto mt-5 grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-8 px-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,.7fr)] lg:px-8">
        <article>
          <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b4560] via-[#087c78] to-[#e0a776] ${cover ? "aspect-[1.85/1]" : "h-28 sm:h-36"}`}><span className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,.28),transparent_28%)]" />{cover && <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />}{knownCategory ? <Link href={`/${locale}/events/category/${slugifyCategory(knownCategory.name)}`} className="focus-ring absolute bottom-4 left-4 rounded-full bg-white/95 px-4 py-2 text-xs font-bold uppercase tracking-[.12em] text-sea">{categoryName(event.category, locale)}</Link> : <span className="absolute bottom-4 left-4 rounded-full bg-white/95 px-4 py-2 text-xs font-bold uppercase tracking-[.12em] text-sea">{categoryName(event.category, locale)}</span>}</div>
          <div className="mt-7">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-coral">{typeLabel}</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-.045em] text-ink md:text-5xl">{title}</h1>
          </div>
          {concluded && <p className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-ink-soft">{t.eventEnded}</p>}
          <dl className={`mt-5 grid gap-3 ${dates.length > 1 && !concluded ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            <div className="rounded-2xl bg-[#f2f1eb] p-4"><dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.1em] text-muted"><CalendarDays size={13} aria-hidden /> {t.when}</dt><dd className="mt-1.5 text-sm font-semibold text-ink first-letter:uppercase">{span}</dd>{whenDetail && <dd className="mt-0.5 text-xs text-muted">{whenDetail}</dd>}</div>
            <div className="rounded-2xl bg-[#f2f1eb] p-4"><dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.1em] text-muted">{online ? <Globe2 size={13} aria-hidden /> : <MapPin size={13} aria-hidden />} {t.where}</dt><dd className="mt-1.5 text-sm font-semibold text-ink">{whereTitle}</dd>{whereDetail && <dd className="mt-0.5 text-xs text-muted">{whereDetail}</dd>}</div>
            {dates.length > 1 && !concluded && <div className="rounded-2xl bg-[#e7f5f2] p-4"><dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.1em] text-sea"><Clock size={13} aria-hidden /> {next ? t.nextOccurrence : t.happeningNow}</dt>{(() => { const item = next ?? ongoing[0]; const badge = dateBadge(item.when, dateLocale); return <><dd className="mt-1.5 text-sm font-semibold text-ink"><a href={`#data-${item.index + 1}`} className="focus-ring rounded hover:text-sea">{itemTitle(item)}</a></dd><dd className="mt-0.5 text-xs text-muted">{badge.top} {badge.bottom}{multiLocation && item.place.city ? ` · ${item.place.city}` : ""}</dd></>; })()}{next && ongoing.length > 0 && <dd className="mt-1.5 border-t border-teal-200/60 pt-1.5 text-xs text-ink-soft"><span className="font-semibold">{t.happeningNow}:</span> <a href={`#data-${ongoing[0].index + 1}`} className="focus-ring rounded hover:text-sea">{itemTitle(ongoing[0])}</a></dd>}</div>}
          </dl>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 lg:hidden"><p className="min-w-0 text-sm font-semibold text-ink">{price}</p><div className="text-sm font-semibold">{callToAction(`${ctaClass} h-11 px-5`)}</div></div>
          <div className="mt-8 max-w-3xl border-t border-slate-200 pt-7"><h2 className="font-display text-xl font-semibold text-ink">{t.aboutTheEvent}</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink-soft/85">{intro}</p>{rest && <details className="group mt-2"><summary className="focus-ring inline-flex cursor-pointer list-none items-center gap-1 rounded text-sm font-bold text-sea hover:text-ink group-open:hidden [&::-webkit-details-marker]:hidden">{t.readMore} <ChevronDown size={15} aria-hidden /></summary><p className="whitespace-pre-line text-sm leading-7 text-ink-soft/85">{rest}</p></details>}</div>
          {dates.length > 1 && <EventProgramme items={programme} locale={locale} />}
          {online && <section className="mt-8 rounded-2xl border border-slate-200 p-5"><h2 className="flex items-center gap-2 font-semibold text-ink"><Globe2 size={19} className="text-sea" /> {t.joinOnline}</h2><p className="mt-2 text-sm text-muted">{t.thisEventTakesPlaceOnline}</p>{onlineUrl && <a href={onlineUrl} target="_blank" rel="noopener noreferrer" className="focus-ring mt-3 inline-flex items-center gap-2 rounded text-sm font-bold text-sea hover:text-ink">{t.openEventLink} <ExternalLink size={15} /></a>}</section>}
          {!online && !multiLocation && uniquePlaces[0] && <section id="dove" className="mt-8 scroll-mt-6" aria-labelledby="sedi-title">
            <h2 id="sedi-title" className="font-display text-xl font-semibold text-ink">{t.locationOne}</h2>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="flex items-start gap-2 text-sm font-semibold text-ink"><MapPin size={17} aria-hidden className="mt-0.5 shrink-0 text-sea" />{placeLine(uniquePlaces[0])}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-sea"><a href={mapsUrl(uniquePlaces[0])} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-ink">{t.openInGoogleMaps} <ExternalLink size={13} /></a>{uniquePlaces[0].citySlug && <Link href={`/${locale}/events/city/${uniquePlaces[0].citySlug}`} className="hover:text-ink">{interpolate(t.eventsInCity, { city: uniquePlaces[0].city })}</Link>}{uniquePlaces[0].citySlug && knownCategory && <Link href={`/${locale}/events/city/${uniquePlaces[0].citySlug}/${slugifyCategory(knownCategory.name)}`} className="hover:text-ink">{interpolate(t.categoryInCity, { category: categoryName(knownCategory.name, locale), city: uniquePlaces[0].city })}</Link>}</div>
            </div>
          </section>}
          {mapMarkers.length > 0 && <div className="mt-4"><div className="overflow-hidden rounded-2xl"><EventMap markers={mapMarkers} locale={locale} className="h-80 w-full" /></div>{hasApproximateMarkers && <p className="mt-2 text-xs text-muted">{t.mapApproximateNote}</p>}</div>}
          {pois.length > 0 && <section className="mt-8" aria-labelledby="poi-title"><h2 id="poi-title" className="font-display text-xl font-semibold text-ink">{dictionary(locale, publicIt, publicEn).pointsOfInterest}</h2><ul className="mt-4 space-y-3">{pois.map((poi) => <li key={poi.id} id={`poi-${poi.id}`} className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="flex items-start gap-2 text-sm font-semibold text-ink"><MapPin size={17} className="mt-0.5 shrink-0 text-sea" />{poi.name}</h3>{poi.address && <p className="mt-2 text-sm text-muted">{poi.address}</p>}{poi.description && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink-soft/85">{poi.description}</p>}{poi.latitude !== null && poi.longitude !== null && <a href={`https://www.google.com/maps/search/?api=1&query=${poi.latitude},${poi.longitude}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sea hover:text-ink">{dictionary(locale, publicIt, publicEn).openInGoogleMaps} <ExternalLink size={13} /></a>}</li>)}</ul></section>}
          {gallery.length > 0 && <section className="mt-8" aria-labelledby="gallery-title"><h2 id="gallery-title" className="font-display text-xl font-semibold text-ink">{t.gallery}</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{gallery.map((image) => <a key={image.id} href={image.url} target="_blank" rel="noopener noreferrer" className="focus-ring overflow-hidden rounded-xl bg-slate-100"><img src={image.url} alt={image.alt} loading="lazy" className="aspect-[4/3] h-full w-full object-cover transition duration-300 hover:scale-105" /></a>)}</div></section>}
          {multiLocation && towns.some((town) => town.citySlug) && <section className="mt-8" aria-labelledby="towns-title"><h2 id="towns-title" className="font-display text-xl font-semibold text-ink">{t.exploreTheTowns}</h2><ul className="mt-4 grid gap-2 sm:grid-cols-2">{towns.filter((town) => town.citySlug).map((town) => <li key={town.city} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3"><p className="text-sm font-semibold text-ink">{town.city}</p><p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-sea"><Link href={`/${locale}/events/city/${town.citySlug}`} className="hover:text-ink">{interpolate(t.eventsInCity, { city: town.city })}</Link>{knownCategory && <Link href={`/${locale}/events/city/${town.citySlug}/${slugifyCategory(knownCategory.name)}`} className="hover:text-ink">{interpolate(t.categoryInCity, { category: categoryName(knownCategory.name, locale), city: town.city })}</Link>}</p></li>)}</ul></section>}
        </article>
        <aside className="lg:sticky lg:top-7 lg:self-start"><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(8,40,72,.06)]"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-sea">{dictionary(locale, publicIt, publicEn).takePart}</p><p className="mt-2 font-display text-2xl font-semibold text-ink">{price}</p><p className="mt-1 text-xs text-muted">{dictionary(locale, publicIt, publicEn).pricesMayVaryByDateAndAvailability}</p><div className="mt-5 grid text-base font-semibold">{callToAction(`${ctaClass} h-14 px-7`)}</div><p className="mt-4 text-center text-[11px] leading-5 text-muted">{dictionary(locale, publicIt, publicEn).organiserDisclaimer}</p></div><div className="mt-4 rounded-2xl bg-[#e7f5f2] p-5"><h2 className="font-display text-lg font-semibold text-ink">{dictionary(locale, publicIt, publicEn).haveAnotherEventToShare}</h2><p className="mt-2 text-xs leading-5 text-ink-soft/75">{dictionary(locale, publicIt, publicEn).submitEventDescription}</p><Link href={`/${locale}/dashboard/crea-evento`} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-sea">{dictionary(locale, publicIt, publicEn).submitAnEvent} <ArrowLeft size={14} className="rotate-180" /></Link></div></aside>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": schemas }).replace(/</g, "\\u003c") }} />
    </main>
  );
}
