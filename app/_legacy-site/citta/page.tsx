import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Eventi nelle città della Sardegna",
  description: "Esplora l'indice dei comuni della Sardegna e scopri gli eventi di ogni città su SardiniaFestival.",
  alternates: { canonical: "/citta" },
  openGraph: {
    title: "Eventi nelle città della Sardegna",
    description: "Trova un comune della Sardegna e scopri gli eventi della sua città.",
    url: "/citta",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function CitiesPage() {
  const comuni = await prisma.comune.findMany({
    select: { name: true, slug: true, provinceCode: true },
  });
  comuni.sort((a, b) => a.name.localeCompare(b.name, "it"));

  const byLetter = new Map<string, typeof comuni>();
  for (const comune of comuni) {
    const letter = comune.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")[0]?.toUpperCase();
    if (!letter) continue;
    const group = byLetter.get(letter) ?? [];
    group.push(comune);
    byLetter.set(letter, group);
  }

  return (
    <main className="min-h-[70vh] bg-[#f6f7f4] px-5 py-9 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav aria-label="Percorso" className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
          <Link href="/" className="hover:text-sea">Home</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-ink">Città</span>
        </nav>

        <section className="relative mt-6 overflow-hidden rounded-[28px] bg-[#082848] px-6 py-8 text-white md:px-10 md:py-10">
          <div aria-hidden="true" className="absolute -right-12 -top-28 size-80 rounded-full border-[42px] border-white/5" />
          <div className="relative max-w-3xl">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.17em] text-teal-200"><MapPin size={14} /> Tutta l'isola</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-.05em] md:text-5xl">Eventi nelle città della Sardegna</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-100/80">Scegli un comune per scoprire gli eventi, le feste e gli appuntamenti del territorio.</p>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="indice-comuni">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.17em] text-sea">Da nord a sud</p>
              <h2 id="indice-comuni" className="mt-2 font-display text-2xl font-semibold tracking-[-.035em] text-ink">Tutti i comuni</h2>
            </div>
            <p className="text-xs text-muted">{comuni.length} {comuni.length === 1 ? "comune" : "comuni"}</p>
          </div>

          {comuni.length > 0 ? <>
            <nav aria-label="Indice alfabetico dei comuni" className="mt-5 flex flex-wrap gap-2">
              {Array.from(byLetter.keys()).map((letter) => (
                <a key={letter} href={`#lettera-${letter.toLowerCase()}`} className="focus-ring flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-sea transition hover:border-sea hover:bg-[#e7f5f2]" aria-label={`Comuni che iniziano per ${letter}`}>{letter}</a>
              ))}
            </nav>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 sm:px-7">
              {Array.from(byLetter, ([letter, group]) => (
                <section key={letter} id={`lettera-${letter.toLowerCase()}`} className="scroll-mt-24 border-b border-slate-100 py-6 last:border-0" aria-labelledby={`titolo-${letter.toLowerCase()}`}>
                  <h3 id={`titolo-${letter.toLowerCase()}`} className="font-display text-2xl font-semibold text-sea">{letter}</h3>
                  <ul className="mt-3 columns-1 gap-x-8 sm:columns-2 lg:columns-3 xl:columns-4">
                    {group.map((comune) => (
                      <li key={comune.slug} className="break-inside-avoid">
                        <Link href={`/citta/${comune.slug}`} prefetch={false} className="focus-ring group flex items-baseline justify-between gap-3 rounded py-2 text-sm text-ink hover:text-sea">
                          <span className="group-hover:underline">{comune.name}</span><span className="shrink-0 text-xs text-muted">{comune.provinceCode}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </> : <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-muted">L'indice dei comuni non è al momento disponibile.</p>}
        </section>
      </div>
    </main>
  );
}
