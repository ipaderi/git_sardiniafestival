import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { eventCategories, slugifyCategory } from "@/lib/event-categories";
import { getPublicEvents } from "@/lib/public-events";

export const metadata: Metadata = { title: "Categorie di eventi in Sardegna", description: "Esplora concerti, sagre, teatro, mostre e appuntamenti in Sardegna per categoria.", alternates: { canonical: "/categorie" } };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const events = await getPublicEvents();
  const categoryCounts = new Map<string, number>();
  for (const event of events) {
    const key = event.category.toLowerCase();
    categoryCounts.set(key, (categoryCounts.get(key) || 0) + 1);
  }

  return <main className="min-h-[70vh] bg-[#f6f7f4] px-5 py-12 lg:px-8"><div className="mx-auto max-w-7xl"><p className="text-[11px] font-bold uppercase tracking-[.17em] text-sea">Scegli il tuo ritmo</p><h1 className="mt-2 font-display text-4xl font-semibold tracking-[-.05em] text-ink md:text-5xl">Categorie di eventi</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Apri una categoria per scoprire gli eventi pubblicati e i luoghi sulla mappa della Sardegna.</p><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{eventCategories.map((category, index) => {
    const count = categoryCounts.get(category.name.toLowerCase()) || 0;
    return <Link key={category.name} href={`/categorie/${slugifyCategory(category.name)}`} className="focus-ring group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-sea-bright/50 hover:shadow-md"><span className={`flex size-11 items-center justify-center rounded-2xl ${index % 2 ? "bg-[#fff0e9] text-coral" : "bg-[#e7f5f2] text-sea"}`}><CalendarDays size={20} /></span><h2 className="mt-4 font-display text-xl font-semibold text-ink group-hover:text-sea">{category.name}</h2><p className="mt-1 text-xs font-semibold text-sea">{category.subtitle}</p><p className="mt-3 min-h-10 text-sm leading-5 text-muted">{category.description}</p><span className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-ink-soft"><span>{count} {count === 1 ? "evento pubblicato" : "eventi pubblicati"}</span><ArrowRight size={15} className="text-sea transition-transform group-hover:translate-x-1" /></span></Link>;
  })}</div></div></main>;
}
