import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { EventCard } from "@/components/site/event-card";
import { categoryName, findCategoryBySlug, slugifyCategory } from "@/lib/event-categories";
import { getPublicEvents } from "@/lib/public-events";

export const dynamic = "force-dynamic";
type Params = { locale: string; category: string; subcategory?: string[] };
type Props = { params: Promise<Params> };

const getPage = cache(async (locale: string, categorySlug: string, subcategorySlug: string) => {
  const category = findCategoryBySlug(categorySlug);
  if (!category) return null;
  const allEvents = (await getPublicEvents({ locale })).filter((event) => event.category.toLocaleLowerCase("it-IT") === category.name.toLocaleLowerCase("it-IT"));
  const subcategories = new Map<string, { name: string; nameEn: string | null }>();
  for (const event of allEvents) {
    const name = event.subcategory?.trim();
    if (!name) continue;
    const slug = slugifyCategory(name);
    if (slug && !subcategories.has(slug)) subcategories.set(slug, { name, nameEn: event.subcategoryEn });
    else if (slug && event.subcategoryEn && !subcategories.get(slug)?.nameEn) subcategories.set(slug, { name, nameEn: event.subcategoryEn });
  }
  const subcategory = subcategorySlug ? subcategories.get(subcategorySlug) : undefined;
  if (subcategorySlug && !subcategory) return null;
  const events = subcategorySlug ? allEvents.filter((event) => event.subcategory && slugifyCategory(event.subcategory.trim()) === subcategorySlug) : allEvents;
  return { category, subcategories, subcategory, events };
});

async function pageData(params: Params) {
  if ((params.subcategory?.length ?? 0) > 1) return null;
  return getPage(params.locale, params.category, params.subcategory?.[0] ?? "");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const values = await params;
  const page = await pageData(values);
  if (!page) return { title: values.locale === "en" ? "Category not found" : "Categoria non trovata", robots: { index: false, follow: false } };
  const name = page.subcategory ? (values.locale === "en" ? page.subcategory.nameEn || page.subcategory.name : page.subcategory.name) : categoryName(page.category.name, values.locale);
  const title = values.locale === "en" ? `${name}: events in Sardinia` : `${name}: eventi in Sardegna`;
  const description = values.locale === "en" ? `Discover ${name} events across Sardinia.` : `Scopri gli eventi ${name} in Sardegna.`;
  const suffix = `/events/category/${values.category}${values.subcategory?.[0] ? `/${values.subcategory[0]}` : ""}`;
  const canonical = `/${values.locale}${suffix}`;
  return { title, description, alternates: { canonical, languages: { it: `/it${suffix}`, en: `/en${suffix}` } }, robots: { index: page.events.length > 0, follow: true }, openGraph: { title, description, url: canonical, type: "website" } };
}

export default async function CategoryEventsPage({ params }: Props) {
  const values = await params;
  const page = await pageData(values);
  if (!page) notFound();
  const { locale } = values;
  const en = locale === "en";
  const categoryLabel = categoryName(page.category.name, locale);
  const name = page.subcategory ? (en ? page.subcategory.nameEn || page.subcategory.name : page.subcategory.name) : categoryLabel;
  const categoryPath = `/${locale}/events/category/${values.category}`;
  return <main className="min-h-[70vh] px-5 py-10 lg:px-8"><div className="mx-auto max-w-7xl">
    <Link href={page.subcategory ? categoryPath : `/${locale}/events/category`} className="focus-ring inline-flex items-center gap-2 rounded text-sm font-semibold text-muted hover:text-sea"><ArrowLeft size={15} /> {page.subcategory ? categoryLabel : en ? "All categories" : "Tutte le categorie"}</Link>
    <div className="mt-6 rounded-3xl bg-[#082848] px-6 py-8 text-white md:px-10 md:py-10"><p className="text-[11px] font-bold uppercase tracking-[.17em] text-teal-200">{en ? "Events in Sardinia" : "Eventi in Sardegna"}</p><h1 className="mt-2 font-display text-4xl font-semibold tracking-[-.05em] md:text-5xl">{name}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-blue-100/75">{en ? `Explore ${name} events across the island.` : page.subcategory ? `Scopri gli eventi ${name} in Sardegna.` : page.category.description}</p><Link href={`/${locale}/events?category=${values.category}`} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sea-bright px-4 py-3 text-sm font-bold text-ink"><MapPin size={16} /> {en ? "Open event map" : "Apri la mappa eventi"}</Link></div>
    {!page.subcategory && page.subcategories.size > 0 && <nav aria-label={en ? "Subcategories" : "Sottocategorie"} className="mt-7 flex flex-wrap gap-2">{[...page.subcategories.entries()].sort((a, b) => (en ? a[1].nameEn || a[1].name : a[1].name).localeCompare(en ? b[1].nameEn || b[1].name : b[1].name, en ? "en" : "it")).map(([slug, label]) => <Link key={slug} href={`${categoryPath}/${slug}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink-soft hover:border-sea hover:text-sea">{en ? label.nameEn || label.name : label.name}</Link>)}</nav>}
    <div className="mt-8">{page.events.length ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{page.events.map((event) => <EventCard key={event.id} event={event} locale={locale} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><h2 className="font-display text-xl font-semibold text-ink">{en ? "No events have been published in this category" : "Nessun evento pubblicato in questa categoria"}</h2><p className="mt-2 text-sm text-muted">{en ? "Events will appear here once reviewed." : "Gli eventi appariranno qui dopo la verifica editoriale."}</p></div>}</div>
  </div></main>;
}
