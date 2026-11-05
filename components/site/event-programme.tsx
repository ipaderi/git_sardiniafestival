"use client";

import { dictionary, interpolate } from "@/lib/dictionary";
import publicIt from "@/messages/it/public.json";
import publicEn from "@/messages/en/public.json";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ExternalLink, MapPin } from "lucide-react";
import type { OccurrenceStatus } from "@/lib/event-occurrences";
import { cn } from "@/lib/utils";

export type ProgrammeItem = {
  anchor: string;
  status: OccurrenceStatus;
  isNext: boolean;
  badgeTop: string;
  badgeBottom: string;
  monthKey: string;
  monthLabel: string;
  title: string;
  detail: string;
  place: string;
  town: string;
  mapsUrl: string | null;
};

function Row({ item, locale }: { item: ProgrammeItem; locale: string }) {
  const t = dictionary(locale, publicIt, publicEn);
  const past = item.status === "past";
  return <li id={item.anchor} className="grid scroll-mt-6 grid-cols-[4.5rem_minmax(0,1fr)] gap-3.5 py-3.5 first:pt-0 last:pb-0 sm:gap-4">
    <div className={cn("flex min-h-16 flex-col items-center justify-center rounded-xl px-1 py-2 text-center", past ? "bg-slate-100 text-muted" : "bg-[#e7f5f2] text-ink")}>
      <span className="text-sm font-bold leading-tight">{item.badgeTop}</span>
      <span className="mt-0.5 text-[11px] font-semibold leading-tight">{item.badgeBottom}</span>
    </div>
    <div className="min-w-0 self-center">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h3 className={cn("text-sm font-semibold leading-5", past ? "text-muted" : "text-ink")}>{item.title}</h3>
        {item.status === "ongoing" && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800">{t.happeningNow}</span>}
        {item.isNext && <span className="rounded-full bg-coral px-2 py-0.5 text-[10px] font-bold text-white">{t.nextBadge}</span>}
      </div>
      {item.detail && <p className="mt-0.5 text-xs text-muted first-letter:uppercase">{item.detail}</p>}
      {item.place && <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-ink-soft"><MapPin size={13} aria-hidden className="mt-1 shrink-0 text-sea" /><span className="min-w-0">{item.place}{item.mapsUrl && <> · <a href={item.mapsUrl} target="_blank" rel="noopener noreferrer" aria-label={`${t.openInGoogleMaps}: ${item.place}`} className="focus-ring inline-flex items-center gap-0.5 rounded font-semibold text-sea hover:text-ink">{t.mapLink} <ExternalLink size={11} aria-hidden /></a></>}</span></p>}
    </div>
  </li>;
}

/** Dates and places in one list: nobody has to match a list of dates against a list of venues. */
export function EventProgramme({ items, locale = "it" }: { items: ProgrammeItem[]; locale?: string }) {
  const t = dictionary(locale, publicIt, publicEn);
  const [town, setTown] = useState<string | null>(null);
  const [pastOpen, setPastOpen] = useState(false);
  const pastRef = useRef<HTMLDetailsElement>(null);
  const concluded = items.every((item) => item.status === "past");
  const towns = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) if (item.town) counts.set(item.town, (counts.get(item.town) ?? 0) + 1);
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b, locale));
  }, [items, locale]);
  const visible = town ? items.filter((item) => item.town === town) : items;
  const active = concluded ? visible : visible.filter((item) => item.status !== "past");
  const past = concluded ? [] : visible.filter((item) => item.status === "past");
  const useMonths = items.length > 3 && new Set(items.map((item) => item.monthKey)).size > 1;
  const months = useMemo(() => {
    const groups: { key: string; label: string; items: ProgrammeItem[] }[] = [];
    for (const item of active) {
      const last = groups[groups.length - 1];
      if (last?.key === item.monthKey) last.items.push(item);
      else groups.push({ key: item.monthKey, label: item.monthLabel, items: [item] });
    }
    return groups;
  }, [active]);

  // Links from the map can point to a past occurrence: open the folded list so the target exists on screen.
  useEffect(() => {
    function revealTarget() {
      const target = window.location.hash ? document.getElementById(window.location.hash.slice(1)) : null;
      if (!target || !pastRef.current?.contains(target)) return;
      setPastOpen(true);
      requestAnimationFrame(() => target.scrollIntoView());
    }
    revealTarget();
    window.addEventListener("hashchange", revealTarget);
    return () => window.removeEventListener("hashchange", revealTarget);
  }, []);

  return <section id="programma" className="mt-8 scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-labelledby="programme-title">
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 id="programme-title" className="flex items-center gap-2 font-display text-xl font-semibold text-ink"><CalendarDays size={19} aria-hidden className="text-sea" /> {t.programme}</h2>
      <p className="text-xs font-semibold text-muted">{items.length} {t.dates}</p>
    </div>
    {towns.length > 1 && items.length > 3 && <div role="group" aria-label={t.filterByTown} className="mt-3 flex gap-1.5 overflow-x-auto pb-1 text-xs font-semibold hide-scrollbar">
      {[{ value: null as string | null, label: t.allOccurrences, count: items.length }, ...towns.map(([value, count]) => ({ value: value as string | null, label: value, count }))].map(({ value, label, count }) => <button key={label} type="button" aria-pressed={town === value} onClick={() => setTown(value)} className={cn("focus-ring shrink-0 rounded-full px-3 py-1.5", town === value ? "bg-ink text-white" : "bg-slate-100 text-ink-soft hover:bg-slate-200")}>{label} <span className={town === value ? "text-white/70" : "text-muted"}>{count}</span></button>)}
    </div>}
    <div className="mt-4">
      {months.map((group, index) => <div key={group.key} className={index ? "mt-5" : ""}>
        {useMonths && <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-[.12em] text-sea">{group.label}</h3>}
        <ol className="divide-y divide-slate-100">{group.items.map((item) => <Row key={item.anchor} item={item} locale={locale} />)}</ol>
      </div>)}
      {!active.length && <p className="text-sm text-muted">{t.noUpcomingInThisTown}</p>}
    </div>
    {past.length > 0 && <details ref={pastRef} open={pastOpen || !active.length} onToggle={(event) => setPastOpen(event.currentTarget.open)} className="group mt-4 border-t border-slate-100 pt-3">
      <summary className="focus-ring flex cursor-pointer list-none items-center gap-1.5 rounded text-xs font-bold text-muted hover:text-ink [&::-webkit-details-marker]:hidden"><ChevronDown size={14} aria-hidden className="transition-transform group-open:rotate-180" />{interpolate(t.pastOccurrences, { count: past.length })}</summary>
      <ol className="mt-3 divide-y divide-slate-100">{past.map((item) => <Row key={item.anchor} item={item} locale={locale} />)}</ol>
    </details>}
  </section>;
}
