"use client";

import { dictionary, interpolate } from "@/lib/dictionary";
import adminIt from "@/messages/it/admin.json";
import adminEn from "@/messages/en/admin.json";
import accountIt from "@/messages/it/account.json";
import accountEn from "@/messages/en/account.json";

import { useId } from "react";
import { AlertCircle, CalendarDays, CalendarRange, ChevronDown, Clock, Copy, Globe, Route, Plus, Trash2, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Field, inputClass, selectClass } from "@/components/admin/event-form-fields";
import { ComuneSelect } from "@/components/site/comune-select";
import { emptyScheduleDate, occurrenceError, type EventType, type ScheduleDate } from "@/components/events/event-schedule-fields";
import { addDaysToWallClock, formatWallClockRange } from "@/lib/event-wall-clock";
import { cn } from "@/lib/utils";

export type EditorDate = ScheduleDate & { uid: string };
export type ContentLang = "it" | "en";

const typeIcons: Record<EventType, LucideIcon> = { SINGLE_DAY: CalendarDays, MULTI_DAY: CalendarRange, MULTI_LOCATION: Route, ONLINE: Globe };
const eventTypeOrder: EventType[] = ["SINGLE_DAY", "MULTI_DAY", "MULTI_LOCATION", "ONLINE"];

type Props = {
  locale: string;
  lang: ContentLang;
  type: EventType;
  onTypeChange: (type: EventType) => void;
  dates: EditorDate[];
  onDatesChange: (dates: EditorDate[]) => void;
  openIds: string[];
  onOpenIdsChange: (ids: string[]) => void;
  createUid: () => string;
  showErrors: boolean;
  error?: string;
};

