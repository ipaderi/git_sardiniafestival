import { dictionary } from "@/lib/dictionary";
import adminIt from "@/messages/it/admin.json";
import adminEn from "@/messages/en/admin.json";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, LayoutDashboard, MapPin, UsersRound } from "lucide-react";
import { requireAdmin } from "@/lib/authz";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params; const t = dictionary(locale, adminIt, adminEn).layout; const user = await requireAdmin();
  if (!user) redirect(`/${locale}/dashboard`);
  const links = [{ href: `/${locale}/dashboard/admin`, label: t.overview, icon: LayoutDashboard }, { href: `/${locale}/dashboard/admin/events`, label: t.events, icon: CalendarDays }, { href: `/${locale}/dashboard/admin/cities`, label: t.featuredTowns, icon: MapPin }, { href: `/${locale}/dashboard/admin/users`, label: t.users, icon: UsersRound }];
  return <div className="min-h-screen bg-[#f6f7f4]"><div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] md:grid-cols-[220px_minmax(0,1fr)]"><aside className="border-b border-slate-200 bg-white p-3 md:min-h-[75vh] md:border-b-0 md:border-r md:p-5"><p className="hidden px-3 pb-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400 md:block">{t.administration}</p><nav aria-label={t.administration} className="flex gap-2 overflow-x-auto md:flex-col">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="inline-flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-ink hover:bg-[#e7f5f2]"><Icon size={16}/>{label}</Link>)}</nav></aside><main className="min-w-0 p-4 sm:p-6 lg:p-9">{children}</main></div></div>;
}
