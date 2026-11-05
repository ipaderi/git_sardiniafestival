import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const destination = new URL("/accedi", url.origin);
  if (!token || token.length > 128) {
    destination.searchParams.set("verification", "invalid");
    return NextResponse.redirect(destination);
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!record || record.expiresAt <= new Date()) {
    if (record) await prisma.emailVerificationToken.delete({ where: { id: record.id } });
    destination.searchParams.set("verification", "expired");
    return NextResponse.redirect(destination);
  }

  await prisma.$transaction([
    prisma.user.updateMany({ where: { email: record.email, emailVerified: null }, data: { emailVerified: new Date() } }),
    prisma.emailVerificationToken.delete({ where: { id: record.id } }),
  ]);
  destination.searchParams.set("verification", "success");
  return NextResponse.redirect(destination);
}
