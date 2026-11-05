"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { EventScheduleFields, emptyScheduleDate, serializeSchedule, validateSchedule, type EventType } from "@/components/events/event-schedule-fields";
import { ComuneSelect } from "@/components/site/comune-select";
import { categoryName, eventCategories } from "@/lib/event-categories";

export function EventWizard({ locale }: { locale: string }) {
  const en = locale === "en";
  const [step, setStep] = useState(0);
  const [type, setType] = useState<EventType>("SINGLE_DAY");
  const [dates, setDates] = useState([emptyScheduleDate()]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [done, setDone] = useState(false);
  const [review, setReview] = useState<Record<string, string>>({});
  const form = useRef<HTMLFormElement>(null);
  const labels = en ? ["Event details", "Dates and venue", "Additional information", "Review"] : ["L'evento", "Date e luogo", "Altre informazioni", "Riepilogo"];
  const label = "grid gap-2 text-xs font-bold text-ink";
  const select = "focus-ring h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-normal text-ink";
  function validateStep(index: number) {
    const fieldset = form.current?.querySelector<HTMLElement>(`[data-step="${index}"]`);
    if (fieldset?.querySelector("select[required]:disabled")) {
      setStep(index);
      setError(en ? "Wait until the municipality list is available." : "Attendi che l'elenco dei comuni sia disponibile.");
      return false;
    }
    for (const input of Array.from(fieldset?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input,textarea,select") || [])) {
      if (!input.checkValidity()) {
        if (index !== step) {
          setStep(index);
          requestAnimationFrame(() => input.reportValidity());
        } else input.reportValidity();
        return false;
      }
    }
    const scheduleError = index === 1 ? validateSchedule(type, dates, locale) : "";
    if (scheduleError) {
      setStep(index); setError(scheduleError); return false;
    }
    if (index === 1 && type === "ONLINE") {
      const input = fieldset?.querySelector<HTMLInputElement>('input[name="onlineUrl"]');
      try {
        if (!input || !["http:", "https:"].includes(new URL(input.value).protocol)) throw new Error();
      } catch {
        setStep(index); setError(en ? "Enter an HTTP or HTTPS link to the online event." : "Inserisci un link HTTP o HTTPS per l'evento online.");
        return false;
      }
    }
    setError(""); return true;
  }
  function next() {
    if (!validateStep(step)) return;
    if (step === 2 && form.current) {
      const values = Object.fromEntries(Array.from(new FormData(form.current).entries()).map(([key, value]) => [key, String(value)]));
      const municipality = form.current.querySelector<HTMLSelectElement>('select[name="comuneId"]');
      setReview({ ...values, municipality: municipality?.selectedOptions[0]?.textContent?.trim() || "" });
    }
    setStep((s) => Math.min(3, s + 1));
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== 3) { next(); return; }
    for (let index = 0; index < 3; index++) if (!validateStep(index)) { setStep(index); return; }
    setBusy(true); setError(""); setSessionExpired(false);
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, requireAccount: true, eventType: type, dates: serializeSchedule(type, dates) }) });
      if (response.status === 401) {
        setSessionExpired(true);
        throw new Error(en ? "Your session has expired. Sign in in a new tab, then return here and submit again." : "La sessione è scaduta. Accedi in una nuova scheda, poi torna qui e invia di nuovo.");
      }
      if (!response.ok) throw new Error(en ? "We could not submit the event. Check the information and try again." : "Non è stato possibile inviare l'evento. Controlla i dati e riprova.");
      setDone(true);
    } catch (err) { setError(err instanceof Error ? err.message : (en ? "Connection error. Try again." : "Errore di connessione. Riprova.")); }
    finally { setBusy(false); }
  }
  if (done) return <div role="status" className="rounded-3xl border border-teal-200 bg-[#e7f5f2] p-8 text-center"><CheckCircle2 className="mx-auto text-sea" size={38}/><h2 className="mt-4 font-display text-2xl font-semibold">{en ? "Event submitted" : "Evento inviato"}</h2><p className="mt-2 text-sm">{en ? "Your event will be reviewed before publication. You can follow its status in your dashboard." : "L'evento sarà verificato prima della pubblicazione. Puoi seguirne lo stato nella tua dashboard."}</p><Link className="mt-5 inline-block font-bold text-sea" href={`/${locale}/dashboard`}>{en ? "Back to dashboard" : "Torna alla dashboard"}</Link></div>;
  return <form ref={form} noValidate onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
    <ol aria-label={en ? "Creation steps" : "Passaggi di creazione"} className="mb-8 grid grid-cols-4 gap-2">{labels.map((text, index) => <li key={text} aria-current={step === index ? "step" : undefined} className={`border-t-2 pt-2 text-[10px] font-bold sm:text-xs ${step >= index ? "border-sea text-sea" : "border-slate-200 text-muted"}`}><span className="block sm:inline">{index + 1}. </span>{text}</li>)}</ol>
    <div data-step="0" hidden={step !== 0} className="space-y-5"><div><h2 className="font-display text-2xl font-semibold">{labels[0]}</h2><p className="mt-1 text-sm text-muted">{en ? "Tell us what is happening." : "Raccontaci cosa succede."}</p></div><label className={label}>{en ? "Event name (Italian)" : "Nome evento (italiano)"} *<Input required name="title" minLength={4} maxLength={120} /></label><label className={label}>{en ? "Category" : "Categoria"} *<select required name="category" className={select}><option value="">{en ? "Select a category" : "Scegli una categoria"}</option>{eventCategories.map((category) => <option key={category.name} value={category.name}>{categoryName(category.name, locale)}</option>)}</select></label><label className={label}>{en ? "Description (Italian)" : "Descrizione (italiano)"} *<Textarea required name="description" minLength={30} maxLength={5000} /></label><label className={label}>{en ? "Event name (English, optional)" : "Nome evento (inglese, facoltativo)"}<Input name="titleEn" maxLength={120} /></label><label className={label}>{en ? "Description (English, optional)" : "Descrizione (inglese, facoltativa)"}<Textarea name="descriptionEn" maxLength={5000} /></label></div>
    <div data-step="1" hidden={step !== 1} className="space-y-5"><h2 className="font-display text-2xl font-semibold">{labels[1]}</h2><EventScheduleFields locale={locale} type={type} onTypeChange={setType} dates={dates} onDatesChange={setDates} />{(type === "SINGLE_DAY" || type === "MULTI_DAY") && <div className="grid gap-5 sm:grid-cols-2"><label className={label}>{en ? "Municipality and province" : "Comune e provincia"} *<ComuneSelect locale={locale} required name="comuneId" className={select} /></label><label className={label}>{en ? "Venue" : "Luogo"} *<Input required name="venue" minLength={2} maxLength={120}/></label></div>}{type === "ONLINE" && <label className={label}>{en ? "Participation link" : "Link per partecipare"} *<Input required name="onlineUrl" type="url" placeholder="https://" /></label>}</div>
    <div data-step="2" hidden={step !== 2} className="space-y-5"><h2 className="font-display text-2xl font-semibold">{labels[2]}</h2><label className={label}>{en ? "Subcategory (Italian, optional)" : "Sottocategoria (italiano, facoltativa)"}<Input name="subcategory" maxLength={80}/></label><label className={label}>{en ? "Subcategory (English, optional)" : "Sottocategoria (inglese, facoltativa)"}<Input name="subcategoryEn" maxLength={80}/></label><label className={label}>{en ? "Price / admission (Italian)" : "Prezzo / accesso (italiano)"}<Input name="price" maxLength={80}/></label><label className={label}>{en ? "Price / admission (English, optional)" : "Prezzo / accesso (inglese, facoltativo)"}<Input name="priceEn" maxLength={80}/></label><label className={label}>{en ? "Information website" : "Sito per informazioni"}<Input name="website" type="url" placeholder="https://"/></label><label className={label}>{en ? "Contact email" : "Email di contatto"}<Input name="contactEmail" type="email" /></label></div>
    <div data-step="3" hidden={step !== 3} className="space-y-3"><h2 className="font-display text-2xl font-semibold">{labels[3]}</h2><p className="text-sm leading-6 text-muted">{en ? "Check the information using the previous steps. Your event will be submitted for editorial review." : "Controlla le informazioni nei passaggi precedenti. L'evento sarà inviato per la revisione editoriale."}</p><dl className="rounded-2xl bg-[#f6f7f4] p-5 text-sm"><dt className="text-muted">{en ? "Event" : "Evento"}</dt><dd className="mt-1 font-semibold">{review.title}</dd><dt className="mt-4 text-muted">{en ? "Category" : "Categoria"}</dt><dd className="mt-1 font-semibold">{review.category}</dd><dt className="mt-4 text-muted">{en ? "Description" : "Descrizione"}</dt><dd className="mt-1 whitespace-pre-wrap">{review.description}</dd><dt className="mt-4 text-muted">{en ? "Dates (Italian time)" : "Date (ora italiana)"}</dt>{(type === "SINGLE_DAY" ? dates.slice(0, 1) : dates).map((date, index) => <dd className="mt-1" key={index}>{date.startsAt.replace("T", " ")}{date.endsAt ? ` – ${date.endsAt.replace("T", " ")}` : ""}{type === "MULTI_LOCATION" && date.venue ? ` · ${date.venue}, ${date.city}` : ""}</dd>)}{review.venue && <><dt className="mt-4 text-muted">{en ? "Venue" : "Luogo"}</dt><dd className="mt-1">{review.venue}</dd></>}{review.municipality && <><dt className="mt-4 text-muted">{en ? "Municipality" : "Comune"}</dt><dd className="mt-1">{review.municipality}</dd></>}{review.onlineUrl && <><dt className="mt-4 text-muted">{en ? "Participation link" : "Link per partecipare"}</dt><dd className="mt-1 break-all">{review.onlineUrl}</dd></>}{review.titleEn && <><dt className="mt-4 text-muted">{en ? "English title" : "Titolo inglese"}</dt><dd className="mt-1">{review.titleEn}</dd></>}{review.descriptionEn && <><dt className="mt-4 text-muted">{en ? "English description" : "Descrizione inglese"}</dt><dd className="mt-1 whitespace-pre-wrap">{review.descriptionEn}</dd></>}</dl></div>
    {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {sessionExpired && <Link href={`/${locale}/auth/login`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-bold text-sea underline">{en ? "Sign in in a new tab" : "Accedi in una nuova scheda"}</Link>}
    <div className="mt-8 flex justify-between gap-3 border-t border-slate-100 pt-5">{step > 0 ? <Button type="button" variant="outline" onClick={() => { setError(""); setStep(step - 1); }}><ArrowLeft size={15}/>{en ? "Back" : "Indietro"}</Button> : <Link href={`/${locale}/dashboard`} className="self-center text-sm font-bold text-muted">{en ? "Cancel" : "Annulla"}</Link>}{step < 3 ? <Button type="button" onClick={next}>{en ? "Continue" : "Continua"}<ArrowRight size={15}/></Button> : <Button type="submit" disabled={busy}>{busy ? (en ? "Submitting…" : "Invio…") : (en ? "Submit event" : "Invia evento")}</Button>}</div>
  </form>;
}
