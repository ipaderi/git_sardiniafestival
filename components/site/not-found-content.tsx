import { dictionary } from "@/lib/dictionary";
import it from "@/messages/it/navigation.json";
import en from "@/messages/en/navigation.json";
import Link from "next/link";
import { ArrowLeft, MapPinOff } from "lucide-react";

export function NotFoundContent({ locale = "it" }: { locale?: string }) {
  const t = dictionary(locale, it, en);
  return <main className="grid min-h-[70vh] place-items-center px-5 py-16 text-center"><div><span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#e7f5f2] text-sea"><MapPinOff size={24} /></span><p className="mt-5 text-[11px] font-bold uppercase tracking-[.16em] text-sea">{t.notFoundEyebrow}</p><h1 className="mt-2 font-display text-4xl font-semibold tracking-[-.04em] text-ink">{t.notFoundTitle}</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">{t.notFoundDescription}</p><Link href={`/${locale}/events`} className="focus-ring mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sea-bright px-5 text-sm font-semibold text-ink hover:bg-[#4bd0c2]"><ArrowLeft size={16} /> {t.exploreEvents}</Link></div></main>;
}
