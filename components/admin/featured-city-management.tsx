"use client";

import { dictionary, interpolate } from "@/lib/dictionary";
import adminIt from "@/messages/it/admin.json";
import adminEn from "@/messages/en/admin.json";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronRight, ImageOff, MapPin, Pencil, Plus, X } from "lucide-react";
import { ComuneSelect, type ComuneOption } from "@/components/site/comune-select";
import { activeCities, FEATURED_CITY_HOME_SLOTS, inactiveCities, moveCity, nextSortOrder, setCityActive } from "@/lib/featured-cities";

type City = { id: string; comuneId: string | null; name: string; slug: string; province: string; description: string; descriptionEn: string | null; imageUrl: string | null; featured: boolean; sortOrder: number };
type Form = { comuneId: string; description: string; descriptionEn: string; imageUrl: string; featured: boolean; sortOrder: number };
type Editor = { mode: "new" | "edit"; form: Form; initial: Form; name: string; existing: boolean };
type Notice = { text: string; error: boolean };
type Labels = ReturnType<typeof labels>;

const labels = (locale: string) => dictionary(locale, adminIt, adminEn).cities;
// The "!" is needed: globals.css sets `font: inherit` on form controls outside any layer, which beats plain utilities.
const fieldClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm! font-normal! text-ink focus:border-sea focus:outline-none focus:ring-2 focus:ring-sea/20";
const primaryButton = "focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-sea-bright px-4 py-2.5 text-sm! font-bold! text-ink hover:brightness-95 disabled:opacity-50";
const secondaryButton = "focus-ring inline-flex items-center justify-center gap-1.5 min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs! font-semibold! text-ink sm:min-h-9 hover:bg-slate-50 disabled:opacity-50";
const iconButton = "focus-ring grid size-10 place-items-center rounded-lg text-ink-soft sm:size-9 hover:bg-slate-100 disabled:opacity-25 disabled:hover:bg-transparent";

function toForm(city: City): Form {
  return { comuneId: city.comuneId ?? "", description: city.description, descriptionEn: city.descriptionEn ?? "", imageUrl: city.imageUrl ?? "", featured: city.featured, sortOrder: city.sortOrder };
}

