"use client";

import { dictionary, interpolate } from "@/lib/dictionary";
import adminIt from "@/messages/it/admin.json";
import adminEn from "@/messages/en/admin.json";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field, FormSection, inputClass, textareaClass } from "@/components/admin/event-form-fields";

type Poi = { id: string; name: string; nameEn: string | null; description: string | null; descriptionEn: string | null; address: string | null; latitude: number | null; longitude: number | null };
type Draft = { name: string; nameEn: string; description: string; descriptionEn: string; address: string; latitude: string; longitude: string };
const emptyDraft: Draft = { name: "", nameEn: "", description: "", descriptionEn: "", address: "", latitude: "", longitude: "" };

export function EventPoiManagement({ eventId, locale = "it" }: { eventId: string; locale?: string }) {
  const t = dictionary(locale, adminIt, adminEn).poi;
  const [pois, setPois] = useState<Poi[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endpoint = `/api/admin/events/${encodeURIComponent(eventId)}/pois`;

  async function load() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint, { cache: "no-store", headers: { "X-SF-Locale": locale === "en" ? "en" : "it" } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || (t.unableToLoadPointsOfInterest));
      setPois(result.pois);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.unableToLoadPointsOfInterest);
    } finally { setBusy(false); }
  }

  useEffect(() => { void load(); }, [endpoint]);

  function edit(poi?: Poi) {
    setError("");
    setDraft(poi ? { name: poi.name, nameEn: poi.nameEn || "", description: poi.description || "", descriptionEn: poi.descriptionEn || "", address: poi.address || "", latitude: poi.latitude?.toString() ?? "", longitude: poi.longitude?.toString() ?? "" } : emptyDraft);
    setEditing(poi?.id ?? "new");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((draft.latitude.trim() === "") !== (draft.longitude.trim() === "")) {
      setError(t.enterBothCoordinatesOrLeaveBothBlank);
      return;
    }
    const poi = { name: draft.name, nameEn: draft.nameEn || null, description: draft.description || null, descriptionEn: draft.descriptionEn || null, address: draft.address || null,
      latitude: draft.latitude.trim() === "" ? null : Number(draft.latitude), longitude: draft.longitude.trim() === "" ? null : Number(draft.longitude) };
    setBusy(true); setError("");
    try {
      const response = await fetch(endpoint, { method: editing === "new" ? "POST" : "PATCH", headers: { "Content-Type": "application/json", "X-SF-Locale": locale === "en" ? "en" : "it" }, body: JSON.stringify(editing === "new" ? poi : { id: editing, poi }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || (t.saveFailed));
      setEditing(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.saveFailed);
    } finally { setBusy(false); }
  }

  async function remove(poi: Poi) {
    if (!window.confirm(interpolate(t.confirmDelete, { name: poi.name }))) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(endpoint, { method: "DELETE", headers: { "Content-Type": "application/json", "X-SF-Locale": locale === "en" ? "en" : "it" }, body: JSON.stringify({ id: poi.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || (t.deletionFailed));
      if (editing === poi.id) setEditing(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.deletionFailed);
    } finally { setBusy(false); }
  }

  return <FormSection id="pois" title={t.pointsOfInterest} description={t.coordinatesGuidance}>
    {error && <p role="alert" className="mb-3 text-xs font-medium text-rose-700">{error}</p>}
    {pois === null ? <div className="text-sm text-muted">{busy ? t.loading : <button type="button" onClick={() => void load()} className="focus-ring rounded font-bold text-sea">{t.tryAgain}</button>}</div> : <>
      {pois.length ? <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">{pois.map((poi) => <li key={poi.id} className="flex items-center justify-between gap-2 px-3.5 py-2.5"><div className="min-w-0"><p className="text-sm font-semibold text-ink">{poi.name}</p>{poi.address && <p className="mt-0.5 text-xs text-muted">{poi.address}</p>}{poi.latitude !== null && poi.longitude !== null && <p className="mt-0.5 text-[11px] tabular-nums text-muted">{poi.latitude}, {poi.longitude}</p>}</div><div className="flex shrink-0 gap-1"><Button type="button" size="icon" variant="ghost" className="size-9" aria-label={`${t.edit} ${poi.name}`} disabled={busy} onClick={() => edit(poi)}><Pencil size={14} /></Button><Button type="button" size="icon" variant="ghost" className="size-9" aria-label={`${t.delete} ${poi.name}`} disabled={busy} onClick={() => void remove(poi)}><Trash2 size={14} className="text-rose-600" /></Button></div></li>)}</ul> : <p className="text-sm text-muted">{t.noPointsOfInterestAdded}</p>}
      {editing === null && <div className="mt-4 text-xs font-semibold"><Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => edit()}><Plus size={14} /> {t.addPoint}</Button></div>}
      {editing !== null && <form onSubmit={submit} className="mt-4 grid gap-4 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 sm:p-4">
        <Field label={t.nameItalian} required><Input className={inputClass} required minLength={2} maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
        <Field label={t.nameEnglishOptional}><Input className={inputClass} maxLength={120} value={draft.nameEn} onChange={(event) => setDraft({ ...draft, nameEn: event.target.value })} /></Field>
        <Field className="sm:col-span-2" label={t.address}><Input className={inputClass} maxLength={240} value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} /></Field>
        <Field label={t.latitude}><Input className={inputClass} type="number" step="any" min={-90} max={90} value={draft.latitude} onChange={(event) => setDraft({ ...draft, latitude: event.target.value })} placeholder={t.latitudeExample} /></Field>
        <Field label={t.longitude}><Input className={inputClass} type="number" step="any" min={-180} max={180} value={draft.longitude} onChange={(event) => setDraft({ ...draft, longitude: event.target.value })} placeholder={t.longitudeExample} /></Field>
        <Field className="sm:col-span-2" label={t.descriptionItalian}><Textarea className={`${textareaClass} min-h-24`} maxLength={2000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></Field>
        <Field className="sm:col-span-2" label={t.descriptionEnglishOptional}><Textarea className={`${textareaClass} min-h-24`} maxLength={2000} value={draft.descriptionEn} onChange={(event) => setDraft({ ...draft, descriptionEn: event.target.value })} /></Field>
        <div className="flex justify-end gap-2 text-xs font-semibold sm:col-span-2"><Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setEditing(null)}>{t.cancel}</Button><Button type="submit" size="sm" variant="dark" disabled={busy}>{t.savePoint}</Button></div>
      </form>}
    </>}
  </FormSection>;
}
