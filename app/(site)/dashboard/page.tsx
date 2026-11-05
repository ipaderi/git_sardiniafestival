import { redirect } from "next/navigation";
import { CalendarDays, Clock3, CircleCheck, CircleX, UserRound } from "lucide-react";
import { auth } from "@/auth";
import { getCurrentUser } from "@/lib/authz";
import { SignOutButton } from "@/components/site/auth-forms";
import { prisma } from "@/lib/prisma";

const labels: Record<string, string> = { PENDING: "In revisione", PUBLISHED: "Pubblicato", REJECTED: "Non approvato", CANCELLED: "Annullato" };
const styles: Record<string, string> = { PENDING: "bg-amber-50 text-amber-800", PUBLISHED: "bg-teal-50 text-teal-800", REJECTED: "bg-rose-50 text-rose-800", CANCELLED: "bg-slate-100 text-slate-600" };
const icons = { PENDING: Clock3, PUBLISHED: CircleCheck, REJECTED: CircleX, CANCELLED: CircleX };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi");
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/accedi");
  if (currentUser.role === "ADMIN") redirect("/admin");
  const events = await prisma.event.findMany({ where: { organizerId: session.user.id }, orderBy: { createdAt: "desc" } }).catch(() => []);
  return <main className="min-h-[65vh] bg-[#f6f7f4] px-5 py-10"><div className="mx-auto max-w-5xl"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-sea">La tua area</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-[-.04em] text-ink">Ciao, {session.user.name?.split(" ")[0] || "che bello rivederti"}.</h1></div><SignOutButton /></div><div className="mt-8 grid gap-4 sm:grid-cols-[.8fr_2fr]"><div className="rounded-2xl bg-[#082848] p-5 text-white"><span className="flex size-10 items-center justify-center rounded-full bg-white/10"><UserRound size={19} className="text-teal-200" /></span><p className="mt-5 text-xs text-blue-100/70">Account</p><p className="mt-1 break-all text-sm font-semibold">{session.user.email}</p><p className="mt-5 text-xs text-blue-100/70">Segnalazioni</p><p className="mt-1 font-display text-3xl font-semibold">{events.length}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6"><div className="flex items-center justify-between"><div><h2 className="font-display text-xl font-semibold text-ink">I tuoi eventi</h2><p className="mt-1 text-xs text-muted">Segui lo stato delle tue segnalazioni.</p></div><CalendarDays size={20} className="text-sea" /></div>{events.length ? <div className="mt-5 divide-y divide-slate-100">{events.map((event) => { const Icon = icons[event.status]; return <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><h3 className="font-semibold text-ink">{event.title}</h3><p className="mt-1 text-xs text-muted">{event.location} · {event.startsAt.toLocaleDateString("it-IT")}</p></div><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${styles[event.status]}`}><Icon size={13} />{labels[event.status]}</span></div>; })}</div> : <div className="mt-5 rounded-2xl bg-[#f6f7f4] px-5 py-9 text-center"><p className="font-semibold text-ink">Ancora nessuna segnalazione</p><p className="mt-1 text-xs text-muted">Quando invii un evento, lo ritrovi qui.</p><a href="/segnala-evento" className="mt-4 inline-flex rounded-xl bg-sea-bright px-4 py-2.5 text-xs font-bold text-ink">Segnala un evento</a></div>}</div></div></div></main>;
}
