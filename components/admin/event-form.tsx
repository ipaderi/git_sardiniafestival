"use client";

import { dictionary, interpolate } from "@/lib/dictionary";
import adminIt from "@/messages/it/admin.json";
import adminEn from "@/messages/en/admin.json";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field, FormSection, inputClass, selectClass, textareaClass } from "@/components/admin/event-form-fields";
import { EventScheduleEditor, type ContentLang, type EditorDate } from "@/components/admin/event-schedule-editor";
import { ComuneSelect } from "@/components/site/comune-select";
import { emptyScheduleDate, occurrenceError, serializeSchedule, validateSchedule, type EventType } from "@/components/events/event-schedule-fields";
import { categoryName, eventCategories } from "@/lib/event-categories";
import { toLocalDateTime } from "@/lib/event-wall-clock";
import { cn } from "@/lib/utils";

export type EventFormInitial = {
  id: string; title: string; titleEn: string | null; description: string; descriptionEn: string | null; category: string; subcategory: string | null; subcategoryEn: string | null;
  location: string | null; province: string | null; venue: string | null; comuneId: string | null; startsAt: string | Date; endsAt: string | Date | null; eventType: EventType; onlineUrl: string | null;
  price: string | null; priceEn: string | null; website: string | null; contactEmail: string | null;
  dates: { startsAt: string | Date; endsAt: string | Date | null; label: string | null; labelEn: string | null; venue: string | null; address: string | null; city: string | null; province: string | null; comuneId: string | null; latitude: number | null; longitude: number | null }[];
};

type Draft = {
  title: string; titleEn: string; category: string; subcategory: string; subcategoryEn: string; description: string; descriptionEn: string; eventType: EventType; onlineUrl: string;
  comuneId: string; location: string; province: string; venue: string; price: string; priceEn: string; website: string; contactEmail: string; status: "PENDING" | "PUBLISHED"; featured: boolean; dates: EditorDate[];
};
type FieldKey = "title" | "category" | "description" | "comuneId" | "venue" | "onlineUrl" | "website" | "contactEmail" | "schedule";
type Errors = Partial<Record<FieldKey, string>>;

function toDraft(event?: EventFormInitial): Draft {
  const dates: EditorDate[] = event?.dates.length ? event.dates.map((date, index) => ({
    uid: `d${index}`, startsAt: toLocalDateTime(date.startsAt), endsAt: toLocalDateTime(date.endsAt), label: date.label || "", labelEn: date.labelEn || "",
    originalStartsAt: new Date(date.startsAt).toISOString(), originalEndsAt: date.endsAt ? new Date(date.endsAt).toISOString() : undefined,
    venue: date.venue || "", address: date.address || "", city: date.city || "", province: date.province || "", comuneId: date.comuneId || "", latitude: date.latitude, longitude: date.longitude,
  })) : [{ ...emptyScheduleDate(), uid: "d0", startsAt: toLocalDateTime(event?.startsAt), endsAt: toLocalDateTime(event?.endsAt), originalStartsAt: event ? new Date(event.startsAt).toISOString() : undefined, originalEndsAt: event?.endsAt ? new Date(event.endsAt).toISOString() : undefined }];
  return {
    title: event?.title || "", titleEn: event?.titleEn || "", category: event?.category || "", subcategory: event?.subcategory || "", subcategoryEn: event?.subcategoryEn || "",
    description: event?.description || "", descriptionEn: event?.descriptionEn || "", eventType: event?.eventType || "SINGLE_DAY", onlineUrl: event?.onlineUrl || "",
    comuneId: event?.comuneId || "", location: event?.location || "", province: event?.province || "", venue: event?.venue || "",
    price: event?.price || "", priceEn: event?.priceEn || "", website: event?.website || "", contactEmail: event?.contactEmail || "", status: "PENDING", featured: false, dates,
  };
}

const isHttpUrl = (value: string) => { try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } };

