"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Eye, EyeOff, LoaderCircle, Pencil, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emptyScheduleDate, EventScheduleFields, eventTypeLabels, serializeSchedule, toLocalDateTime, validateSchedule, type EventType, type ScheduleDate } from "@/components/events/event-schedule-fields";
import { ComuneSelect } from "@/components/site/comune-select";
import { EventGallery } from "@/components/admin/event-gallery";
import { EventPoiManagement } from "@/components/admin/event-poi-management";
import { categoryName, eventCategories } from "@/lib/event-categories";

type EventStatus = "PENDING" | "PUBLISHED" | "REJECTED" | "CANCELLED";
type EventFilter = "ALL" | EventStatus;
type AdminEvent = { id: string; title: string; titleEn: string | null; description: string; descriptionEn: string | null; subcategory: string | null; subcategoryEn: string | null; location: string | null; province: string | null; venue: string | null; comuneId: string | null; category: string; startsAt: string | Date; endsAt: string | Date | null; eventType: EventType; onlineUrl: string | null; dates: { startsAt: string | Date; endsAt: string | Date | null; label: string | null; labelEn: string | null; venue: string | null; address: string | null; city: string | null; province: string | null; comuneId: string | null; latitude: number | null; longitude: number | null }[]; images: { id: string; alt: string | null; altEn: string | null; isCover: boolean }[]; status: EventStatus; featured: boolean; price: string | null; priceEn: string | null; website: string | null; organizer: { name: string | null; email: string } | null };
type EventPatch = Record<string, unknown>;
const statusLabel = { PENDING: "In revisione", PUBLISHED: "Pubblicato", REJECTED: "Non approvato", CANCELLED: "Annullato" };
const statusLabelEn: Record<EventStatus, string> = { PENDING: "In review", PUBLISHED: "Published", REJECTED: "Rejected", CANCELLED: "Hidden" };
const eventTypeLabelsEn: Record<EventType, string> = { SINGLE_DAY: "Single day", MULTI_DAY: "Multiple days", MULTI_LOCATION: "Multiple days and venues", ONLINE: "Online" };
const statusClass = { PENDING: "bg-amber-50 text-amber-800", PUBLISHED: "bg-teal-50 text-teal-800", REJECTED: "bg-rose-50 text-rose-800", CANCELLED: "bg-slate-100 text-slate-600" };
const inputClass = "focus-ring h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-normal text-ink";
const labelClass = "grid gap-1.5 text-[11px] font-bold text-ink";

