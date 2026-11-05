"use client";

import { useState } from "react";
import { ComuneSelect, type ComuneOption } from "@/components/site/comune-select";

type City = { id: string; comuneId: string | null; name: string; slug: string; province: string; description: string; descriptionEn: string | null; imageUrl: string | null; featured: boolean; sortOrder: number };

type Form = { comuneId: string; description: string; descriptionEn: string; imageUrl: string; featured: boolean; sortOrder: number };
const emptyForm: Form = { comuneId: "", description: "", descriptionEn: "", imageUrl: "", featured: true, sortOrder: 0 };
const fieldClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink focus:border-sea focus:outline-none focus:ring-2 focus:ring-sea/20";

export function FeaturedCityManagement({ initialCities, locale }: { initialCities: City[]; locale: string }) {
  const en = locale === "en";
  const [cities, setCities] = useState(initialCities);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  function editCity(city: City) {
    if (!city.comuneId) return;
    setForm({ comuneId: city.comuneId, description: city.description, descriptionEn: city.descriptionEn ?? "", imageUrl: city.imageUrl ?? "", featured: city.featured, sortOrder: city.sortOrder });
    setMessage("");
    document.getElementById("featured-city-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectComune(comune: ComuneOption | null) {
    const saved = cities.find((city) => city.comuneId === comune?.id);
    setForm(saved ? { comuneId: comune!.id, description: saved.description, descriptionEn: saved.descriptionEn ?? "", imageUrl: saved.imageUrl ?? "", featured: saved.featured, sortOrder: saved.sortOrder } : { ...emptyForm, comuneId: comune?.id ?? "" });
    setMessage("");
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setMessage(""); setError(false);
    try {
      const response = await fetch("/api/admin/featured-cities", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) {
        const msg = result.error === "duplicate_city"
          ? (en ? "This town has duplicate entries. Resolve them before saving." : "Questo comune ha più schede. Risolvi i duplicati prima di salvare.")
          : result.error === "invalid_city"
            ? (en ? "Choose a town from the list." : "Seleziona un comune dall'elenco.")
            : (en ? "Could not save the town. Check the fields and try again." : "Impossibile salvare il comune. Controlla i campi e riprova.");
        throw new Error(msg);
      }
      const city: City = result.city;
      setCities((current) => [...current.filter((item) => item.id !== city.id), city].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "it")));
      setMessage(en ? "Town saved." : "Comune salvato.");
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : en ? "Could not save. Please try again." : "Salvataggio non riuscito. Riprova.");
    } finally { setSaving(false); }
  }

  return <div className="space-y-8">
    <form id="featured-city-form" onSubmit={save} className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="font-display text-xl font-semibold text-ink">{en ? "Add or edit a town" : "Aggiungi o modifica un comune"}</h2>
      <p className="mt-2 text-sm text-muted">{en ? "Choose an existing town to edit its details. The first three active towns appear on the home page, ordered by the number below." : "Seleziona un comune già presente per modificarlo. In home compaiono i primi tre comuni attivi, in base all'ordine indicato."}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-ink">{en ? "Town" : "Comune"} *<ComuneSelect locale={locale} value={form.comuneId} required className={fieldClass} onChange={selectComune} /></label>
        <label className="text-sm font-semibold text-ink">{en ? "Display order" : "Ordine di visualizzazione"}<input type="number" min={0} max={10000} required value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))} className={fieldClass} /></label>
        <label className="text-sm font-semibold text-ink sm:col-span-2">{en ? "Description (Italian)" : "Descrizione (italiano)"}<textarea maxLength={500} rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className={fieldClass} /></label>
        <label className="text-sm font-semibold text-ink sm:col-span-2">{en ? "Description (English, optional)" : "Descrizione (inglese, facoltativa)"}<textarea maxLength={500} rows={3} value={form.descriptionEn} onChange={(event) => setForm((current) => ({ ...current, descriptionEn: event.target.value }))} className={fieldClass} /></label>
        <label className="text-sm font-semibold text-ink sm:col-span-2">{en ? "Image URL" : "URL immagine"}<input type="url" maxLength={2048} value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="https://…" className={fieldClass} /></label>
      </div>
      <label className="mt-5 flex items-center gap-2 text-sm font-semibold text-ink"><input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} className="size-4 accent-teal-700" />{en ? "Show as featured" : "Mostra in evidenza"}</label>
      <div className="mt-5 flex flex-wrap items-center gap-4"><button type="submit" disabled={saving || !form.comuneId} className="rounded-xl bg-sea-bright px-5 py-3 text-sm font-bold text-ink disabled:opacity-50">{saving ? (en ? "Saving…" : "Salvataggio…") : (en ? "Save town" : "Salva comune")}</button>{message && <p role="status" className={`text-sm ${error ? "text-rose-700" : "text-sea"}`}>{message}</p>}</div>
    </form>
    <section><h2 className="font-display text-xl font-semibold text-ink">{en ? "Saved towns" : "Comuni salvati"}</h2>{cities.length ? <div className="mt-4 grid gap-3">{cities.map((city) => <div key={city.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"><div><p className="font-semibold text-ink">{city.name} <span className="text-xs text-muted">({city.province})</span></p><p className="mt-1 text-xs text-muted">{city.featured ? (en ? "Featured" : "In evidenza") : (en ? "Inactive" : "Non in evidenza")} · {en ? "Order" : "Ordine"}: {city.sortOrder}</p>{!city.comuneId && <p className="mt-1 text-xs text-rose-700">{en ? "Town no longer found in the registry." : "Comune non trovato nell'anagrafica."}</p>}</div><button type="button" disabled={!city.comuneId} onClick={() => editCity(city)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-ink hover:bg-slate-50 disabled:opacity-50">{en ? "Edit" : "Modifica"}</button></div>)}</div> : <p className="mt-3 text-sm text-muted">{en ? "No towns saved yet." : "Nessun comune salvato."}</p>}</section>
  </div>;
}
