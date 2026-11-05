import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { EventCard } from "@/components/site/event-card";
import { findCategoryBySlug, slugifyCategory } from "@/lib/event-categories";
import { getPublicEvents } from "@/lib/public-events";

type Props = { params: Promise<{ categoria: string }> };
export const dynamic = "force-dynamic";

const categoryPage = cache(async (slug: string) => {
  const category = findCategoryBySlug(slug);
  if (!category) return null;
  const events = (await getPublicEvents()).filter((event) => event.category.toLowerCase() === category.name.toLowerCase());
  return { category, events };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await categoryPage((await params).categoria);
  if (!page) return { title: "Categoria non trovata", robots: { index: false, follow: false } };
  const title = `${page.category.name}: eventi in Sardegna`;
  const description = `${page.category.description} Scopri gli eventi pubblicati su SardiniaFestival.`;
  const canonical = `/categorie/${slugifyCategory(page.category.name)}`;
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: page.events.length > 0, follow: true },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default async function CategoryEventsPage({ params }: Props) {
  const page = await categoryPage((await params).categoria);
  if (!page) notFound();
  return <main className="min-h-[70vh] px-5 py-10 lg:px-8"><div className="mx-auto max-w-7xl"><Link href="/categorie" className="focus-ring inline-flex items-center gap-2 rounded text-sm font-semibold text-muted hover:text-sea"><ArrowLeft size={15} /> Tutte le categorie</Link><div className="mt-6 rounded-3xl bg-[#082848] px-6 py-8 text-white md:px-10 md:py-10"><p className="text-[11px] font-bold uppercase tracking-[.17em] text-teal-200">Eventi in Sardegna</p><h1 className="mt-2 font-display text-4xl font-semibold tracking-[-.05em] md:text-5xl">{page.category.name}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-blue-100/75">{page.category.description}</p><Link href="/eventi" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sea-bright px-4 py-3 text-sm font-bold text-ink"><MapPin size={16} /> Apri la mappa eventi</Link></div><div className="mt-8">{page.events.length ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{page.events.map((event) => <EventCard key={event.id} event={event} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><h2 className="font-display text-xl font-semibold text-ink">Nessun evento pubblicato in questa categoria</h2><p className="mt-2 text-sm text-muted">Gli eventi appariranno qui dopo la verifica editoriale.</p></div>}</div></div></main>;
}
