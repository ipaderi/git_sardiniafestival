import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  const events = await prisma.event.findMany({ include: { dates: { orderBy: { startsAt: "asc" } }, organizer: { select: { name: true, email: true } } }, orderBy: [{ status: "asc" }, { startsAt: "asc" }] });
  return NextResponse.json({ events });
}
