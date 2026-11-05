import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { isLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { PROVINCES } from "@/lib/provinces";

type Props = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const english = locale === "en";
  const title = english ? "Explore Sardinia by province" : "Scopri le province della Sardegna";
  const description = english ? "Explore events and towns across Sardinia's provinces." : "Esplora eventi e comuni delle province della Sardegna.";
  const canonical = `/${locale}/events/province`;
  return { title, description, alternates: { canonical, languages: { it: "/it/events/province", en: "/en/events/province" } }, openGraph: { title, description, url: canonical } };
}

export default async function ProvincesPage({ params }: Props) {
  const { locale: language } = await params;
  const locale = isLocale(language) ? language : "it";
  const english = locale === "en";
  const counts = await prisma.comune.groupBy({ by: ["provinceCode"], _count: { _all: true } });
  const countByCode = new Map(counts.map((item) => [item.provinceCode, item._count._all]));

  return (
    <main className="min-h-[70vh] bg-[#f6f7f4] px-5 py-9 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav aria-label={english ? "Breadcrumb" : "Percorso"} className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
          <Link href={`/${locale}`} className="hover:text-sea">Home</Link><span aria-hidden="true">/</span><span aria-current="page" className="text-ink">{english ? "Provinces" : "Province"}</span>
        </nav>
        <section className="relative mt-6 overflow-hidden rounded-[28px] bg-[#082848] px-6 py-10 text-white md:px-10 md:py-12">
          <div aria-hidden="true" className="absolute -right-12 -top-28 size-80 rounded-full border-[42px] border-white/5" />
          <div className="relative max-w-3xl">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.17em] text-teal-200"><MapPin size={14} /> {english ? "The whole island" : "Tutta l'isola"}</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-.05em] md:text-5xl">{english ? "Explore Sardinia, province by province" : "La Sardegna, provincia per provincia"}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-100/80">{english ? "Choose a territory to discover its towns and events." : "Scegli un territorio per scoprire i suoi comuni e i suoi eventi."}</p>
          </div>
        </section>
        <section className="mt-10" aria-labelledby="province-heading">
          <p className="text-[11px] font-bold uppercase tracking-[.17em] text-sea">{english ? "From north to south" : "Da nord a sud"}</p>
          <h2 id="province-heading" className="mt-2 font-display text-2xl font-semibold tracking-[-.035em] text-ink">{english ? "All provinces" : "Tutte le province"}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PROVINCES.map((province) => (
              <Link key={province.code} href={`/${locale}/events/province/${province.slug}`} className="focus-ring group flex min-h-36 flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 transition hover:-translate-y-0.5 hover:border-sea-bright/50 hover:shadow-md">
                <div className="flex items-center justify-between"><span aria-hidden="true" className="size-9 rounded-xl" style={{ backgroundColor: province.color }} /><ArrowUpRight size={18} className="text-sea transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></div>
                <div className="mt-5"><h3 className="font-display text-lg font-semibold leading-tight text-ink group-hover:text-sea">{province.name}</h3><p className="mt-1 text-xs text-muted">{countByCode.get(province.code) ?? 0} {english ? "towns" : "comuni"}</p></div>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted">{english ? "Looking for a particular town?" : "Cerchi un comune in particolare?"} <Link href={`/${locale}/events/city`} className="font-bold text-sea hover:underline">{english ? "Browse all towns" : "Sfoglia tutti i comuni"}</Link></p>
        </section>
      </div>
    </main>
  );
}
