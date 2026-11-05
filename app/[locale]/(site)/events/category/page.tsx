import { dictionary } from "@/lib/dictionary";
import publicIt from "@/messages/it/public.json";
import publicEn from "@/messages/en/public.json";
import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CategoryIcon } from "@/components/site/category-icon";
import { eventCategories, categoryName, categoryDetails, slugifyCategory } from "@/lib/event-categories";
import { getPublicEvents } from "@/lib/public-events";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string }> };
const getIndexEvents = cache((locale: string) => getPublicEvents({ locale }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: dictionary(locale, publicIt, publicEn).eventCategoriesInSardinia,
    description: dictionary(locale, publicIt, publicEn).exploreSardinianEventsByCategory,
    alternates: { canonical: `/${locale}/events/category`, languages: { it: "/it/events/category", en: "/en/events/category" } },
    robots: { index: true, follow: true },
  };
}

export default async function CategoriesPage({ params }: Props) {
  const { locale } = await params;
  const events = await getIndexEvents(locale);
  return <main className="min-h-[70vh] bg-[#f6f7f4] px-5 py-12 lg:px-8"><div className="mx-auto max-w-7xl">
    <p className="text-[11px] font-bold uppercase tracking-[.17em] text-sea">{dictionary(locale, publicIt, publicEn).findYourRhythm}</p>
    <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-.05em] text-ink md:text-5xl">{dictionary(locale, publicIt, publicEn).eventCategories}</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{dictionary(locale, publicIt, publicEn).categoryIndexDescription}</p>
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{eventCategories.map((category, index) => {
      const count = events.filter((event) => event.category.toLocaleLowerCase("it-IT") === category.name.toLocaleLowerCase("it-IT")).length;
      return <Link key={category.name} href={`/${locale}/events/category/${slugifyCategory(category.name)}`} className="focus-ring group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-sea-bright/50 hover:shadow-md">
        <span className={`flex size-11 items-center justify-center rounded-2xl ${index % 2 ? "bg-[#fff0e9] text-coral" : "bg-[#e7f5f2] text-sea"}`}><CategoryIcon slug={slugifyCategory(category.name)} size={20} /></span>
        <h2 className="mt-4 font-display text-xl font-semibold text-ink group-hover:text-sea">{categoryName(category.name, locale)}</h2>
        <p className="mt-1 text-xs font-semibold text-sea">{categoryDetails(category.name, locale).subtitle}</p><p className="mt-3 min-h-10 text-sm leading-5 text-muted">{categoryDetails(category.name, locale).description}</p>
        <span className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-ink-soft"><span>{count} {count === 1 ? dictionary(locale, publicIt, publicEn).publishedEventOne : dictionary(locale, publicIt, publicEn).publishedEventMany}</span><ArrowRight size={15} className="text-sea transition-transform group-hover:translate-x-1" /></span>
      </Link>;
    })}</div>
  </div></main>;
}
