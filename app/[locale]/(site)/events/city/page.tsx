import { dictionary } from "@/lib/dictionary";
import publicIt from "@/messages/it/public.json";
import publicEn from "@/messages/en/public.json";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionary(locale, publicIt, publicEn).townsInSardinia, alternates: { canonical: `/${locale}/events/city`, languages: { it: "/it/events/city", en: "/en/events/city" } } };
}
export default async function CitiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const comuni = await prisma.comune.findMany({ select: { name: true, slug: true, provinceCode: true } });
  comuni.sort((a, b) => a.name.localeCompare(b.name, "it"));
  const groups = new Map<string, typeof comuni>();
  for (const comune of comuni) { const letter = comune.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")[0].toUpperCase(); groups.set(letter, [...groups.get(letter) || [], comune]); }
  return <main className="min-h-[70vh] bg-[#f6f7f4] px-5 py-10 lg:px-8"><div className="mx-auto max-w-7xl"><div className="rounded-[28px] bg-[#082848] p-8 text-white md:p-10"><p className="text-xs font-bold uppercase tracking-[.17em] text-teal-200">{dictionary(locale, publicIt, publicEn).theWholeIsland}</p><h1 className="mt-3 font-display text-4xl font-semibold">{dictionary(locale, publicIt, publicEn).townsInSardinia}</h1><p className="mt-3 text-sm text-blue-100/75">{dictionary(locale, publicIt, publicEn).chooseATownToDiscoverItsEvents}</p></div><nav aria-label={dictionary(locale, publicIt, publicEn).alphabeticalIndex} className="mt-8 flex flex-wrap gap-2">{[...groups.keys()].map((letter) => <a key={letter} href={`#letter-${letter}`} className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-sea">{letter}</a>)}</nav><div className="mt-6 rounded-2xl border border-slate-200 bg-white px-6">{[...groups].map(([letter, towns]) => <section key={letter} id={`letter-${letter}`} className="scroll-mt-24 border-b border-slate-100 py-6 last:border-0"><h2 className="font-display text-2xl font-semibold text-sea">{letter}</h2><ul className="mt-3 columns-1 gap-x-8 sm:columns-2 lg:columns-3 xl:columns-4">{towns.map((town) => <li key={town.slug} className="break-inside-avoid"><Link prefetch={false} href={`/${locale}/events/city/${town.slug}`} className="flex justify-between gap-3 rounded py-2 text-sm text-ink hover:text-sea"><span>{town.name}</span><span className="text-xs text-muted">{town.provinceCode}</span></Link></li>)}</ul></section>)}</div></div></main>;
}