export function FeaturedCityManagement({ initialCities, locale }: { initialCities: City[]; locale: string }) {
  const t = labels(locale);
  const page = dictionary(locale, adminIt, adminEn).citiesPage;
  const [cities, setCities] = useState(initialCities);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const busy = useRef(false);

  const active = activeCities(cities);
  const onHome = active.slice(0, FEATURED_CITY_HOME_SLOTS);
  const queued = active.slice(FEATURED_CITY_HOME_SLOTS);
  const inactive = inactiveCities(cities);
  const freeSlots = FEATURED_CITY_HOME_SLOTS - onHome.length;

  useEffect(() => {
    if (!notice || notice.error) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function openNew() {
    const form: Form = { comuneId: "", description: "", descriptionEn: "", imageUrl: "", featured: true, sortOrder: nextSortOrder(cities) };
    setNotice(null);
    setEditor({ mode: "new", form, initial: form, name: "", existing: false });
  }

  function openEdit(city: City) {
    const form = toForm(city);
    setNotice(null);
    setEditor({ mode: "edit", form, initial: form, name: city.name, existing: true });
  }

  /** Apply the new order right away and undo it if the server refuses. */
  async function commit(next: City[], success: string, toggle?: { id: string; featured: boolean }) {
    if (busy.current) return;
    busy.current = true;
    const previous = cities;
    setCities(next);
    try {
      const order = [...activeCities(next), ...inactiveCities(next)].map((city) => city.id);
      const response = await fetch("/api/admin/featured-cities", { method: "PATCH", headers: { "Content-Type": "application/json", "X-SF-Locale": locale === "en" ? "en" : "it" }, body: JSON.stringify({ order, toggle }) });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error === "stale_order" ? t.staleOrder : t.couldNotSavePleaseTryAgain);
      }
      setNotice({ text: success, error: false });
    } catch (cause) {
      setCities(previous);
      setNotice({ text: cause instanceof Error ? cause.message : t.couldNotSavePleaseTryAgain, error: true });
    } finally {
      busy.current = false;
    }
  }

  function move(city: City, direction: -1 | 1) {
    const next = moveCity(cities, city.id, direction);
    if (!next) return;
    const position = activeCities(next).findIndex((item) => item.id === city.id) + 1;
    void commit(next, interpolate(t.movedTo, { name: city.name, position }));
    // A row can change list or reach an end, so keep keyboard focus on one of its arrows.
    requestAnimationFrame(() => {
      const same = document.querySelector<HTMLButtonElement>(`[data-move="${city.id}:${direction}"]`);
      const other = document.querySelector<HTMLButtonElement>(`[data-move="${city.id}:${-direction}"]`);
      (same && !same.disabled ? same : other)?.focus();
    });
  }

  function toggle(city: City) {
    const featured = !city.featured;
    void commit(setCityActive(cities, city.id, featured), interpolate(featured ? t.activated : t.deactivated, { name: city.name }), { id: city.id, featured });
  }

  function saved(city: City, wasNew: boolean) {
    setCities((current) => [...current.filter((item) => item.id !== city.id), city]);
    setEditor(null);
    setNotice({ text: wasNew ? interpolate(t.townAdded, { name: city.name }) : t.townSaved, error: false });
  }

  const rowProps = { t, onMove: move, onToggle: toggle, onEdit: openEdit };

  return <>
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">{page.featuredTowns}</h1>
        <p className="mt-2 max-w-xl text-sm text-slate-600">{page.chooseTownsAndTheirAppearanceOnTheHomePage}</p>
      </div>
      <button type="button" onClick={openNew} className={primaryButton}><Plus size={16} aria-hidden />{t.addTown}</button>
    </header>

    {cities.length === 0
      ? <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <MapPin className="mx-auto text-sea" size={26} aria-hidden />
          <h2 className="mt-3 font-display text-lg font-semibold text-ink">{t.emptyTitle}</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">{t.emptyBody}</p>
          <button type="button" onClick={openNew} className={`${primaryButton} mt-5`}><Plus size={16} aria-hidden />{t.addTown}</button>
        </div>
      : <div className="mt-7 space-y-8">
          <section aria-labelledby="cities-home">
            <GroupHeading id="cities-home" title={t.onHome} hint={t.onHomeHint} badge={interpolate(t.slotsTaken, { count: onHome.length, total: FEATURED_CITY_HOME_SLOTS })} />
            <ol className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {onHome.map((city, index) => <CityRow key={city.id} {...rowProps} city={city} position={index + 1} isFirst={index === 0} isLast={index === active.length - 1} />)}
              {Array.from({ length: freeSlots }, (_, index) => <li key={index} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 sm:p-4">
                <Position value={onHome.length + index + 1} muted />
                <p className="flex-1 text-sm text-slate-600">{t.freeSlot}</p>
                {index === 0 && <button type="button" onClick={openNew} className={secondaryButton}><Plus size={14} aria-hidden />{t.addTown}</button>}
              </li>)}
            </ol>
          </section>

          {queued.length > 0 && <section aria-labelledby="cities-queue">
            <GroupHeading id="cities-queue" title={t.queue} hint={t.queueHint} />
            <ol start={FEATURED_CITY_HOME_SLOTS + 1} className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {queued.map((city, index) => <CityRow key={city.id} {...rowProps} city={city} position={FEATURED_CITY_HOME_SLOTS + index + 1} isFirst={false} isLast={index === queued.length - 1} />)}
            </ol>
          </section>}

          {inactive.length > 0 && <details className="group" open={active.length === 0}>
            <summary className="focus-ring inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg font-display text-lg font-semibold text-ink [&::-webkit-details-marker]:hidden">
              <ChevronRight size={18} className="transition-transform group-open:rotate-90" aria-hidden />
              {t.inactiveGroup}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-sans text-xs font-semibold text-slate-600">{inactive.length}</span>
            </summary>
            <p className="mt-1 text-sm text-slate-600">{t.inactiveHint}</p>
            <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {inactive.map((city) => <CityRow key={city.id} {...rowProps} city={city} />)}
            </ul>
          </details>}
        </div>}

    {editor && <CityEditor key={editor.mode === "edit" ? editor.form.comuneId : "new"} editor={editor} setEditor={setEditor} cities={cities} locale={locale} t={t} onSaved={saved} />}

    <div role="status" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center">
      {notice && <p className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${notice.error ? "bg-rose-700 text-white" : "bg-ink text-white"}`}>
        {notice.text}
        <button type="button" onClick={() => setNotice(null)} aria-label={t.dismiss} className="focus-ring -mr-1 grid size-6 shrink-0 place-items-center rounded-md hover:bg-white/15"><X size={14} aria-hidden /></button>
      </p>}
    </div>
  </>;
}

function GroupHeading({ id, title, hint, badge }: { id: string; title: string; hint: string; badge?: string }) {
  return <div>
    <div className="flex flex-wrap items-center gap-2">
      <h2 id={id} className="font-display text-lg font-semibold text-ink">{title}</h2>
      {badge && <span className="rounded-full bg-[#e7f5f2] px-2.5 py-0.5 text-xs font-semibold text-sea">{badge}</span>}
    </div>
    <p className="mt-1 text-sm text-slate-600">{hint}</p>
  </div>;
}

function Position({ value, muted }: { value: number; muted?: boolean }) {
  return <span aria-hidden className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${muted ? "border border-dashed border-slate-300 text-slate-500" : "bg-[#e7f5f2] text-sea"}`}>{value}</span>;
}

