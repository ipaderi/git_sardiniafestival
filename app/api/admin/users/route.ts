import { apiEventMessages } from "@/lib/api-locale";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const messages = apiEventMessages(request);
  if (!(await requireAdmin())) return NextResponse.json({ error: messages.unauthorized }, { status: 403 });
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, _count: { select: { events: true } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ users });
}
