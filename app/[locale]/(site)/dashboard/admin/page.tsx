import { dictionary } from "@/lib/dictionary";
import adminIt from "@/messages/it/admin.json";
import adminEn from "@/messages/en/admin.json";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; const t = dictionary(locale, adminIt, adminEn).overview;
  const [total, pending, published, users] = await Promise.all([prisma.event.count(), prisma.event.count({ where: { status: "PENDING" } }), prisma.event.count({ where: { status: "PUBLISHED" } }), prisma.user.count()]);
  const stats = [[t.events, total], [t.awaitingReview, pending], [t.published, published], [t.users, users]] as const;
  return <div className="mx-auto max-w-6xl"><h1 className="font-display text-3xl font-semibold">{t.overview}</h1><p className="mt-2 text-sm text-muted">{t.manageThePortalAndItsCommunity}</p><div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold text-muted">{label}</p><p className="mt-4 font-display text-3xl font-semibold">{value}</p></div>)}</div><div className="mt-7 flex flex-wrap gap-3"><Link className="rounded-xl bg-sea-bright px-5 py-3 text-sm font-bold" href={`/${locale}/dashboard/admin/events?status=PENDING`}>{t.reviewSubmissions}</Link><Link className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold" href={`/${locale}/dashboard/admin/users`}>{t.manageUsers}</Link></div></div>;
}
