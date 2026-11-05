"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ComuneSelect, fetchComuni } from "@/components/site/comune-select";

export function SearchForm({ compact = false, defaults }: { compact?: boolean; defaults?: { q?: string; city?: string; from?: string } }) {
  const router = useRouter();
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
          router.push(`/citta/${comune.slug}`);
          setSearching(false);
          return;
        }
        query.set("city", comune.name);
      } catch {
        setMessage("Non riesco a caricare il comune selezionato. Riprova.");
        setSearching(false);
        return;
      }
    }
    router.push(`/eventi${query.size ? `?${query.toString()}` : ""}`);
    setSearching(false);
  }

  return (
    <form onSubmit={submit} className={`grid gap-3 rounded-2xl bg-white p-3 shadow-[0_22px_60px_rgba(5,32,54,.18)] md:grid-cols-[1.25fr_1fr_1fr_auto] ${compact ? "" : ""}`}>
      <label className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 px-4 py-2.5 focus-within:border-sea-bright focus-within:ring-2 focus-within:ring-sea-bright/20">
        <Search className="shrink-0 text-sea" size={19} aria-hidden="true" />
        <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">Cosa cerchi?</span><Input name="q" defaultValue={defaults?.q} placeholder="Jazz, sagra, teatro…" className="h-6 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:outline-none focus-visible:ring-0" /></span>
      </label>
      <label className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 px-4 py-2.5 focus-within:border-sea-bright focus-within:ring-2 focus-within:ring-sea-bright/20">
        <MapPin className="shrink-0 text-sea" size={19} aria-hidden="true" />
        <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">Dove?</span><ComuneSelect name="comuneId" defaultName={defaults?.city} className="h-6 w-full border-0 bg-transparent p-0 text-sm text-ink focus:outline-none" /></span>
      </label>
      <label className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 px-4 py-2.5 focus-within:border-sea-bright focus-within:ring-2 focus-within:ring-sea-bright/20">
        <CalendarDays className="shrink-0 text-sea" size={19} aria-hidden="true" />
        <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">Da quando?</span><Input name="from" defaultValue={defaults?.from} type="date" className="h-6 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:outline-none focus-visible:ring-0" /></span>
      </label>
      <Button size="lg" type="submit" className="h-auto min-h-[58px] rounded-xl" disabled={searching}>{searching ? <><Search size={17} className="animate-pulse" /> Ricerca…</> : <><Search size={17} /> <span className="md:hidden lg:inline">Cerca eventi</span><span className="hidden md:inline lg:hidden">Cerca</span></>}</Button>
      {message && <p role="status" className="text-xs text-muted md:col-span-4">{message}</p>}
    </form>
  );
}

export function SearchHint() {
  return <p className="mt-4 flex items-center gap-2 text-xs text-blue-100/70"><Sparkles size={14} className="text-teal-200" /> Scegli un comune della Sardegna e scopri gli appuntamenti vicino a te</p>;
}
