"use client";

import { dictionary } from "@/lib/dictionary";
import adminIt from "@/messages/it/admin.json";
import adminEn from "@/messages/en/admin.json";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, LoaderCircle, Pencil, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EventStatus } from "@/components/admin/event-status-badge";

export function EventActions({ id, status, featured, locale = "it", variant = "row" }: { id: string; status: EventStatus; featured: boolean; locale?: string; variant?: "row" | "detail" }) {
  const t = dictionary(locale, adminIt, adminEn).events;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const listHref = `/${locale}/dashboard/admin/events`;
  const headers = { "X-SF-Locale": locale === "en" ? "en" : "it" };

  async function update(patch: { status?: EventStatus; featured?: boolean }) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/events/${id}`, { method: "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : t.updateFailed);
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm(t.permanentlyDeleteThisEvent)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/events/${id}`, { method: "DELETE", headers });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.warning) window.alert(result.warning);
      if (variant === "detail") router.push(listHref);
      else router.refresh();
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : t.deletionFailed);
    } finally { setBusy(false); }
  }

  return <div className="grid justify-items-start gap-2 md:justify-items-end">
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold md:justify-end">
      {(status === "PENDING" || status === "REJECTED") && <Button size="sm" disabled={busy} onClick={() => update({ status: "PUBLISHED" })}><Check size={14} /> {t.approve}</Button>}
      {status === "PENDING" && <Button size="sm" variant="outline" disabled={busy} onClick={() => update({ status: "REJECTED" })}><X size={14} /> {t.reject}</Button>}
      {status === "PUBLISHED" && <Button size="sm" variant="outline" disabled={busy} onClick={() => update({ status: "CANCELLED" })}><EyeOff size={14} /> {t.hide}</Button>}
      {status === "CANCELLED" && <Button size="sm" variant="outline" disabled={busy} onClick={() => update({ status: "PUBLISHED" })}><Eye size={14} /> {t.republish}</Button>}
      {variant === "detail"
        ? <Link href={`${listHref}/${id}/edit`} className="focus-ring inline-flex h-9 items-center gap-2 rounded-xl bg-ink px-3.5 text-xs font-semibold text-white hover:bg-[#12446b]"><Pencil size={14} /> {t.edit}</Link>
        : <Link href={`${listHref}/${id}/edit`} aria-label={t.edit} title={t.edit} className="focus-ring inline-flex size-9 items-center justify-center rounded-xl text-ink hover:bg-slate-100"><Pencil size={16} /></Link>}
      <button type="button" disabled={busy} aria-pressed={featured} aria-label={t.toggleFeaturedStatus} title={featured ? t.removeFromFeatured : t.featureEvent} onClick={() => update({ featured: !featured })} className="focus-ring inline-flex size-9 items-center justify-center rounded-xl hover:bg-slate-100 disabled:opacity-50">
        {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Star size={16} className={featured ? "fill-amber-400 text-amber-500" : "text-slate-400"} />}
      </button>
      <button type="button" disabled={busy} aria-label={t.deleteEvent} title={t.deleteEvent} onClick={remove} className="focus-ring inline-flex size-9 items-center justify-center rounded-xl text-rose-500 hover:bg-rose-50 disabled:opacity-50"><Trash2 size={16} /></button>
    </div>
    {error && <p role="alert" className="text-xs font-medium text-rose-700">{error}</p>}
  </div>;
}
