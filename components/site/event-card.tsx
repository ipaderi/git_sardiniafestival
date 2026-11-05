"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, MapPin, ArrowUpRight, Globe2 } from "lucide-react";
import type { FestivalEvent } from "@/lib/public-events";

export function EventCard({ event, priority = false }: { event: FestivalEvent; priority?: boolean }) {
  const [saved, setSaved] = useState(false);
  const cities = [...new Set(event.dates.map((date) => date.city).filter((city): city is string => Boolean(city)))];
  const venues = [...new Set(event.dates.map((date) => date.venue).filter((venue): venue is string => Boolean(venue)))];
  const place = event.eventType === "ONLINE" ? "Online" : event.eventType === "MULTI_LOCATION"
    ? event.cityFiltered ? [cities[0], venues.length > 1 ? "Più sedi" : venues[0]].filter(Boolean).join(" · ")
      : cities.length > 1 ? cities.join(", ") : `Più sedi${cities[0] ? ` · ${cities[0]}` : ""}`
    : [event.city, event.venue].filter(Boolean).join(" · ");
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_45px_rgba(8,40,72,.12)]">
      <Link href={`/eventi/${event.slug}`} className="focus-ring relative block aspect-[1.52/1] overflow-hidden bg-gradient-to-br from-[#0b4560] via-[#087c78] to-[#e0a776]">
        {event.image && <img src={event.image} alt="" loading={priority ? "eager" : "lazy"} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />}
        <span className="absolute left-3 top-3 max-w-[88%] rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-ink shadow-sm">{event.dateLabel}</span>
        {event.featured && <span className="absolute bottom-3 left-3 rounded-full bg-ink/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-white">Da non perdere</span>}
      </Link>
      <div className="p-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[.13em] text-sea">{event.category}</span>
          <button type="button" aria-label={saved ? "Rimuovi dai preferiti" : "Salva evento"} aria-pressed={saved} onClick={() => setSaved(!saved)} className={`focus-ring rounded-full p-2 transition ${saved ? "bg-rose-50 text-rose-500" : "text-slate-400 hover:bg-slate-100 hover:text-rose-500"}`}><Heart size={17} fill={saved ? "currentColor" : "none"} /></button>
        </div>
        <Link href={`/eventi/${event.slug}`} className="focus-ring mt-1 block rounded-sm font-display text-[19px] font-semibold leading-snug tracking-[-.02em] text-ink group-hover:text-sea">{event.title}</Link>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">{event.eventType === "ONLINE" ? <Globe2 size={14} className="shrink-0 text-sea" /> : <MapPin size={14} className="shrink-0 text-sea" />} {place}</p>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-sm font-bold text-ink">{event.price}</span><Link href={`/eventi/${event.slug}`} className="focus-ring inline-flex items-center gap-1 rounded-sm text-xs font-bold text-sea hover:text-ink">Scopri <ArrowUpRight size={14} /></Link></div>
      </div>
    </article>
  );
}
