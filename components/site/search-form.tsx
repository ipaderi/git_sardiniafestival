"use client";

import { dictionary } from "@/lib/dictionary";
import it from "@/messages/it/navigation.json";
import en from "@/messages/en/navigation.json";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ComuneSelect, fetchComuni } from "@/components/site/comune-select";
import { localizedPath } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";

export function SearchForm({ compact = false, defaults }: { compact?: boolean; defaults?: { q?: string; city?: string; from?: string } }) {
  const router = useRouter();
  const locale = useLocale();
  const t = dictionary(locale, it, en);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearching(true);
    setMessage("");
    const values = new FormData(event.currentTarget);
    const query = new URLSearchParams();
    for (const key of ["q", "from"] as const) {
      const value = String(values.get(key) || "").trim();
      if (value) query.set(key, value);
    }

    const comuneId = String(values.get("comuneId") || "");
    if (comuneId) {
      try {
        const comune = (await fetchComuni()).find((item) => item.id === comuneId);
        if (!comune) throw new Error("Comune non trovato");
        if (!query.size) {
          router.push(localizedPath(locale, `/events/city/${comune.slug}`));
          setSearching(false);
          return;
        }
        query.set("city", comune.name);
      } catch {
        setMessage(t.searchError);
        setSearching(false);
        return;
      }
    }
    router.push(localizedPath(locale, `/events${query.size ? `?${query.toString()}` : ""}`));
    setSearching(false);
  }

  return (
    <form onSubmit={submit} className={`grid gap-3 rounded-2xl bg-white p-3 shadow-[0_22px_60px_rgba(5,32,54,.18)] md:grid-cols-[1.25fr_1fr_1fr_auto] ${compact ? "" : ""}`}>
      <label className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 px-4 py-2.5 focus-within:border-sea-bright focus-within:ring-2 focus-within:ring-sea-bright/20">
        <Search className="shrink-0 text-sea" size={19} aria-hidden="true" />
        <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">{t.searchWhat}</span><Input name="q" defaultValue={defaults?.q} placeholder={t.searchPlaceholder} className="h-6 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:outline-none focus-visible:ring-0" /></span>
      </label>
      <label className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 px-4 py-2.5 focus-within:border-sea-bright focus-within:ring-2 focus-within:ring-sea-bright/20">
        <MapPin className="shrink-0 text-sea" size={19} aria-hidden="true" />
        <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">{t.searchWhere}</span><ComuneSelect locale={locale} name="comuneId" defaultName={defaults?.city} className="h-6 w-full border-0 bg-transparent p-0 text-sm text-ink focus:outline-none" /></span>
      </label>
      <label className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 px-4 py-2.5 focus-within:border-sea-bright focus-within:ring-2 focus-within:ring-sea-bright/20">
        <CalendarDays className="shrink-0 text-sea" size={19} aria-hidden="true" />
        <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">{t.searchFrom}</span><Input name="from" defaultValue={defaults?.from} type="date" className="h-6 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:outline-none focus-visible:ring-0" /></span>
      </label>
      <Button size="lg" type="submit" className="h-auto min-h-[58px] rounded-xl" disabled={searching}>{searching ? <><Search size={17} className="animate-pulse" /> {t.searching}</> : <><Search size={17} /> <span className="md:hidden lg:inline">{t.findEvents}</span><span className="hidden md:inline lg:hidden">{t.search}</span></>}</Button>
      {message && <p role="status" className="text-xs text-muted md:col-span-4">{message}</p>}
    </form>
  );
}

export function SearchHint() {
  const locale = useLocale();
  return <p className="mt-4 flex items-center gap-2 text-xs text-blue-100/70"><Sparkles size={14} className="text-teal-200" /> {dictionary(locale, it, en).searchHint}</p>;
}
