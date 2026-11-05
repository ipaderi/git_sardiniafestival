import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/authz";
import { UserManagement } from "@/components/admin/user-management";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Gestione utenti" };

export default async function AdminUsersPage() {
  const user = await requireAdmin();
  if (!user) redirect("/");
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, _count: { select: { events: true } } }, orderBy: { createdAt: "desc" } });
  return <div className="mx-auto max-w-6xl"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-sea">Community</p><h1 className="mt-1 font-display text-3xl font-semibold tracking-[-.04em] text-ink">Gestione utenti</h1><p className="mt-2 text-sm text-muted">Ruoli, accesso e attività degli account registrati.</p><div className="mt-7"><UserManagement users={users} currentUserId={user.id} /></div></div>;
}
