"use client";

import { dictionary } from "@/lib/dictionary";
import adminIt from "@/messages/it/admin.json";
import adminEn from "@/messages/en/admin.json";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ImagePlus, LoaderCircle, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormSection, inputClass } from "@/components/admin/event-form-fields";

type ImageRecord = { id: string; alt: string | null; altEn: string | null; isCover: boolean };

export function EventGallery({ eventId, images, locale = "it" }: { eventId: string; images: ImageRecord[]; locale?: string }) {
  const en = locale === "en"; const t = dictionary(locale, adminIt, adminEn).gallery;
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function action(url: string, options: RequestInit) {
    setBusy(true);
    setError("");
    try {
      const headers = new Headers(options.headers);
      headers.set("X-SF-Locale", locale === "en" ? "en" : "it");
      const response = await fetch(url, { ...options, headers });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || (t.operationFailed));
      router.refresh();
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : t.operationFailed);
      return false;
    } finally { setBusy(false); }
  }
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || file.size > 8 * 1024 * 1024) { setError(t.selectAnImageUpTo8Mb); return; }
    if (await action(`/api/admin/events/${eventId}/images`, { method: "POST", body: form })) formRef.current?.reset();
  }
  async function remove(imageId: string) {
    if (!window.confirm(t.deleteThisImageFromTheGallery)) return;
    await action(`/api/admin/events/${eventId}/images/${imageId}`, { method: "DELETE" });
  }
  return <FormSection id="images" title={t.eventImages} description={t.imageGuidance} action={<span className="text-xs font-semibold tabular-nums text-muted">{images.length} / 20</span>}>
    {images.length > 0 && <ul className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map((image) => <li key={image.id} className="overflow-hidden rounded-xl border border-slate-200">
      <div className="relative">
        <img src={`/api/images/${image.id}`} alt={(en ? image.altEn || image.alt : image.alt) || ""} className="aspect-[4/3] w-full object-cover" />
        {image.isCover && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-ink/85 px-2 py-0.5 text-[10px] font-bold text-white"><Star size={10} fill="currentColor" aria-hidden /> {t.cover}</span>}
      </div>
      <div className="flex items-center gap-1 p-1.5 text-[11px] font-bold">
        {!image.isCover && <button type="button" disabled={busy} title={t.useAsCover} onClick={() => action(`/api/admin/events/${eventId}/images/${image.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cover: true }) })} className="focus-ring inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-sea hover:bg-slate-100 disabled:opacity-60"><Star size={13} /> {t.useAsCover2}</button>}
        <button type="button" disabled={busy} aria-label={t.deleteImage} title={t.deleteImage} onClick={() => remove(image.id)} className="focus-ring ml-auto grid size-8 place-items-center rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 size={15} /></button>
      </div>
      <details className="group border-t border-slate-100">
        <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 text-[11px] font-bold text-muted hover:text-ink [&::-webkit-details-marker]:hidden">{t.alternativeTexts}<ChevronDown size={13} aria-hidden className="transition-transform group-open:rotate-180" /></summary>
        <form className="grid gap-2 px-2.5 pb-2.5 text-xs" onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void action(`/api/admin/events/${eventId}/images/${image.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alt: data.get("alt"), altEn: data.get("altEn") }) });
        }}>
          <label className="grid gap-1 text-ink"><span className="text-[11px] font-bold">{t.altTextItalian}</span><Input name="alt" defaultValue={image.alt || ""} maxLength={180} className="h-9 px-2.5" /></label>
          <label className="grid gap-1 text-ink"><span className="text-[11px] font-bold">{t.altTextEnglish}</span><Input name="altEn" defaultValue={image.altEn || ""} maxLength={180} className="h-9 px-2.5" /></label>
          <div className="grid font-semibold"><Button type="submit" size="sm" variant="outline" disabled={busy}>{t.saveDescriptions}</Button></div>
        </form>
      </details>
    </li>)}</ul>}
    {images.length < 20 && <form ref={formRef} onSubmit={upload} className="grid gap-4 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 sm:p-4">
      <Field className="sm:col-span-2" label={t.image} required><Input required name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="h-auto bg-white py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink" /></Field>
      <Field label={t.altTextItalian}><Input name="alt" maxLength={180} className={inputClass} /></Field>
      <Field label={t.altTextEnglishOptional}><Input name="altEn" maxLength={180} className={inputClass} /></Field>
      <div className="text-xs font-semibold sm:col-span-2"><Button type="submit" size="sm" variant="dark" disabled={busy}>{busy ? <LoaderCircle size={14} className="animate-spin" /> : <ImagePlus size={14} />} {t.uploadImage}</Button></div>
    </form>}
    {error && <p role="alert" className="mt-3 text-xs font-medium text-rose-700">{error}</p>}
  </FormSection>;
}