function EventEditForm({ event, disabled, onSave, locale }: { event: AdminEvent; disabled: boolean; onSave: (patch: EventPatch) => Promise<void>; locale: string }) {
  const en = locale === "en";
  const [eventType, setEventType] = useState<EventType>(event.eventType || "SINGLE_DAY");
  const [scheduleError, setScheduleError] = useState("");
  const legacyCategory = !eventCategories.some((category) => category.name === event.category);
  const [dates, setDates] = useState<ScheduleDate[]>(() => event.dates.length ? event.dates.map((date) => ({
    startsAt: toLocalDateTime(date.startsAt), endsAt: toLocalDateTime(date.endsAt), label: date.label || "", labelEn: date.labelEn || "",
    originalStartsAt: new Date(date.startsAt).toISOString(), originalEndsAt: date.endsAt ? new Date(date.endsAt).toISOString() : undefined,
    venue: date.venue || "", address: date.address || "", city: date.city || "", province: date.province || "", comuneId: date.comuneId || "",
    latitude: date.latitude, longitude: date.longitude,
  })) : [{ ...emptyScheduleDate(), startsAt: toLocalDateTime(event.startsAt), endsAt: toLocalDateTime(event.endsAt), originalStartsAt: new Date(event.startsAt).toISOString(), originalEndsAt: event.endsAt ? new Date(event.endsAt).toISOString() : undefined }]);
  async function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const validationError = validateSchedule(eventType, dates, locale);
    setScheduleError(validationError);
    if (validationError) return;
    const form = formEvent.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    // An unchanged legacy category can remain until an editor assigns a canonical one.
    if (legacyCategory && body.category === event.category) delete body.category;
    await onSave({ ...body, eventType, dates: serializeSchedule(eventType, dates) });
  }
  return <form onSubmit={submit} className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
    <label className={`${labelClass} sm:col-span-2`}>{en ? "Event name (Italian)" : "Nome evento (italiano)"}<Input className={inputClass} required name="title" defaultValue={event.title} maxLength={120} /></label>
    <label className={`${labelClass} sm:col-span-2`}>{en ? "Event name (English, optional)" : "Nome evento (inglese, facoltativo)"}<Input className={inputClass} name="titleEn" defaultValue={event.titleEn || ""} maxLength={120} /></label>
    <label className={labelClass}>{en ? "Category" : "Categoria"}<select className={inputClass} required name="category" defaultValue={event.category}>
      {legacyCategory && <option value={event.category}>{event.category} ({en ? "previous category" : "categoria precedente"})</option>}
      {eventCategories.map((category) => <option key={category.name} value={category.name}>{categoryName(category.name, locale)}</option>)}
    </select>{legacyCategory && <span className="font-normal text-amber-800">{en ? "Choose a category from the list to link this event to its page." : "Scegli una categoria dell’elenco per associare l’evento alla pagina corrispondente."}</span>}</label>
    <label className={labelClass}>{en ? "Subcategory (Italian, optional)" : "Sottocategoria (italiano, facoltativa)"}<Input className={inputClass} name="subcategory" defaultValue={event.subcategory || ""} maxLength={80} /></label>
    <label className={labelClass}>{en ? "Subcategory (English, optional)" : "Sottocategoria (inglese, facoltativa)"}<Input className={inputClass} name="subcategoryEn" defaultValue={event.subcategoryEn || ""} maxLength={80} /></label>
    <EventScheduleFields locale={locale} compact type={eventType} onTypeChange={setEventType} dates={dates} onDatesChange={setDates} />
    {(eventType === "SINGLE_DAY" || eventType === "MULTI_DAY") && <>
      <label className={labelClass}>{en ? "Municipality and province" : "Comune e provincia"} *<ComuneSelect locale={locale} className={inputClass} required name="comuneId" defaultValue={event.comuneId} defaultName={event.location || ""} /></label>
      <label className={labelClass}>{en ? "Venue" : "Luogo"} *<Input className={inputClass} required name="venue" defaultValue={event.venue || ""} minLength={2} maxLength={120} /></label>
    </>}
    {eventType === "ONLINE" && <label className={labelClass}>{en ? "Participation link" : "Link per partecipare"} *<Input className={inputClass} required name="onlineUrl" type="url" defaultValue={event.onlineUrl || ""} placeholder="https://" /></label>}
    <label className={labelClass}>{en ? "Price / admission (Italian)" : "Prezzo / accesso (italiano)"}<Input className={inputClass} name="price" defaultValue={event.price || ""} maxLength={80} /></label>
    <label className={labelClass}>{en ? "Price / admission (English, optional)" : "Prezzo / accesso (inglese, facoltativo)"}<Input className={inputClass} name="priceEn" defaultValue={event.priceEn || ""} maxLength={80} /></label>
    <label className={labelClass}>{en ? "Website" : "Sito web"}<Input className={inputClass} name="website" type="url" defaultValue={event.website || ""} placeholder="https://" /></label>
    <label className={`${labelClass} sm:col-span-2`}>{en ? "Description (Italian)" : "Descrizione (italiano)"}<textarea className="focus-ring min-h-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-ink" required name="description" defaultValue={event.description} minLength={30} maxLength={5000} /></label>
    <label className={`${labelClass} sm:col-span-2`}>{en ? "Description (English, optional)" : "Descrizione (inglese, facoltativa)"}<textarea className="focus-ring min-h-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-ink" name="descriptionEn" defaultValue={event.descriptionEn || ""} maxLength={5000} /></label>
    {scheduleError && <p role="alert" className="text-xs text-rose-700 sm:col-span-2">{scheduleError}</p>}
    <div className="flex justify-end sm:col-span-2"><Button type="submit" size="sm" disabled={disabled}><Pencil size={13} /> {en ? "Save changes" : "Salva modifiche"}</Button></div>
  </form>;
}

