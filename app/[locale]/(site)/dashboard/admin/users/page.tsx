import { redirect } from "next/navigation";
import { UserManagement } from "@/components/admin/user-management";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params; const current = await requireAdmin(); if (!current) redirect(`/${locale}/dashboard`);
 const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, _count: { select: { events: true } } }, orderBy: { createdAt: "desc" } });
 return <div className="mx-auto max-w-6xl"><h1 className="font-display text-3xl font-semibold">{locale === "en" ? "Manage users" : "Gestione utenti"}</h1><div className="mt-7"><UserManagement users={users} currentUserId={current.id} locale={locale}/></div></div>;
}
