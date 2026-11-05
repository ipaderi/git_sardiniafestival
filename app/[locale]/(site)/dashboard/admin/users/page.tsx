import { dictionary } from "@/lib/dictionary";
import adminIt from "@/messages/it/admin.json";
import adminEn from "@/messages/en/admin.json";
import { redirect } from "next/navigation";
import { UserManagement } from "@/components/admin/user-management";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params; const t = dictionary(locale, adminIt, adminEn).usersPage; const current = await requireAdmin(); if (!current) redirect(`/${locale}/dashboard`);
 const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, _count: { select: { events: true } } }, orderBy: { createdAt: "desc" } });
 return <div className="mx-auto max-w-6xl"><h1 className="font-display text-3xl font-semibold">{t.manageUsers}</h1><div className="mt-7"><UserManagement users={users} currentUserId={current.id} locale={locale}/></div></div>;
}
