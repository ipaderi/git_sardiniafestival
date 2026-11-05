import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const comuni = await prisma.comune.findMany({
      select: { id: true, name: true, slug: true, provinceCode: true, provinceName: true, latitude: true, longitude: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ comuni }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
  } catch {
    return NextResponse.json({ error: "Elenco dei comuni temporaneamente non disponibile." }, { status: 503 });
  }
}
