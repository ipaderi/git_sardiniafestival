"use client";

import { useState } from "react";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { emptyScheduleDate, EventScheduleFields, serializeSchedule, validateSchedule, type EventType } from "@/components/events/event-schedule-fields";
import { ComuneSelect } from "@/components/site/comune-select";
import { eventCategories } from "@/lib/event-categories";

const categories = eventCategories.map((category) => category.name);

export function SubmitEventForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [eventType, setEventType] = useState<EventType>("SINGLE_DAY");
  const [dates, setDates] = useState([emptyScheduleDate()]);

  async function submit(form: React.FormEvent<HTMLFormElement>) {
    form.preventDefault();
    const scheduleError = validateSchedule(eventType, dates);
    if (scheduleError) { setStatus("error"); setMessage(scheduleError); return; }
    setStatus("sending");
    setMessage("");
    const formData = new FormData(form.currentTarget);
    try {
      const body = { ...Object.fromEntries(formData.entries()), eventType, dates: serializeSchedule(eventType, dates) };
      const response = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Non è stato possibile inviare l'evento.");
      setStatus("done");
      setMessage(result.message);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Controlla la connessione e riprova.");
    }
  }

  if (status === "done") return <div role="status" className="rounded-3xl border border-teal-200 bg-[#e7f5f2] p-8 text-center"><CheckCircle2 className="mx-auto text-sea" size={38} /><h2 className="mt-4 font-display text-2xl font-semibold text-ink">Grazie, ci siamo!</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">{message}</p><button onClick={() => { setEventType("SINGLE_DAY"); setDates([emptyScheduleDate()]); setStatus("idle"); }} className="focus-ring mt-5 rounded px-3 py-2 text-sm font-bold text-sea">Invia un altro evento</button></div>;

  const field = "grid gap-2 text-xs font-bold text-ink";
  const select = "focus-ring h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-normal text-ink";
  return <form onSubmit={submit} className="space-y-7">
    <div><h2 className="font-display text-xl font-semibold text-ink">Raccontaci il tuo evento</h2><p className="mt-1 text-xs leading-5 text-muted">I campi con * sono obbligatori. Ogni segnalazione viene verificata prima della pubblicazione.</p></div>
    <div className="grid gap-5 sm:grid-cols-2">
      <label className={`${field} sm:col-span-2`}>Nome dell'evento *<Input required name="title" minLength={4} maxLength={120} placeholder="Es. Festa di San Giovanni" /></label>
      <label className={field}>Categoria *<select name="category" required className={select}><option value="">Scegli una categoria</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      <EventScheduleFields type={eventType} onTypeChange={setEventType} dates={dates} onDatesChange={setDates} />
      {(eventType === "SINGLE_DAY" || eventType === "MULTI_DAY") && <>
        <label className={field}>Comune e provincia *<ComuneSelect required name="comuneId" className={select} /></label>
        <label className={field}>Luogo *<Input required name="venue" minLength={2} maxLength={120} placeholder="Piazza, teatro, spazio…" /></label>
      </>}
      {eventType === "ONLINE" && <label className={field}>Link per partecipare *<Input required name="onlineUrl" type="url" placeholder="https://" /></label>}
      <label className={field}>Prezzo / accesso<Input name="price" maxLength={80} placeholder="Gratuito o da 15 €" /></label>
      <label className={field}>Sito per informazioni<Input name="website" type="url" placeholder="https://" /></label>
      <label className={`${field} sm:col-span-2`}>Descrizione *<Textarea required name="description" minLength={30} maxLength={5000} placeholder="Che cosa succede? Cosa rende speciale questo appuntamento?" /></label>
      <label className={`${field} sm:col-span-2`}>La tua email per eventuali chiarimenti<Input name="contactEmail" type="email" placeholder="nome@esempio.it" /></label>
    </div>
    {message && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{message}</p>}
    <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-md text-[11px] leading-5 text-muted">Inviando il modulo confermi di poter condividere queste informazioni e autorizzi la verifica editoriale.</p><Button type="submit" size="lg" disabled={status === "sending"}>{status === "sending" ? <><LoaderCircle size={17} className="animate-spin" /> Invio in corso</> : <><Send size={16} /> Invia l'evento</>}</Button></div>
  </form>;
}