export function EventManagement({ events, initialFilter = "ALL", locale = "it" }: { events: AdminEvent[]; initialFilter?: EventFilter; locale?: string }) {
  const en = locale === "en";
  const [busy, setBusy] = useState(""); const [error, setError] = useState(""); const [filter, setFilter] = useState<EventFilter>(initialFilter); const router = useRouter();
  const filtered = filter === "ALL" ? events : events.filter((event) => event.status === filter);
  async function update(id: string, patch: EventPatch) {
    setBusy(id); setError("");
    try { const response = await fetch(`/api/admin/events/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); router.refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : en ? "Update failed." : "Aggiornamento non riuscito."); }
    finally { setBusy(""); }
  }
  async function remove(id: string) {
    if (!window.confirm(en ? "Permanently delete this event?" : "Eliminare definitivamente questo evento?")) return;
    setBusy(id); setError("");
    try { const response = await fetch(`/api/admin/events/${id}`, { method: "DELETE" }); const result = await response.json(); if (!response.ok) throw new Error(result.error); if (result.warning) setError(result.warning); router.refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : en ? "Deletion failed." : "Eliminazione non riuscita."); }
    finally { setBusy(""); }
  }
  return <div>
    <div className="flex flex-wrap gap-2">{[["ALL", en ? "All" : "Tutti"], ["PENDING", en ? "In review" : "In revisione"], ["PUBLISHED", en ? "Published" : "Pubblicati"], ["REJECTED", en ? "Rejected" : "Non approvati"], ["CANCELLED", en ? "Hidden" : "Annullati"]].map(([key, label]) => <button key={key} onClick={() => setFilter(key as EventFilter)} className={`focus-ring rounded-full px-4 py-2 text-xs font-bold ${filter === key ? "bg-ink text-white" : "bg-white text-muted hover:bg-slate-100"}`}>{label}</button>)}</div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {filtered.length ? filtered.map((event) => <div key={event.id} className="grid gap-4 border-b border-slate-100 p-4 last:border-0 md:grid-cols-[1fr_auto] md:items-center md:p-5">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-ink">{en ? event.titleEn || event.title : event.title}</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass[event.status]}`}>{en ? statusLabelEn[event.status] : statusLabel[event.status]}</span>{event.featured && <span title={en ? "Featured" : "In evidenza"} className="text-amber-500"><Star size={14} fill="currentColor" /></span>}</div><p className="mt-1 text-xs text-muted">{categoryName(event.category, locale)} · {en ? eventTypeLabelsEn[event.eventType || "SINGLE_DAY"] : eventTypeLabels[event.eventType || "SINGLE_DAY"]} · {event.eventType === "ONLINE" ? "Online" : [event.location, event.province, event.venue].filter(Boolean).join(" · ")} · {new Date(event.startsAt).toLocaleDateString(en ? "en-GB" : "it-IT", { timeZone: "Europe/Rome" })}</p><p className="mt-1 text-[11px] text-muted">{en ? "Submitted by" : "Segnalato da"} {event.organizer?.name || event.organizer?.email || (en ? "guest" : "utente ospite")}</p><details className="mt-3"><summary className="focus-ring inline-flex cursor-pointer list-none items-center gap-1 rounded text-xs font-bold text-sea hover:text-ink"><Pencil size={13} /> {en ? "Edit details" : "Modifica dettagli"} <ChevronDown size={14} /></summary><EventEditForm locale={locale} event={event} disabled={busy === event.id} onSave={(patch) => update(event.id, patch)} /><EventGallery locale={locale} eventId={event.id} images={event.images} /><EventPoiManagement locale={locale} eventId={event.id} /></details></div>
        <div className="flex flex-wrap items-center gap-2">{event.status === "PENDING" && <><Button size="sm" onClick={() => update(event.id, { status: "PUBLISHED" })} disabled={busy === event.id}><Check size={14} /> {en ? "Approve" : "Approva"}</Button><Button size="sm" variant="outline" onClick={() => update(event.id, { status: "REJECTED" })} disabled={busy === event.id}><X size={14} /> {en ? "Reject" : "Rifiuta"}</Button></>}{event.status === "PUBLISHED" && <Button size="sm" variant="outline" onClick={() => update(event.id, { status: "CANCELLED" })} disabled={busy === event.id}><EyeOff size={14} /> {en ? "Hide" : "Nascondi"}</Button>}{event.status === "CANCELLED" && <Button size="sm" variant="outline" onClick={() => update(event.id, { status: "PUBLISHED" })} disabled={busy === event.id}><Eye size={14} /> {en ? "Republish" : "Ripubblica"}</Button>}<Button size="icon" variant="ghost" aria-label={en ? "Toggle featured status" : "Imposta in evidenza"} title={event.featured ? (en ? "Remove from featured" : "Rimuovi dalla vetrina") : (en ? "Feature event" : "Metti in evidenza")} onClick={() => update(event.id, { featured: !event.featured })} disabled={busy === event.id}>{busy === event.id ? <LoaderCircle size={16} className="animate-spin" /> : <Star size={16} className={event.featured ? "fill-amber-400 text-amber-500" : "text-slate-400"} />}</Button><Button size="icon" variant="ghost" aria-label={en ? "Delete event" : "Elimina evento"} onClick={() => remove(event.id)} disabled={busy === event.id}><Trash2 size={16} className="text-rose-500" /></Button></div>
      </div>) : <div className="px-5 py-12 text-center text-sm text-muted">{en ? "No events in this section." : "Nessun evento in questa sezione."}</div>}
    </div>
  </div>;
}
