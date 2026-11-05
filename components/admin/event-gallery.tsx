"use client";

import { dictionary } from "@/lib/dictionary";
import adminIt from "@/messages/it/admin.json";
import adminEn from "@/messages/en/admin.json";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  return <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
    <h3 className="text-sm font-bold text-ink">{t.eventImages}</h3>
    <p className="mt-1 text-xs leading-5 text-muted">{t.imageGuidance}</p>
    {images.length > 0 && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{images.map((image) => <div key={image.id} className="overflow-hidden rounded-xl border border-slate-200">
      <img src={`/api/images/${image.id}`} alt={(en ? image.altEn || image.alt : image.alt) || ""} className="aspect-[4/3] w-full object-cover" />
      <div className="flex flex-wrap items-center gap-2 p-2">
        <button type="button" disabled={busy || image.isCover} title={image.isCover ? (t.currentCover) : (t.useAsCover)} onClick={() => action(`/api/admin/events/${eventId}/images/${image.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cover: true }) })} className="focus-ring inline-flex items-center gap-1 rounded px-1 py-1 text-[11px] font-bold text-sea disabled:opacity-60"><Star size={13} fill={image.isCover ? "currentColor" : "none"} /> {image.isCover ? (t.cover) : (t.useAsCover2)}</button>
        <button type="button" disabled={busy} aria-label={t.deleteImage} onClick={() => remove(image.id)} className="focus-ring ml-auto rounded p-1 text-rose-600 disabled:opacity-50"><Trash2 size={15} /></button>
      </div>
      <form className="grid gap-2 border-t border-slate-100 p-2" onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void action(`/api/admin/events/${eventId}/images/${image.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alt: data.get("alt"), altEn: data.get("altEn") }) });
      }}>
        <label className="grid gap-1 text-[11px] font-bold text-ink">{t.altTextItalian}<Input name="alt" defaultValue={image.alt || ""} maxLength={180} className="h-9 text-xs" /></label>
        <label className="grid gap-1 text-[11px] font-bold text-ink">{t.altTextEnglish}<Input name="altEn" defaultValue={image.altEn || ""} maxLength={180} className="h-9 text-xs" /></label>
        <Button type="submit" size="sm" variant="outline" disabled={busy}>{t.saveDescriptions}</Button>
      </form>
    </div>)}</div>}
    {images.length < 20 && <form ref={formRef} onSubmit={upload} className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-xs font-bold text-ink">{t.image} *<Input required name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="h-auto py-2 text-xs" /></label>
      <label className="grid gap-1 text-xs font-bold text-ink">{t.altTextItalian}<Input name="alt" maxLength={180} className="h-10 text-xs" /></label>
      <label className="grid gap-1 text-xs font-bold text-ink">{t.altTextEnglishOptional}<Input name="altEn" maxLength={180} className="h-10 text-xs" /></label>
      <div className="sm:col-span-2"><Button type="submit" size="sm" disabled={busy}>{busy ? <LoaderCircle size={14} className="animate-spin" /> : <ImagePlus size={14} />} {t.uploadImage}</Button></div>
    </form>}
    {error && <p role="alert" className="mt-3 text-xs font-medium text-rose-700">{error}</p>}
  </section>;
}