export function EventForm({ event, locale = "it" }: { event?: EventFormInitial; locale?: string }) {
  const t = dictionary(locale, adminIt, adminEn).eventForm;
  const router = useRouter();
  const editing = !!event;
  const eventsHref = `/${locale}/dashboard/admin/events`;
  const cancelHref = event ? `${eventsHref}/${event.id}` : eventsHref;
  const [draft, setDraft] = useState<Draft>(() => toDraft(event));
  const [lang, setLang] = useState<ContentLang>("it");
  const [openIds, setOpenIds] = useState<string[]>(() => draft.dates.length === 1 ? [draft.dates[0].uid] : []);
  const [errors, setErrors] = useState<Errors>({});
  const [showScheduleErrors, setShowScheduleErrors] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const baseline = useRef(JSON.stringify(draft));
  const nextUid = useRef(draft.dates.length);
  const createUid = () => `d${nextUid.current++}`;
  const dirty = JSON.stringify(draft) !== baseline.current;
  const legacyCategory = !!event && !eventCategories.some((category) => category.name === event.category);
  const englishMissing = !draft.titleEn.trim() || !draft.descriptionEn.trim();
  const en = lang === "en";

  useEffect(() => {
    if (!dirty) return;
    const warn = (unload: BeforeUnloadEvent) => unload.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function change(changes: Partial<Draft>, cleared: FieldKey[] = []) {
    setDraft((current) => ({ ...current, ...changes }));
    setJustSaved(false);
    if (cleared.length) setErrors((current) => { const next = { ...current }; cleared.forEach((key) => delete next[key]); return next; });
  }

  // Changing type carries the place across, so nobody has to retype it.
  function changeType(eventType: EventType) {
    const { eventType: previous, comuneId, location, province, venue } = draft;
    let dates = draft.dates;
    const changes: Partial<Draft> = { eventType };
    if (eventType === "MULTI_LOCATION") {
      dates = dates.map((date) => date.comuneId ? date : { ...date, comuneId, city: location, province, venue: date.venue || venue });
      if (dates.length < 2) dates = [...dates, { ...emptyScheduleDate(), uid: createUid() }];
    } else if (previous === "MULTI_LOCATION" && eventType !== "ONLINE" && !comuneId && dates[0]?.comuneId) {
      Object.assign(changes, { comuneId: dates[0].comuneId, location: dates[0].city, province: dates[0].province, venue: venue || dates[0].venue });
    }
    change({ ...changes, dates }, ["schedule", "comuneId", "venue", "onlineUrl"]);
    if (eventType !== "SINGLE_DAY") {
      const incomplete = dates.filter((date) => occurrenceError(eventType, date, locale)).map((date) => date.uid);
      if (incomplete.length) setOpenIds(incomplete);
    }
  }

  function validate() {
    const next: Errors = {};
    if (draft.title.trim().length < 4) next.title = t.errors.title;
    if (!draft.category) next.category = t.errors.category;
    if (draft.description.trim().length < 30) next.description = t.errors.description;
    if (draft.eventType === "SINGLE_DAY" || draft.eventType === "MULTI_DAY") {
      if (!draft.comuneId) next.comuneId = t.errors.comune;
      if (draft.venue.trim().length < 2) next.venue = t.errors.venue;
    }
    if (draft.eventType === "ONLINE" && !isHttpUrl(draft.onlineUrl.trim())) next.onlineUrl = t.errors.url;
    if (draft.website.trim() && !isHttpUrl(draft.website.trim())) next.website = t.errors.url;
    if (draft.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contactEmail.trim())) next.contactEmail = t.errors.email;
    const scheduleError = validateSchedule(draft.eventType, draft.dates, locale);
    if (scheduleError) next.schedule = scheduleError;
    return next;
  }

  function revealFirstError(next: Errors) {
    if (next.title || next.description || next.category) setLang("it");
    const key = (["title", "category", "description", "schedule", "comuneId", "venue", "onlineUrl", "website", "contactEmail"] as FieldKey[]).find((candidate) => next[candidate]);
    requestAnimationFrame(() => {
      const element = document.getElementById(key === "schedule" ? "schedule" : `field-${key}`);
      element?.scrollIntoView({ block: "center" });
      if (key !== "schedule") element?.focus({ preventScroll: true });
    });
  }

  async function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const next = validate();
    setErrors(next); setFormError("");
    setShowScheduleErrors(!!next.schedule);
    if (next.schedule && draft.eventType !== "SINGLE_DAY") {
      const failing = draft.dates.filter((date) => occurrenceError(draft.eventType, date, locale)).map((date) => date.uid);
      if (failing.length) setOpenIds(failing);
    }
    if (Object.keys(next).length) { revealFirstError(next); return; }

    const shared = draft.eventType === "SINGLE_DAY" || draft.eventType === "MULTI_DAY";
    const payload = {
      title: draft.title, titleEn: draft.titleEn, subcategory: draft.subcategory, subcategoryEn: draft.subcategoryEn, description: draft.description, descriptionEn: draft.descriptionEn,
      // An unchanged legacy category can remain until an editor assigns a canonical one.
      ...(legacyCategory && draft.category === event?.category ? {} : { category: draft.category }),
      eventType: draft.eventType, dates: serializeSchedule(draft.eventType, draft.dates),
      ...(shared ? { comuneId: draft.comuneId, venue: draft.venue } : {}),
      ...(draft.eventType === "ONLINE" ? { onlineUrl: draft.onlineUrl.trim() } : {}),
      price: draft.price, priceEn: draft.priceEn, website: draft.website.trim(), contactEmail: draft.contactEmail.trim(),
      ...(editing ? {} : { status: draft.status, featured: draft.featured }),
    };
    setSaving(true);
    try {
      const response = await fetch(editing ? `/api/admin/events/${event.id}` : "/api/admin/events", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json", "X-SF-Locale": locale === "en" ? "en" : "it" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (!editing) { router.push(`${eventsHref}/${result.event.id}/edit?created=1#images`); return; } // Stay busy until the new page opens: a second click would create a duplicate.
      // The server stores occurrences chronologically: show them as they will reload.
      const dates = (draft.eventType === "SINGLE_DAY" ? draft.dates.slice(0, 1) : [...draft.dates]).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      const saved = { ...draft, dates };
      baseline.current = JSON.stringify(saved);
      setDraft(saved);
      setJustSaved(true);
      setSaving(false);
      router.refresh();
    } catch (cause) {
      setFormError(cause instanceof Error && cause.message ? cause.message : t.saveFailed);
      setSaving(false);
    }
  }

  const langSwitch = <div role="group" aria-label={t.contentLanguage} className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-bold">
    {(["it", "en"] as const).map((value) => <button key={value} type="button" aria-pressed={lang === value} onClick={() => setLang(value)} className={cn("focus-ring relative rounded-md px-2.5 py-1", lang === value ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink")}>
      {value === "it" ? "IT" : "EN"}
      {value === "en" && englishMissing && <span title={t.englishIncomplete} className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-amber-400" />}
    </button>)}
  </div>;
  const originalHint = (text: string) => en && text.trim() ? <span className="line-clamp-2">{t.italianOriginal}: {text}</span> : undefined;
  const description = en ? draft.descriptionEn : draft.description;

  return <form noValidate onSubmit={submit} className="space-y-5">
    <FormSection id="content" title={t.sectionContent} description={en ? t.englishGuidance : t.sectionContentHint} action={langSwitch}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field className="sm:col-span-2" label={t.title} required={!en} tag={lang} error={!en ? errors.title : undefined} hint={originalHint(draft.title)}>
          <Input id={en ? undefined : "field-title"} className={inputClass} aria-invalid={!en && !!errors.title} maxLength={120} value={en ? draft.titleEn : draft.title} onChange={(input) => change(en ? { titleEn: input.target.value } : { title: input.target.value }, en ? [] : ["title"])} />
        </Field>
        <Field label={t.category} required error={errors.category} hint={legacyCategory && draft.category === event?.category ? <span className="text-amber-800">{t.legacyCategoryGuidance}</span> : undefined}>
          <select id="field-category" className={selectClass} aria-invalid={!!errors.category} value={draft.category} onChange={(input) => change({ category: input.target.value }, ["category"])}>
            {!draft.category && <option value="">{t.selectCategory}</option>}
            {legacyCategory && <option value={event?.category}>{event?.category} ({t.previousCategory})</option>}
            {eventCategories.map((category) => <option key={category.name} value={category.name}>{categoryName(category.name, locale)}</option>)}
          </select>
        </Field>
        <Field label={t.subcategory} tag={lang} hint={originalHint(draft.subcategory)}>
          <Input className={inputClass} maxLength={80} value={en ? draft.subcategoryEn : draft.subcategory} onChange={(input) => change(en ? { subcategoryEn: input.target.value } : { subcategory: input.target.value })} />
        </Field>
        <Field className="sm:col-span-2" label={t.description} required={!en} tag={lang} error={!en ? errors.description : undefined} hint={<span className="flex justify-between gap-4">{originalHint(draft.description) || <span>{en ? "" : t.descriptionHint}</span>}<span className="shrink-0 tabular-nums">{interpolate(t.characterCount, { count: description.length })}</span></span>}>
          <Textarea id={en ? undefined : "field-description"} className={textareaClass} aria-invalid={!en && !!errors.description} maxLength={5000} value={description} onChange={(input) => change(en ? { descriptionEn: input.target.value } : { description: input.target.value }, en ? [] : ["description"])} />
        </Field>
      </div>
    </FormSection>

    <FormSection id="schedule" title={t.sectionSchedule} description={t.sectionScheduleHint}>
      <div className="space-y-6">
        <EventScheduleEditor locale={locale} lang={lang} type={draft.eventType} onTypeChange={changeType} dates={draft.dates} onDatesChange={(dates) => change({ dates }, ["schedule"])} openIds={openIds} onOpenIdsChange={setOpenIds} createUid={createUid} showErrors={showScheduleErrors} error={errors.schedule} />
        {(draft.eventType === "SINGLE_DAY" || draft.eventType === "MULTI_DAY") && <div className="grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <Field label={t.municipalityAndProvince} required error={errors.comuneId}><ComuneSelect id="field-comuneId" locale={locale} className={selectClass} value={draft.comuneId} defaultValue={event?.comuneId} defaultName={event?.location || ""} onChange={(comune) => change({ comuneId: comune?.id || "", location: comune?.name || "", province: comune?.provinceCode || "" }, ["comuneId"])} /></Field>
          <Field label={t.venue} required error={errors.venue}><Input id="field-venue" className={inputClass} aria-invalid={!!errors.venue} maxLength={120} value={draft.venue} placeholder={t.venuePlaceholder} onChange={(input) => change({ venue: input.target.value }, ["venue"])} /></Field>
        </div>}
        {draft.eventType === "ONLINE" && <div className="border-t border-slate-100 pt-5"><Field label={t.participationLink} required error={errors.onlineUrl}><Input id="field-onlineUrl" className={inputClass} aria-invalid={!!errors.onlineUrl} type="url" placeholder="https://" value={draft.onlineUrl} onChange={(input) => change({ onlineUrl: input.target.value }, ["onlineUrl"])} /></Field></div>}
      </div>
    </FormSection>

    <FormSection id="details" title={t.sectionDetails} description={t.sectionDetailsHint}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field className="sm:col-span-2" label={t.price} tag={lang} hint={originalHint(draft.price)}><Input className={inputClass} maxLength={80} placeholder={t.pricePlaceholder} value={en ? draft.priceEn : draft.price} onChange={(input) => change(en ? { priceEn: input.target.value } : { price: input.target.value })} /></Field>
        <Field label={t.website} error={errors.website}><Input id="field-website" className={inputClass} aria-invalid={!!errors.website} type="url" placeholder="https://" value={draft.website} onChange={(input) => change({ website: input.target.value }, ["website"])} /></Field>
        <Field label={t.contactEmail} error={errors.contactEmail} hint={t.contactEmailHint}><Input id="field-contactEmail" className={inputClass} aria-invalid={!!errors.contactEmail} type="email" maxLength={254} value={draft.contactEmail} onChange={(input) => change({ contactEmail: input.target.value }, ["contactEmail"])} /></Field>
      </div>
    </FormSection>

    {!editing && <FormSection id="publication" title={t.sectionPublication} description={t.imagesAfterCreate}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t.status}><select className={selectClass} value={draft.status} onChange={(input) => change({ status: input.target.value as Draft["status"] })}><option value="PENDING">{t.statusPending}</option><option value="PUBLISHED">{t.statusPublished}</option></select></Field>
        <label className="flex items-center gap-2.5 self-end pb-2.5 text-sm font-semibold text-ink"><input type="checkbox" className="focus-ring size-4 accent-[#076b82]" checked={draft.featured} onChange={(input) => change({ featured: input.target.checked })} /> {t.featured}</label>
      </div>
    </FormSection>}

    <div className="sticky bottom-3 z-10 rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-[0_8px_30px_rgba(8,40,72,.14)] backdrop-blur sm:px-4">
      {formError && <p role="alert" className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{formError}</p>}
      <div className="flex items-center gap-2.5">
        {langSwitch}
        <p aria-live="polite" className={cn("hidden min-w-0 flex-1 truncate text-xs font-semibold sm:block", justSaved && !dirty ? "text-teal-700" : "text-muted")}>{Object.keys(errors).length ? t.fixErrors : justSaved && !dirty ? t.saved : dirty ? t.unsavedChanges : ""}</p>
        <div className="ml-auto flex shrink-0 items-center gap-2 text-sm font-semibold">
          <Link href={cancelHref} onClick={(click) => { if (dirty && !window.confirm(t.confirmLeave)) click.preventDefault(); }} className="focus-ring inline-flex h-10 items-center rounded-xl px-3 text-ink hover:bg-slate-100">{dirty ? t.cancel : editing ? t.backToEvent : t.cancel}</Link>
          <Button type="submit" size="sm" className="h-10 px-4" disabled={saving || (editing && !dirty)}>{saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />} {editing ? t.save : t.create}</Button>
        </div>
      </div>
    </div>
  </form>;
}