export function EventScheduleEditor({ locale, lang, type, onTypeChange, dates, onDatesChange, openIds, onOpenIdsChange, createUid, showErrors, error }: Props) {
  const t = dictionary(locale, adminIt, adminEn).eventSchedule;
  const s = dictionary(locale, accountIt, accountEn).schedule;
  const id = useId();
  const single = type === "SINGLE_DAY";
  const minimum = type === "MULTI_LOCATION" ? 2 : 1;
  const update = (uid: string, changes: Partial<ScheduleDate>) => onDatesChange(dates.map((date) => date.uid === uid ? { ...date, ...changes } : date));
  const toggle = (uid: string) => onOpenIdsChange(openIds.includes(uid) ? openIds.filter((value) => value !== uid) : [...openIds, uid]);

  function add() {
    const uid = createUid();
    onDatesChange([...dates, { ...emptyScheduleDate(), uid }]);
    onOpenIdsChange([uid]);
  }

  // A copy keeps the place and the times and moves to the next day: the usual way to build a festival programme.
  function duplicate(source: EditorDate) {
    const uid = createUid();
    const copy: EditorDate = { ...source, uid, startsAt: addDaysToWallClock(source.startsAt, 1), endsAt: addDaysToWallClock(source.endsAt, 1), originalStartsAt: undefined, originalEndsAt: undefined };
    const index = dates.findIndex((date) => date.uid === source.uid);
    onDatesChange([...dates.slice(0, index + 1), copy, ...dates.slice(index + 1)]);
    onOpenIdsChange([uid]);
  }

  function remove(uid: string) {
    onDatesChange(dates.filter((date) => date.uid !== uid));
    onOpenIdsChange(openIds.filter((value) => value !== uid));
  }

  const placeCount = new Set(dates.map((date) => date.comuneId && `${date.comuneId}|${date.venue.trim().toLocaleLowerCase("it-IT")}`).filter(Boolean)).size;
  const summary = [
    dates.length === 1 ? t.oneOccurrence : interpolate(t.manyOccurrences, { count: dates.length }),
    ...(type === "MULTI_LOCATION" && placeCount ? [placeCount === 1 ? t.onePlace : interpolate(t.manyPlaces, { count: placeCount })] : []),
  ].join(" · ");

  // Problems with one occurrence are shown on the occurrence itself.
  const hasOccurrenceIssue = (single ? dates.slice(0, 1) : dates).some((date) => occurrenceError(type, date, locale));

  return <div className="space-y-6">
    <fieldset>
      <legend className="text-xs font-bold text-ink">{s.eventType} <span aria-hidden className="text-coral">*</span></legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {eventTypeOrder.map((value) => {
          const Icon = typeIcons[value];
          const checked = type === value;
          return <label key={value} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sea-bright", checked ? "border-sea-bright bg-[#e7f5f2]" : "border-slate-200 bg-white hover:bg-slate-50")}>
            <input type="radio" name={`${id}-type`} value={value} checked={checked} onChange={() => onTypeChange(value)} className="sr-only" />
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", checked ? "bg-sea-bright text-ink" : "bg-slate-100 text-muted")}><Icon size={16} aria-hidden /></span>
            <span className="min-w-0"><span className="block text-sm font-semibold text-ink">{s.eventTypes[value]}</span><span className="mt-0.5 block text-xs leading-5 text-muted">{t.typeDescriptions[value]}</span></span>
          </label>;
        })}
      </div>
    </fieldset>

    <p className="flex items-center gap-1.5 text-xs text-muted"><Clock size={13} aria-hidden className="shrink-0" /> {t.timesInItalianTime}</p>

    {single && dates[0] && <div className="space-y-3">
      <OccurrenceTimes date={dates[0]} locale={locale} onChange={(changes) => update(dates[0].uid, changes)} error={showErrors ? occurrenceError(type, dates[0], locale) : ""} />
      {dates.length > 1 && <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900"><AlertCircle size={14} aria-hidden className="mt-0.5 shrink-0" /> {interpolate(t.singleDayDropsOccurrences, { count: dates.length - 1 })}</p>}
    </div>}

    {!single && <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
        <h3 className="text-ink">{summary}</h3>
        {dates.length > 1 && <button type="button" className="focus-ring rounded px-1 text-sea hover:text-ink" onClick={() => onOpenIdsChange(openIds.length === dates.length ? [] : dates.map((date) => date.uid))}>{openIds.length === dates.length ? t.collapseAll : t.expandAll}</button>}
      </div>
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
        {dates.map((date, index) => {
          const open = openIds.includes(date.uid);
          const issue = occurrenceError(type, date, locale);
          const panelId = `${id}-panel-${date.uid}`;
          const name = lang === "en" ? date.labelEn || date.label : date.label;
          const place = date.comuneId ? [date.province ? `${date.city} (${date.province})` : date.city, date.venue.trim()].filter(Boolean).join(" · ") : "";
          const subtitle = [type === "MULTI_LOCATION" ? place || t.placeNotSet : "", name].filter(Boolean).join(" — ");
          return <li key={date.uid} className={open ? "bg-slate-50/70" : "bg-white"}>
            <div className="flex items-stretch">
              <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => toggle(date.uid)} className="focus-ring flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left hover:bg-slate-50 sm:px-4">
                <ChevronDown size={16} aria-hidden className={cn("shrink-0 text-muted transition-transform", open && "rotate-180")} />
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-ink-soft" aria-label={`${s.occurrence} ${index + 1}`}>{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{formatWallClockRange(date.startsAt, date.endsAt, t.dateLocale) || t.dateNotSet}</span>
                  {subtitle && <span className="block truncate text-xs text-muted">{subtitle}</span>}
                </span>
                {issue && !open && <span className={cn("hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold sm:inline", showErrors ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800")}>{t.incomplete}</span>}
                {issue && !open && <AlertCircle size={14} aria-label={t.incomplete} className={cn("shrink-0 sm:hidden", showErrors ? "text-rose-600" : "text-amber-600")} />}
              </button>
              <div className="flex shrink-0 items-center pr-1.5 sm:pr-2">
                {dates.length < 100 && <button type="button" aria-label={`${t.duplicate} ${s.occurrence.toLocaleLowerCase(locale)} ${index + 1}`} title={t.duplicateHint} onClick={() => duplicate(date)} className="focus-ring grid size-9 place-items-center rounded-lg text-muted hover:bg-slate-100 hover:text-ink"><Copy size={15} /></button>}
                {dates.length > minimum && <button type="button" aria-label={`${s.removeOccurrence} ${index + 1}`} title={s.removeOccurrence} onClick={() => remove(date.uid)} className="focus-ring grid size-9 place-items-center rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 size={15} /></button>}
              </div>
            </div>
            {open && <div id={panelId} className="grid gap-4 border-t border-slate-200 p-3 sm:p-4">
              <OccurrenceTimes date={date} locale={locale} onChange={(changes) => update(date.uid, changes)} />
              {type === "MULTI_LOCATION" && <div className="grid gap-4 sm:grid-cols-2">
                <Field label={s.municipalityAndProvince} required><ComuneSelect locale={locale} required className={selectClass} value={date.comuneId} onChange={(comune) => update(date.uid, { comuneId: comune?.id || "", city: comune?.name || "", province: comune?.provinceCode || "", latitude: null, longitude: null })} /></Field>
                <Field label={s.venue} required><Input className={inputClass} maxLength={120} value={date.venue} onChange={(event) => update(date.uid, { venue: event.target.value, latitude: null, longitude: null })} placeholder={s.squareTheatreVenue} /></Field>
                <Field label={s.addressOptional} className="sm:col-span-2"><Input className={inputClass} maxLength={200} value={date.address} onChange={(event) => update(date.uid, { address: event.target.value, latitude: null, longitude: null })} /></Field>
              </div>}
              <Field label={t.occurrenceName} tag={lang} hint={lang === "en" && date.label ? `${t.italianOriginal}: ${date.label}` : undefined}>
                <Input className={inputClass} maxLength={120} value={lang === "en" ? date.labelEn || "" : date.label} onChange={(event) => update(date.uid, lang === "en" ? { labelEn: event.target.value } : { label: event.target.value })} placeholder={lang === "en" ? s.englishExample : s.italianExample} />
              </Field>
              {showErrors && issue && <p role="alert" className="text-xs font-medium text-rose-700">{issue}</p>}
            </div>}
          </li>;
        })}
      </ul>
      {dates.length < 100 && <div className="mt-3 text-sm font-semibold"><button type="button" onClick={add} className="focus-ring flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 text-sea hover:border-sea hover:bg-slate-50"><Plus size={16} /> {s.addOccurrence}</button></div>}
      <p className="mt-2 text-xs leading-5 text-muted">{type === "MULTI_LOCATION" ? s.addAtLeastTwoOccurrencesEachWith : s.forAContinuousEventEnterAStart}</p>
    </div>}

    {error && !hasOccurrenceIssue && <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-medium leading-5 text-rose-700"><AlertCircle size={14} aria-hidden className="mt-0.5 shrink-0" /> {error}</p>}
  </div>;
}

function OccurrenceTimes({ date, locale, onChange, error }: { date: EditorDate; locale: string; onChange: (changes: Partial<ScheduleDate>) => void; error?: string }) {
  const s = dictionary(locale, accountIt, accountEn).schedule;
  return <div className="grid gap-4 sm:grid-cols-2">
    <Field label={s.start} required error={error}><Input className={inputClass} type="datetime-local" value={date.startsAt} onChange={(event) => onChange({ startsAt: event.target.value })} /></Field>
    <Field label={s.endOptional}><Input className={inputClass} type="datetime-local" min={date.startsAt || undefined} value={date.endsAt} onChange={(event) => onChange({ endsAt: event.target.value })} /></Field>
  </div>;
}