function CityRow({ city, position, isFirst, isLast, t, onMove, onToggle, onEdit }: { city: City; position?: number; isFirst?: boolean; isLast?: boolean; t: Labels; onMove: (city: City, direction: -1 | 1) => void; onToggle: (city: City) => void; onEdit: (city: City) => void }) {
  // Gaps only matter for towns that can reach the home page.
  const missing = city.featured ? [!city.imageUrl && t.noImage, !city.description && t.noDescription, !city.descriptionEn && t.noEnglish].filter(Boolean) as string[] : [];
  const canReorder = position !== undefined && !(isFirst && isLast);
  return <li className="flex flex-wrap items-center gap-x-4 gap-y-3 p-3 sm:p-4">
    {position !== undefined && <Position value={position} />}
    <div className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-slate-400">
      {city.imageUrl ? <img src={city.imageUrl} alt="" loading="lazy" className="size-full object-cover" /> : <ImageOff size={18} aria-hidden />}
    </div>
    <div className="min-w-0 flex-1 basis-40">
      <p className="truncate font-semibold text-ink">{city.name} <span className="text-xs font-medium text-slate-500">{city.province}</span></p>
      {city.description && <p className="mt-0.5 truncate text-xs text-slate-600">{city.description}</p>}
      {!city.comuneId && <p className="mt-1 text-xs font-semibold text-rose-700">{t.townNoLongerFoundInTheRegistry}</p>}
      {missing.length > 0 && <ul className="mt-1.5 flex flex-wrap gap-1">{missing.map((label) => <li key={label} className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">{label}</li>)}</ul>}
    </div>
    <div className="ml-auto flex items-center gap-2 sm:gap-3">
      {canReorder && <div className="flex">
        <button type="button" data-move={`${city.id}:-1`} disabled={isFirst} onClick={() => onMove(city, -1)} aria-label={interpolate(t.moveUp, { name: city.name })} className={iconButton}><ArrowUp size={16} aria-hidden /></button>
        <button type="button" data-move={`${city.id}:1`} disabled={isLast} onClick={() => onMove(city, 1)} aria-label={interpolate(t.moveDown, { name: city.name })} className={iconButton}><ArrowDown size={16} aria-hidden /></button>
      </div>}
      <button type="button" role="switch" aria-checked={city.featured} aria-label={interpolate(t.activeSwitch, { name: city.name })} title={t.activeLabel} onClick={() => onToggle(city)} className="focus-ring grid h-10 place-items-center rounded-lg px-1 sm:h-9">
        <span className={`relative h-5 w-9 rounded-full transition-colors ${city.featured ? "bg-sea" : "bg-slate-500"}`}><span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${city.featured ? "left-[18px]" : "left-0.5"}`} /></span>
      </button>
      <button type="button" disabled={!city.comuneId} onClick={() => onEdit(city)} aria-label={interpolate(t.editTown, { name: city.name })} className={secondaryButton}><Pencil size={13} aria-hidden />{t.edit}</button>
    </div>
  </li>;
}

function CityEditor({ editor, setEditor, cities, locale, t, onSaved }: { editor: Editor; setEditor: React.Dispatch<React.SetStateAction<Editor | null>>; cities: City[]; locale: string; t: Labels; onSaved: (city: City, wasNew: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef(document.activeElement as HTMLElement | null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [brokenImage, setBrokenImage] = useState("");
  const { form, mode, name, existing } = editor;
  const dirty = JSON.stringify(form) !== JSON.stringify(editor.initial);
  const imageOk = Boolean(form.imageUrl) && brokenImage !== form.imageUrl;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!element.open) element.showModal();
    element.querySelector<HTMLElement>(mode === "new" ? "select" : "textarea")?.focus();
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    // The dialog is removed rather than closed, so the browser will not return focus by itself.
    return () => { root.style.overflow = previous; opener.current?.focus(); };
  }, [mode]);

  function update(patch: Partial<Form>) {
    setEditor((current) => current && { ...current, form: { ...current.form, ...patch } });
    setConfirmDiscard(false);
  }

  function selectComune(comune: ComuneOption | null) {
    const match = comune && cities.find((city) => city.comuneId === comune.id);
    setError("");
    setEditor((current) => {
      if (!current) return current;
      if (match) return { ...current, form: toForm(match), initial: toForm(match), name: match.name, existing: true };
      // Keep what was typed for a new town, but never carry over another town's saved text.
      const base = current.existing ? { ...current.form, description: "", descriptionEn: "", imageUrl: "", featured: true, sortOrder: nextSortOrder(cities) } : current.form;
      return { ...current, form: { ...base, comuneId: comune?.id ?? "" }, initial: current.existing ? { ...base, comuneId: "" } : current.initial, name: comune?.name ?? "", existing: false };
    });
  }

  function requestClose() {
    if (dirty) setConfirmDiscard(true);
    else setEditor(null);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    const wasActive = cities.find((city) => city.comuneId === form.comuneId)?.featured;
    // A town switched on from here joins the end of the list, as it does from the list itself.
    const body = form.featured && wasActive === false ? { ...form, sortOrder: nextSortOrder(cities) } : form;
    try {
      const response = await fetch("/api/admin/featured-cities", { method: "PUT", headers: { "Content-Type": "application/json", "X-SF-Locale": locale === "en" ? "en" : "it" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error === "duplicate_city" ? t.duplicateCity : result.error === "invalid_city" ? t.chooseATownFromTheList : t.couldNotSaveTheTownCheckTheFieldsAndTryAgain);
      }
      onSaved(result.city as City, !existing);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.couldNotSavePleaseTryAgain);
      setSaving(false);
    }
  }

  return <dialog ref={dialog} aria-labelledby="city-editor-title" onCancel={(event) => { event.preventDefault(); requestClose(); }} onClose={() => setEditor(null)} onClick={(event) => { if (event.target === dialog.current) requestClose(); }} className="m-0 ml-auto h-dvh max-h-none w-full max-w-lg overflow-hidden bg-white p-0 text-ink shadow-xl backdrop:bg-ink/50">
    <form onSubmit={save} className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <h2 id="city-editor-title" className="truncate font-display text-lg font-semibold">{mode === "edit" ? name : t.newTown}</h2>
        <button type="button" onClick={requestClose} aria-label={t.close} className={iconButton}><X size={18} aria-hidden /></button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {mode === "new" && <div>
          <label className="block text-sm font-semibold">{t.town} *<ComuneSelect locale={locale} value={form.comuneId} required className={fieldClass} onChange={selectComune} /></label>
          {existing && <p className="mt-2 rounded-lg bg-[#e7f5f2] px-3 py-2 text-xs font-medium text-sea">{t.alreadySaved}</p>}
        </div>}

        <div>
          <p className="text-sm font-semibold">{t.preview}</p>
          <div className="relative mt-1.5 min-h-[180px] overflow-hidden rounded-2xl bg-ink">
            {imageOk && <img src={form.imageUrl} alt="" onError={() => setBrokenImage(form.imageUrl)} className="absolute inset-0 size-full object-cover opacity-65" />}
            <div className="absolute inset-0 bg-gradient-to-t from-[#062440]/90 to-transparent" />
            <div className="absolute bottom-0 p-5 text-white">
              <p className="font-display text-xl font-semibold">{name || t.town}</p>
              <p className="mt-1 text-xs text-white/75">{form.description}</p>
            </div>
          </div>
        </div>

        <label className="block text-sm font-semibold">{t.imageUrl}
          <input type="url" maxLength={2048} value={form.imageUrl} onChange={(event) => update({ imageUrl: event.target.value })} placeholder="https://…" className={fieldClass} />
          {form.imageUrl && !imageOk && <span className="mt-1.5 block text-xs font-medium text-rose-700">{t.imageLoadError}</span>}
        </label>

        <DescriptionField label={t.descriptionItalian} value={form.description} onChange={(description) => update({ description })} />
        <DescriptionField label={t.descriptionEnglishOptional} value={form.descriptionEn} onChange={(descriptionEn) => update({ descriptionEn })} />

        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
          <input type="checkbox" checked={form.featured} onChange={(event) => update({ featured: event.target.checked })} className="mt-0.5 size-4 accent-teal-700" />
          <span><span className="block text-sm font-semibold">{t.activeLabel}</span><span className="mt-0.5 block text-xs text-slate-600">{t.activeHelp}</span></span>
        </label>
      </div>

      <div className="border-t border-slate-200 px-5 py-4">
        {error && <p role="alert" className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        {confirmDiscard
          ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">{t.unsavedChanges}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmDiscard(false)} className={secondaryButton}>{t.keepEditing}</button>
                <button type="button" onClick={() => setEditor(null)} className={`${secondaryButton} border-rose-200 text-rose-700 hover:bg-rose-50`}>{t.discard}</button>
              </div>
            </div>
          : <div className="flex justify-end gap-2">
              <button type="button" onClick={requestClose} className="focus-ring rounded-xl px-4 py-2.5 text-sm! font-semibold! text-ink hover:bg-slate-100">{t.cancel}</button>
              <button type="submit" disabled={saving || !form.comuneId} className={primaryButton}>{saving ? t.saving : t.saveTown}</button>
            </div>}
      </div>
    </form>
  </dialog>;
}

function DescriptionField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-semibold">
    <span className="flex items-baseline justify-between gap-3">{label}<span className="text-xs font-normal text-slate-500">{value.length}/500</span></span>
    <textarea maxLength={500} rows={2} value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass} />
  </label>;
}
