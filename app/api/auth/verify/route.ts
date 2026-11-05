import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const locale = url.searchParams.get("locale") === "en" ? "en" : "it";
  const destination = new URL(`/${locale}/auth/login`, url.origin);
  if (!token || token.length > 128) {
    destination.searchParams.set("verification", "invalid");
    return NextResponse.redirect(destination);
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!record || record.expiresAt <= new Date()) {
    if (record) await prisma.emailVerificationToken.deleteMany({ where: { id: record.id } });
    destination.searchParams.set("verification", "expired");
    return NextResponse.redirect(destination);
  }

  const consumed = await prisma.$transaction(async (tx) => {
    const deleted = await tx.emailVerificationToken.deleteMany({ where: { id: record.id, expiresAt: { gt: new Date() } } });
    if (deleted.count !== 1) return false;
    await tx.user.updateMany({ where: { email: record.email, emailVerified: null }, data: { emailVerified: new Date() } });
    return true;
  });
  destination.searchParams.set("verification", consumed ? "success" : "expired");
  return NextResponse.redirect(destination);
}
