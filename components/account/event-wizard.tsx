"use client";

import { dictionary } from "@/lib/dictionary";
import it from "@/messages/it/account.json";
import enMessages from "@/messages/en/account.json";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { EventScheduleFields, emptyScheduleDate, serializeSchedule, validateSchedule, type EventType } from "@/components/events/event-schedule-fields";
import { ComuneSelect } from "@/components/site/comune-select";
import { categoryName, eventCategories } from "@/lib/event-categories";

export function EventWizard({ locale }: { locale: string }) {
  const t = dictionary(locale, it, enMessages).wizard;
  const [step, setStep] = useState(0);
  const [type, setType] = useState<EventType>("SINGLE_DAY");
  const [dates, setDates] = useState([emptyScheduleDate()]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [done, setDone] = useState(false);
  const [review, setReview] = useState<Record<string, string>>({});
  const form = useRef<HTMLFormElement>(null);
  const labels = t.steps;
  const label = "grid gap-2 text-xs font-bold text-ink";
  const select = "focus-ring h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-normal text-ink";
  function validateStep(index: number) {
    const fieldset = form.current?.querySelector<HTMLElement>(`[data-step="${index}"]`);
    if (fieldset?.querySelector("select[required]:disabled")) {
      setStep(index);
      setError(t.waitUntilTheMunicipalityListIsAvailable);
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
        setStep(index); setError(t.enterAnHttpOrHttpsLinkTo);
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
      const response = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json", "X-SF-Locale": locale === "en" ? "en" : "it" }, body: JSON.stringify({ ...data, requireAccount: true, eventType: type, dates: serializeSchedule(type, dates) }) });
      if (response.status === 401) {
        setSessionExpired(true);
        throw new Error(t.yourSessionHasExpiredSignInIn);
      }
      if (!response.ok) throw new Error(t.weCouldNotSubmitTheEventCheck);
      setDone(true);
    } catch (err) { setError(err instanceof Error ? err.message : (t.connectionErrorTryAgain)); }
    finally { setBusy(false); }
  }
  if (done) return <div role="status" className="rounded-3xl border border-teal-200 bg-[#e7f5f2] p-8 text-center"><CheckCircle2 className="mx-auto text-sea" size={38}/><h2 className="mt-4 font-display text-2xl font-semibold">{t.eventSubmitted}</h2><p className="mt-2 text-sm">{t.yourEventWillBeReviewedBeforePublication}</p><Link className="mt-5 inline-block font-bold text-sea" href={`/${locale}/dashboard`}>{t.backToDashboard}</Link></div>;
  return <form ref={form} noValidate onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
    <ol aria-label={t.creationSteps} className="mb-8 grid grid-cols-4 gap-2">{labels.map((text, index) => <li key={text} aria-current={step === index ? "step" : undefined} className={`border-t-2 pt-2 text-[10px] font-bold sm:text-xs ${step >= index ? "border-sea text-sea" : "border-slate-200 text-muted"}`}><span className="block sm:inline">{index + 1}. </span>{text}</li>)}</ol>
    <div data-step="0" hidden={step !== 0} className="space-y-5"><div><h2 className="font-display text-2xl font-semibold">{labels[0]}</h2><p className="mt-1 text-sm text-muted">{t.tellUsWhatIsHappening}</p></div><label className={label}>{t.eventNameItalian} *<Input required name="title" minLength={4} maxLength={120} /></label><label className={label}>{t.category} *<select required name="category" className={select}><option value="">{t.selectACategory}</option>{eventCategories.map((category) => <option key={category.name} value={category.name}>{categoryName(category.name, locale)}</option>)}</select></label><label className={label}>{t.descriptionItalian} *<Textarea required name="description" minLength={30} maxLength={5000} /></label><label className={label}>{t.eventNameEnglishOptional}<Input name="titleEn" maxLength={120} /></label><label className={label}>{t.descriptionEnglishOptional}<Textarea name="descriptionEn" maxLength={5000} /></label></div>
    <div data-step="1" hidden={step !== 1} className="space-y-5"><h2 className="font-display text-2xl font-semibold">{labels[1]}</h2><EventScheduleFields locale={locale} type={type} onTypeChange={setType} dates={dates} onDatesChange={setDates} />{(type === "SINGLE_DAY" || type === "MULTI_DAY") && <div className="grid gap-5 sm:grid-cols-2"><label className={label}>{t.municipalityAndProvince} *<ComuneSelect locale={locale} required name="comuneId" className={select} /></label><label className={label}>{t.venue} *<Input required name="venue" minLength={2} maxLength={120}/></label></div>}{type === "ONLINE" && <label className={label}>{t.participationLink} *<Input required name="onlineUrl" type="url" placeholder="https://" /></label>}</div>
    <div data-step="2" hidden={step !== 2} className="space-y-5"><h2 className="font-display text-2xl font-semibold">{labels[2]}</h2><label className={label}>{t.subcategoryItalianOptional}<Input name="subcategory" maxLength={80}/></label><label className={label}>{t.subcategoryEnglishOptional}<Input name="subcategoryEn" maxLength={80}/></label><label className={label}>{t.priceAdmissionItalian}<Input name="price" maxLength={80}/></label><label className={label}>{t.priceAdmissionEnglishOptional}<Input name="priceEn" maxLength={80}/></label><label className={label}>{t.informationWebsite}<Input name="website" type="url" placeholder="https://"/></label><label className={label}>{t.contactEmail}<Input name="contactEmail" type="email" /></label></div>
    <div data-step="3" hidden={step !== 3} className="space-y-3"><h2 className="font-display text-2xl font-semibold">{labels[3]}</h2><p className="text-sm leading-6 text-muted">{t.checkTheInformationUsingThePreviousSteps}</p><dl className="rounded-2xl bg-[#f6f7f4] p-5 text-sm"><dt className="text-muted">{t.event}</dt><dd className="mt-1 font-semibold">{review.title}</dd><dt className="mt-4 text-muted">{t.category}</dt><dd className="mt-1 font-semibold">{review.category}</dd><dt className="mt-4 text-muted">{t.description}</dt><dd className="mt-1 whitespace-pre-wrap">{review.description}</dd><dt className="mt-4 text-muted">{t.datesItalianTime}</dt>{(type === "SINGLE_DAY" ? dates.slice(0, 1) : dates).map((date, index) => <dd className="mt-1" key={index}>{date.startsAt.replace("T", " ")}{date.endsAt ? ` – ${date.endsAt.replace("T", " ")}` : ""}{type === "MULTI_LOCATION" && date.venue ? ` · ${date.venue}, ${date.city}` : ""}</dd>)}{review.venue && <><dt className="mt-4 text-muted">{t.venue}</dt><dd className="mt-1">{review.venue}</dd></>}{review.municipality && <><dt className="mt-4 text-muted">{t.municipality}</dt><dd className="mt-1">{review.municipality}</dd></>}{review.onlineUrl && <><dt className="mt-4 text-muted">{t.participationLink}</dt><dd className="mt-1 break-all">{review.onlineUrl}</dd></>}{review.titleEn && <><dt className="mt-4 text-muted">{t.englishTitle}</dt><dd className="mt-1">{review.titleEn}</dd></>}{review.descriptionEn && <><dt className="mt-4 text-muted">{t.englishDescription}</dt><dd className="mt-1 whitespace-pre-wrap">{review.descriptionEn}</dd></>}</dl></div>
    {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {sessionExpired && <Link href={`/${locale}/auth/login`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-bold text-sea underline">{t.signInInANewTab}</Link>}
    <div className="mt-8 flex justify-between gap-3 border-t border-slate-100 pt-5">{step > 0 ? <Button type="button" variant="outline" onClick={() => { setError(""); setStep(step - 1); }}><ArrowLeft size={15}/>{t.back}</Button> : <Link href={`/${locale}/dashboard`} className="self-center text-sm font-bold text-muted">{t.cancel}</Link>}{step < 3 ? <Button type="button" onClick={next}>{t.continue}<ArrowRight size={15}/></Button> : <Button type="submit" disabled={busy}>{busy ? (t.submitting) : (t.submitEvent)}</Button>}</div>
  </form>;
}
