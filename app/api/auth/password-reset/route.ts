import { dictionary } from "@/lib/dictionary";
import it from "@/messages/it/api.json";
import en from "@/messages/en/api.json";
import { createHash, randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail, smtpConfigured } from "@/lib/email";

const requestSchema = z.object({ email: z.string().trim().email().max(160), locale: z.enum(["it", "en"]).default("it") });
const resetSchema = z.object({ token: z.string().min(32).max(128), password: z.string().min(8).max(100) });

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const locale = typeof body === "object" && body !== null && "locale" in body && body.locale === "en" ? "en" : "it";
  const t = dictionary(locale, it, en).reset;
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: t.invalidEmail }, { status: 400 });
  if (!smtpConfigured()) return NextResponse.json({ error: t.unavailable }, { status: 503 });
  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }, select: { isActive: true, password: true } });
  if (user?.isActive && user.password) {
    const recent = await prisma.passwordResetToken.findFirst({ where: { email, createdAt: { gte: new Date(Date.now() - 60_000) } }, select: { id: true } });
    if (!recent) {
      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({ where: { email } }),
        prisma.passwordResetToken.create({ data: { email, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } }),
      ]);
      const url = new URL(`/${parsed.data.locale}/auth/password-reset`, process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000");
      url.searchParams.set("token", token);
      try { await sendPasswordResetEmail(email, url.toString(), parsed.data.locale); }
      catch (error) {
        await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
        console.error("Password reset email failed", error);
      }
    }
  }
  return NextResponse.json({ message: t.generic });
}

export async function PUT(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const locale = typeof body === "object" && body !== null && "locale" in body && body.locale === "en" ? "en" : "it";
  const t = dictionary(locale, it, en).reset;
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: t.invalidRequest }, { status: 400 });
  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const password = await hash(parsed.data.password, 12);
  const success = await prisma.$transaction(async (tx) => {
    const record = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.expiresAt <= new Date()) return false;
    const consumed = await tx.passwordResetToken.deleteMany({ where: { id: record.id, expiresAt: { gt: new Date() } } });
    if (consumed.count !== 1) return false;
    const updated = await tx.user.updateMany({ where: { email: record.email, isActive: true }, data: { password, sessionVersion: { increment: 1 } } });
    await tx.passwordResetToken.deleteMany({ where: { email: record.email } });
    return updated.count === 1;
  });
  return success ? NextResponse.json({ ok: true }) : NextResponse.json({ error: t.invalidLink }, { status: 400 });
}
