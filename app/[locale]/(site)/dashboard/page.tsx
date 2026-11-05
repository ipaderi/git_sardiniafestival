import { dictionary } from "@/lib/dictionary";
import adminIt from "@/messages/it/admin.json";
import adminEn from "@/messages/en/admin.json";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; const en = locale === "en"; const t = dictionary(locale, adminIt, adminEn).dashboard;
  const user = await getCurrentUser(); if (!user) redirect(`/${locale}/auth/login`);
  const events = await prisma.event.findMany({ where: { organizerId: user.id }, orderBy: { createdAt: "desc" } });
  const labels: Record<string, string> = t.statuses;
  return <main className="min-h-[65vh] bg-[#f6f7f4] px-5 py-10"><div className="mx-auto max-w-5xl"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-sea">{t.yourAccount}</p><h1 className="mt-2 font-display text-3xl font-semibold text-ink">{t.hello}, {user.name?.split(" ")[0] || (t.welcome)}.</h1><p className="mt-2 text-sm text-muted">{user.email}</p></div><Link href={`/${locale}/dashboard/crea-evento`} className="rounded-xl bg-sea-bright px-5 py-3 text-sm font-bold text-ink">{t.createAnEvent}</Link></div>{user.role === "ADMIN" && <Link href={`/${locale}/dashboard/admin`} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white"><ShieldCheck size={17}/>{t.administration}</Link>}<div className="mt-5"><Link href={`/${locale}/dashboard/connessioni`} className="text-sm font-semibold text-sea hover:underline">{t.connectedApps} →</Link></div><section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 md:p-7"><div className="flex items-center justify-between"><div><h2 className="font-display text-xl font-semibold">{t.yourEvents}</h2><p className="mt-1 text-sm text-muted">{t.trackTheStatusOfYourSubmissions}</p></div><CalendarDays className="text-sea" size={20}/></div>{events.length ? <div className="mt-5 divide-y divide-slate-100">{events.map((event) => <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div>{event.status === "PUBLISHED" ? <Link className="font-semibold text-sea" href={`/${locale}/event/${event.slug}`}>{en && event.titleEn ? event.titleEn : event.title}</Link> : <p className="font-semibold">{en && event.titleEn ? event.titleEn : event.title}</p>}<p className="mt-1 text-xs text-muted">{event.location || (t.online)} · {event.startsAt.toLocaleDateString(t.dateLocale, { timeZone: "Europe/Rome" })}</p></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold">{labels[event.status]}</span></div>)}</div> : <div className="mt-5 rounded-2xl bg-[#f6f7f4] p-8 text-center"><p className="font-semibold">{t.noSubmissionsYet}</p><p className="mt-1 text-sm text-muted">{t.yourSubmittedEventsWillAppearHere}</p></div>}</section></div></main>;
}
