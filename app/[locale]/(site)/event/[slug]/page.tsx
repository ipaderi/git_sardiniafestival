import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ExternalLink, Globe2, MapPin, Ticket } from "lucide-react";
import { EventMap, type EventMapMarker } from "@/components/site/event-map";
import { prisma } from "@/lib/prisma";
import { categoryName, eventCategories, slugifyCategory } from "@/lib/event-categories";
import { isLocale, type Locale } from "@/lib/i18n";
import { cache } from "react";

type Props = { params: Promise<{ locale: string; slug: string }> };
export const dynamic = "force-dynamic";

const findEvent = cache(async (slug: string) => {
  try {
    return await prisma.event.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: {
        comune: { select: { slug: true } },
        dates: { include: { comune: { select: { slug: true } } }, orderBy: [{ startsAt: "asc" }, { sortOrder: "asc" }] },
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
  if (!event) return { title: locale === "en" ? "Event not found" : "Evento non trovato", robots: { index: false } };
  const title = locale === "en" ? event.titleEn?.trim() || event.title : event.title;
  const description = (locale === "en" ? event.descriptionEn?.trim() || event.description : event.description).slice(0, 155);
  const coverImage = event.images.find((item) => item.isCover);
  const image = safeImageUrl(event.image) || (coverImage ? `/api/images/${encodeURIComponent(coverImage.id)}` : null);
  const canonical = `/${locale}/event/${slug}`;
  const translated = Boolean(event.titleEn?.trim() && event.descriptionEn?.trim());
  return { title, description, alternates: { canonical, languages: translated ? { it: `/it/event/${slug}`, en: `/en/event/${slug}` } : { it: `/it/event/${slug}` } }, robots: { index: locale !== "en" || translated, follow: true }, openGraph: { title, description, url: canonical, images: image ? [image] : [] } };
}

function displayDate(value: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }).format(value);
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
  const description = english ? event.descriptionEn?.trim() || event.description : event.description;
  const online = event.eventType === "ONLINE";
  const multiLocation = event.eventType === "MULTI_LOCATION";
  const onlineUrl = online ? safeExternalUrl(event.onlineUrl) : null;
  const website = safeExternalUrl(event.website);
  const gallery = event.images.map((image) => ({ id: image.id, url: `/api/images/${encodeURIComponent(image.id)}`, alt: (english ? image.altEn || image.alt : image.alt) || (english ? `Image of ${title}` : `Immagine di ${title}`), isCover: image.isCover }));
  const pois = event.pois.map((poi) => ({ ...poi, name: english ? poi.nameEn || poi.name : poi.name, description: english ? poi.descriptionEn || poi.description : poi.description }));
  const price = (english ? event.priceEn || event.price : event.price) || (english ? "Details on website" : "Dettagli sul sito");
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
  });
  const places = online ? [] : dates.map(locationFor);
  const uniquePlaces = places.filter((place, index) => places.findIndex((other) =>
    other.venue === place.venue && other.city === place.city && other.address === place.address && other.latitude === place.latitude && other.longitude === place.longitude
  ) === index);
  const mapMarkers: EventMapMarker[] = uniquePlaces.flatMap((place, index) =>
    place.latitude !== null && place.longitude !== null
      ? [{ id: `sede-${index}`, title: place.venue || title, place: [place.address, place.city].filter(Boolean).join(", "), href: `#sede-${index}`, latitude: place.latitude, longitude: place.longitude }]
      : []
  );
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
      name: title, description, inLanguage: locale, startDate: date.startsAt.toISOString(),
      ...(date.endsAt ? { endDate: date.endsAt.toISOString() } : {}),
      ...(cover ? { image: new URL(cover, site).href } : {}),
      eventAttendanceMode: `https://schema.org/${online ? "OnlineEventAttendanceMode" : "OfflineEventAttendanceMode"}`,
      location: online ? { "@type": "VirtualLocation", ...(onlineUrl ? { url: onlineUrl } : {}) } : {
        "@type": "Place", name: place.venue,
        address: { "@type": "PostalAddress", ...(place.address ? { streetAddress: place.address } : {}), addressLocality: place.city, addressRegion: place.province, addressCountry: "IT" },
      },
    };
  });
  const dateHeading = dates.length === 1 ? displayDate(dates[0].startsAt, locale) : `${dates.length} ${english ? "dates" : "appuntamenti"}`;
  const typeLabel = (english ? { SINGLE_DAY: "Single-day event", MULTI_DAY: "Multi-day event", MULTI_LOCATION: "Multi-day and multi-location event", ONLINE: "Online event" } : { SINGLE_DAY: "Evento di un giorno", MULTI_DAY: "Evento su più giorni", MULTI_LOCATION: "Evento su più giorni e sedi", ONLINE: "Evento online" })[event.eventType];
  const knownCategory = eventCategories.find((category) => category.name.toLocaleLowerCase("it-IT") === event.category.toLocaleLowerCase("it-IT"));

  return (
    <main className="pb-16">
      <div className="mx-auto max-w-7xl px-5 pt-7 lg:px-8"><Link href={`/${locale}/events`} className="focus-ring inline-flex items-center gap-2 rounded text-sm font-semibold text-muted hover:text-sea"><ArrowLeft size={16} /> {english ? "Back to events" : "Torna agli eventi"}</Link></div>
      <div className="mx-auto mt-5 grid max-w-7xl gap-8 px-5 lg:grid-cols-[1.3fr_.7fr] lg:px-8">
        <article>
          <div className="relative aspect-[1.85/1] overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b4560] via-[#087c78] to-[#e0a776]"><span className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,.28),transparent_28%)]" />{cover && <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />}{knownCategory ? <Link href={`/${locale}/events/category/${slugifyCategory(knownCategory.name)}`} className="focus-ring absolute bottom-4 left-4 rounded-full bg-white/95 px-4 py-2 text-xs font-bold uppercase tracking-[.12em] text-sea">{categoryName(event.category, locale)}</Link> : <span className="absolute bottom-4 left-4 rounded-full bg-white/95 px-4 py-2 text-xs font-bold uppercase tracking-[.12em] text-sea">{categoryName(event.category, locale)}</span>}</div>
          <div className="mt-7">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-coral">{dateHeading}</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-.045em] text-ink md:text-5xl">{title}</h1>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[.1em] text-sea">{typeLabel}</p>
            <p className="mt-4 flex items-center gap-2 text-sm text-muted">{online ? <><Globe2 size={16} className="text-sea" /> {english ? "Online event" : "Evento online"}</> : <><MapPin size={16} className="text-sea" />{multiLocation ? `${uniquePlaces.length} ${english ? (uniquePlaces.length === 1 ? "venue" : "venues") : (uniquePlaces.length === 1 ? "sede" : "sedi")}` : [event.venue, event.location, event.province && `(${event.province})`].filter(Boolean).join(" ")}</>}</p>
          </div>
          <div className="mt-8 max-w-3xl border-t border-slate-200 pt-7"><h2 className="font-display text-xl font-semibold text-ink">{english ? "About the event" : "L’evento"}</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink-soft/85">{description}</p></div>
          {gallery.length > 0 && <section className="mt-8" aria-labelledby="gallery-title"><h2 id="gallery-title" className="font-display text-xl font-semibold text-ink">{english ? "Gallery" : "Galleria"}</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{gallery.map((image) => <a key={image.id} href={image.url} target="_blank" rel="noopener noreferrer" className="focus-ring overflow-hidden rounded-xl bg-slate-100"><img src={image.url} alt={image.alt} loading="lazy" className="aspect-[4/3] h-full w-full object-cover transition duration-300 hover:scale-105" /></a>)}</div></section>}
          <section className="mt-8 rounded-2xl bg-[#f2f1eb] p-5" aria-labelledby="date-title">
            <div className="flex items-center gap-3"><CalendarDays size={19} className="text-sea" /><h2 id="date-title" className="font-semibold text-ink">{english ? (dates.length === 1 ? "Date and time" : "Dates and times") : (dates.length === 1 ? "Data e orario" : "Date e orari")}</h2></div>
            <ol className="mt-4 space-y-4">
              {dates.map((date, index) => {
                const place = locationFor(date);
                return <li key={date.id} id={`data-${index + 1}`} className="border-t border-slate-200/80 pt-3 text-sm text-muted">
                  {(english ? date.labelEn || date.label : date.label) && <p className="mb-1 font-semibold text-ink">{english ? date.labelEn || date.label : date.label}</p>}
                  <p><span className="font-semibold text-ink">{english ? "Starts:" : "Inizio:"}</span> {displayDate(date.startsAt, locale)}</p>
                  {date.endsAt && <p className="mt-1"><span className="font-semibold text-ink">{english ? "Ends:" : "Fine:"}</span> {displayDate(date.endsAt, locale)}</p>}
                  {multiLocation && <p className="mt-2 flex items-start gap-1.5"><MapPin size={15} className="mt-0.5 shrink-0 text-sea" />{[place.venue, place.address, place.city, place.province && `(${place.province})`].filter(Boolean).join(", ")}</p>}
                </li>;
              })}
            </ol>
          </section>
          {online ? <section className="mt-8 rounded-2xl border border-slate-200 p-5"><h2 className="flex items-center gap-2 font-semibold text-ink"><Globe2 size={19} className="text-sea" /> {english ? "Join online" : "Partecipa online"}</h2><p className="mt-2 text-sm text-muted">{english ? "This event takes place online." : "L’evento si svolge da remoto."}</p>{onlineUrl && <a href={onlineUrl} target="_blank" rel="noopener noreferrer" className="focus-ring mt-3 inline-flex items-center gap-2 rounded text-sm font-bold text-sea hover:text-ink">{english ? "Open event link" : "Apri il collegamento all’evento"} <ExternalLink size={15} /></a>}</section> : <section className="mt-8" aria-labelledby="sedi-title">
            <h2 id="sedi-title" className="font-display text-xl font-semibold text-ink">{english ? (uniquePlaces.length === 1 ? "Location" : "Event locations") : (uniquePlaces.length === 1 ? "Dove si svolge" : "Le sedi dell’evento")}</h2>
            <ul className="mt-4 space-y-4">{uniquePlaces.map((place, index) => {
              const query = [place.venue, place.address, place.city, place.province, "Italia"].filter(Boolean).join(", ");
              return <li key={`${place.city}-${place.venue}-${index}`} id={`sede-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="flex items-start gap-2 text-sm font-semibold text-ink"><MapPin size={17} className="mt-0.5 shrink-0 text-sea" />{[place.venue, place.address, place.city, place.province && `(${place.province})`].filter(Boolean).join(", ")}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-sea"><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-ink">{english ? "Open in Google Maps" : "Apri in Google Maps"} <ExternalLink size={13} /></a>{place.citySlug && <Link href={`/${locale}/events/city/${place.citySlug}`} className="hover:text-ink">{english ? `Events in ${place.city}` : `Eventi a ${place.city}`}</Link>}{place.citySlug && knownCategory && <Link href={`/${locale}/events/city/${place.citySlug}/${slugifyCategory(knownCategory.name)}`} className="hover:text-ink">{english ? `${categoryName(knownCategory.name, locale)} in ${place.city}` : `${knownCategory.name} a ${place.city}`}</Link>}</div>
              </li>;
            })}</ul>
          </section>}
          {pois.length > 0 && <section className="mt-8" aria-labelledby="poi-title"><h2 id="poi-title" className="font-display text-xl font-semibold text-ink">{english ? "Points of interest" : "Punti di interesse"}</h2><ul className="mt-4 space-y-3">{pois.map((poi) => <li key={poi.id} id={`poi-${poi.id}`} className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="flex items-start gap-2 text-sm font-semibold text-ink"><MapPin size={17} className="mt-0.5 shrink-0 text-sea" />{poi.name}</h3>{poi.address && <p className="mt-2 text-sm text-muted">{poi.address}</p>}{poi.description && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink-soft/85">{poi.description}</p>}{poi.latitude !== null && poi.longitude !== null && <a href={`https://www.google.com/maps/search/?api=1&query=${poi.latitude},${poi.longitude}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sea hover:text-ink">{english ? "Open in Google Maps" : "Apri in Google Maps"} <ExternalLink size={13} /></a>}</li>)}</ul></section>}
          {mapMarkers.length > 0 && <div className="mt-4 overflow-hidden rounded-2xl"><EventMap markers={mapMarkers} locale={locale} className="h-80 w-full" /></div>}
        </article>
        <aside className="lg:sticky lg:top-7 lg:self-start"><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(8,40,72,.06)]"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-sea">{english ? "Take part" : "Partecipa"}</p><p className="mt-2 font-display text-2xl font-semibold text-ink">{price}</p><p className="mt-1 text-xs text-muted">{english ? "Prices may vary by date and availability." : "Il prezzo può variare in base alla data e alla disponibilità."}</p>{onlineUrl ? <a href={onlineUrl} target="_blank" rel="noopener noreferrer" className="focus-ring mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-sea-bright px-7 text-base font-semibold text-ink hover:bg-[#4bd0c2]">{english ? "Join online" : "Partecipa online"} <ExternalLink size={16} /></a> : website ? <a href={website} target="_blank" rel="noopener noreferrer" className="focus-ring mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-sea-bright px-7 text-base font-semibold text-ink hover:bg-[#4bd0c2]">{english ? "Tickets and details" : "Biglietti e dettagli"} <ExternalLink size={16} /></a> : <a href="mailto:ciao@sardiniafestival.com?subject=Info%20evento" className="focus-ring mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-sea-bright px-7 text-base font-semibold text-ink hover:bg-[#4bd0c2]"><Ticket size={17} /> {english ? "Ask for information" : "Chiedi informazioni"}</a>}<p className="mt-4 text-center text-[11px] leading-5 text-muted">{english ? "Always check the details with the organiser before attending." : "Verifica sempre i dettagli con l’organizzatore prima di partecipare."}</p></div><div className="mt-4 rounded-2xl bg-[#e7f5f2] p-5"><h2 className="font-display text-lg font-semibold text-ink">{english ? "Have another event to share?" : "Hai altri eventi da raccontare?"}</h2><p className="mt-2 text-xs leading-5 text-ink-soft/75">{english ? "Help the community discover what’s happening in Sardinia." : "Aiuta la community a scoprire cosa succede in Sardegna."}</p><Link href={`/${locale}/dashboard/crea-evento`} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-sea">{english ? "Submit an event" : "Segnala un evento"} <ArrowLeft size={14} className="rotate-180" /></Link></div></aside>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": schemas }).replace(/</g, "\\u003c") }} />
    </main>
  );
}
