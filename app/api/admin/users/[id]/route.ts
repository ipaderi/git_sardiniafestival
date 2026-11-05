import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({ role: z.enum(["USER", "ADMIN"]).optional(), isActive: z.boolean().optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !Object.keys(parsed.data).length) return NextResponse.json({ error: "Aggiornamento non valido." }, { status: 400 });
  const { id } = await params;
  const current = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true } });
  if (!current) return NextResponse.json({ error: "Utente non trovato." }, { status: 404 });
  if (id === admin.id && (parsed.data.role === "USER" || parsed.data.isActive === false)) return NextResponse.json({ error: "Non puoi rimuovere i tuoi privilegi o disattivare il tuo account." }, { status: 400 });
  const willRemoveAdmin = current.role === "ADMIN" && current.isActive && (parsed.data.role === "USER" || parsed.data.isActive === false);
  if (willRemoveAdmin) {
    const activeAdmins = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
    if (activeAdmins <= 1) return NextResponse.json({ error: "Deve rimanere almeno un amministratore attivo." }, { status: 400 });
  }
  const user = await prisma.user.update({ where: { id }, data: parsed.data, select: { id: true, name: true, email: true, role: true, isActive: true } });
  return NextResponse.json({ user });
}
