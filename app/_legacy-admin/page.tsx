import Link from "next/link";
import { ArrowRight, CalendarDays, CircleCheck, Clock3, UsersRound } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const [totalEvents, pending, published, users, recent] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({ where: { status: "PENDING" } }),
    prisma.event.count({ where: { status: "PUBLISHED" } }),
    prisma.user.count(),
    prisma.event.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { organizer: { select: { name: true, email: true } } } }),
  ]);
  const stats = [
    { title: "Eventi totali", value: totalEvents, icon: CalendarDays, note: "Nel calendario" },
    { title: "Da rivedere", value: pending, icon: Clock3, note: "In attesa di verifica", tone: "coral" },
    { title: "Pubblicati", value: published, icon: CircleCheck, note: "Visibili sul portale", tone: "sea" },
    { title: "Utenti", value: users, icon: UsersRound, note: "Account registrati" },
  ];
  return <div className="mx-auto max-w-6xl"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-sea">SardiniaFestival</p><h1 className="mt-1 font-display text-3xl font-semibold tracking-[-.04em] text-ink">Panoramica</h1><p className="mt-2 text-sm text-muted">Ecco cosa succede nel portale.</p></div>
    <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ title, value, icon: Icon, note, tone }) => <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-muted">{title}</p><Icon size={17} className={tone === "coral" ? "text-coral" : tone === "sea" ? "text-sea" : "text-slate-400"} /></div><p className="mt-4 font-display text-3xl font-semibold text-ink">{value}</p><p className="mt-1 text-[11px] text-muted">{note}</p></div>)}</div>
    <div className="mt-7 grid gap-5 lg:grid-cols-[1.4fr_.6fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-display text-xl font-semibold text-ink">Segnalazioni recenti</h2><p className="mt-1 text-xs text-muted">Gli ultimi eventi inviati dalla community.</p></div><Link href="/admin/eventi" className="focus-ring inline-flex items-center gap-1 rounded text-xs font-bold text-sea">Tutti <ArrowRight size={14} /></Link></div><div className="mt-4 divide-y divide-slate-100">{recent.length ? recent.map((event) => <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold text-ink">{event.title}</p><p className="mt-1 text-[11px] text-muted">{event.location} · {event.organizer?.name || event.organizer?.email || "ospite"}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${event.status === "PENDING" ? "bg-amber-50 text-amber-800" : event.status === "PUBLISHED" ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-600"}`}>{event.status === "PENDING" ? "In revisione" : event.status === "PUBLISHED" ? "Pubblicato" : event.status === "REJECTED" ? "Non approvato" : "Annullato"}</span></div>) : <p className="py-8 text-center text-sm text-muted">Ancora nessuna segnalazione.</p>}</div></section>
      <section className="rounded-2xl bg-[#082848] p-6 text-white"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-teal-200">Azioni rapide</p><h2 className="mt-3 font-display text-xl font-semibold">Tieni viva la festa</h2><Link href="/admin/eventi?status=PENDING" className="mt-5 flex items-center justify-between rounded-xl bg-white/10 p-4 text-sm font-semibold hover:bg-white/15"><span>Rivedi le segnalazioni</span><ArrowRight size={16} /></Link><Link href="/admin/utenti" className="mt-2 flex items-center justify-between rounded-xl bg-white/10 p-4 text-sm font-semibold hover:bg-white/15"><span>Gestisci utenti</span><ArrowRight size={16} /></Link></section></div>
  </div>;
}
