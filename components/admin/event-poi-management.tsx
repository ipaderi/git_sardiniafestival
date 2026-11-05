"use client";

import { useState } from "react";
import { ChevronDown, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Poi = { id: string; name: string; description: string | null; address: string | null; latitude: number | null; longitude: number | null };
type Draft = { name: string; description: string; address: string; latitude: string; longitude: string };
const emptyDraft: Draft = { name: "", description: "", address: "", latitude: "", longitude: "" };
const inputClass = "focus-ring h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-normal text-ink";
const labelClass = "grid gap-1.5 text-[11px] font-bold text-ink";

export function EventPoiManagement({ eventId }: { eventId: string }) {
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
      const response = await fetch(endpoint, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossibile caricare i punti di interesse.");
      setPois(result.pois);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossibile caricare i punti di interesse.");
    } finally { setBusy(false); }
  }

  function edit(poi?: Poi) {
    setError("");
    setDraft(poi ? { name: poi.name, description: poi.description || "", address: poi.address || "", latitude: poi.latitude?.toString() ?? "", longitude: poi.longitude?.toString() ?? "" } : emptyDraft);
    setEditing(poi?.id ?? "new");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((draft.latitude.trim() === "") !== (draft.longitude.trim() === "")) {
      setError("Indica entrambe le coordinate o lasciale vuote.");
      return;
    }
    const poi = { name: draft.name, description: draft.description || null, address: draft.address || null,
      latitude: draft.latitude.trim() === "" ? null : Number(draft.latitude), longitude: draft.longitude.trim() === "" ? null : Number(draft.longitude) };
    setBusy(true); setError("");
    try {
      const response = await fetch(endpoint, { method: editing === "new" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing === "new" ? poi : { id: editing, poi }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Salvataggio non riuscito.");
      setEditing(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Salvataggio non riuscito.");
    } finally { setBusy(false); }
  }

  async function remove(poi: Poi) {
    if (!window.confirm(`Eliminare il punto di interesse “${poi.name}”?`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(endpoint, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: poi.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Eliminazione non riuscita.");
      if (editing === poi.id) setEditing(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Eliminazione non riuscita.");
    } finally { setBusy(false); }
  }

  return <details className="mt-3" onToggle={(event) => { if (event.currentTarget.open && pois === null && !busy) void load(); }}>
    <summary className="focus-ring inline-flex cursor-pointer list-none items-center gap-1 rounded text-xs font-bold text-sea hover:text-ink"><MapPin size={13} /> Punti di interesse <ChevronDown size={14} /></summary>
    <div className="mt-3 rounded-xl bg-slate-50 p-4">
      {error && <p role="alert" className="mb-3 text-xs text-rose-700">{error}</p>}
      {pois === null ? <div className="text-xs text-muted">{busy ? "Caricamento…" : <button type="button" onClick={() => void load()} className="font-bold text-sea">Riprova a caricare</button>}</div> : <>
        {pois.length ? <ul className="space-y-2">{pois.map((poi) => <li key={poi.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3"><div><p className="text-xs font-bold text-ink">{poi.name}</p>{poi.address && <p className="mt-1 text-xs text-muted">{poi.address}</p>}{poi.latitude !== null && poi.longitude !== null && <p className="mt-1 text-[11px] text-muted">{poi.latitude}, {poi.longitude}</p>}</div><div className="flex gap-1"><Button type="button" size="icon" variant="ghost" aria-label={`Modifica ${poi.name}`} disabled={busy} onClick={() => edit(poi)}><Pencil size={14} /></Button><Button type="button" size="icon" variant="ghost" aria-label={`Elimina ${poi.name}`} disabled={busy} onClick={() => void remove(poi)}><Trash2 size={14} className="text-rose-600" /></Button></div></li>)}</ul> : <p className="text-xs text-muted">Nessun punto di interesse aggiunto.</p>}
        {editing === null && <Button type="button" variant="outline" size="sm" className="mt-3" disabled={busy} onClick={() => edit()}><Plus size={14} /> Aggiungi punto</Button>}
        {editing !== null && <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className={`${labelClass} sm:col-span-2`}>Nome *<Input className={inputClass} required minLength={2} maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label className={`${labelClass} sm:col-span-2`}>Indirizzo<Input className={inputClass} maxLength={240} value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} /></label>
          <label className={labelClass}>Latitudine<Input className={inputClass} type="number" step="any" min={-90} max={90} value={draft.latitude} onChange={(event) => setDraft({ ...draft, latitude: event.target.value })} placeholder="Es. 39.2238" /></label>
          <label className={labelClass}>Longitudine<Input className={inputClass} type="number" step="any" min={-180} max={180} value={draft.longitude} onChange={(event) => setDraft({ ...draft, longitude: event.target.value })} placeholder="Es. 9.1217" /></label>
          <p className="text-[11px] text-muted sm:col-span-2">Le coordinate sono facoltative; se presenti, il punto appare sulla mappa.</p>
          <label className={`${labelClass} sm:col-span-2`}>Descrizione<textarea className="focus-ring min-h-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-ink" maxLength={2000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setEditing(null)}>Annulla</Button><Button type="submit" size="sm" disabled={busy}>Salva punto</Button></div>
        </form>}
      </>}
    </div>
  </details>;
}
