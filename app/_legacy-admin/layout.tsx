import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, LayoutDashboard, UsersRound, ExternalLink, LogOut } from "lucide-react";
import { auth, signOut } from "@/auth";
import { requireAdmin } from "@/lib/authz";

export const metadata: Metadata = { title: { default: "Amministrazione", template: "%s | Admin SardiniaFestival" }, robots: { index: false, follow: false } };

const links = [
  { href: "/admin", label: "Panoramica", icon: LayoutDashboard },
  { href: "/admin/eventi", label: "Eventi", icon: CalendarDays },
  { href: "/admin/utenti", label: "Utenti", icon: UsersRound },
];

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAdmin();
  if (!user) redirect("/dashboard");
  return <div className="min-h-screen bg-[#f6f7f4]">
    <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6"><Link href="/admin" className="focus-ring rounded-sm"><img src="/brand/logo-sardiniafestival.svg" alt="SardiniaFestival" className="w-[185px]" /></Link><div className="flex items-center gap-2"><span className="hidden text-xs text-muted sm:inline">{user.email}</span><a className="focus-ring inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-slate-100" href="/"><ExternalLink size={14} /> Portale</a><form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}><button className="focus-ring inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-muted hover:bg-slate-100"><LogOut size={14} /><span className="hidden sm:inline">Esci</span></button></form></div></header>
    <div className="mx-auto grid max-w-[1440px] md:grid-cols-[220px_1fr]">
      <aside className="border-b border-slate-200 bg-white p-3 md:min-h-[calc(100vh-68px)] md:border-b-0 md:border-r md:p-5"><p className="hidden px-3 pb-3 pt-2 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400 md:block">Gestione portale</p><nav aria-label="Amministrazione" className="flex gap-2 overflow-x-auto md:flex-col">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="focus-ring inline-flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-ink-soft hover:bg-[#e7f5f2] hover:text-sea"><Icon size={16} />{label}</Link>)}</nav><div className="mt-8 hidden rounded-2xl bg-[#082848] p-4 text-white md:block"><p className="text-xs font-semibold">La Sardegna si muove.</p><p className="mt-1 text-[11px] leading-5 text-blue-100/70">Verifica le segnalazioni e tieni aggiornato il calendario.</p></div></aside>
      <main className="min-w-0 p-4 sm:p-6 lg:p-9">{children}</main>
    </div>
  </div>;
}
