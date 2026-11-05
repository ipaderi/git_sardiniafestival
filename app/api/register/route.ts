import { dictionary } from "@/lib/dictionary";
import it from "@/messages/it/api.json";
import en from "@/messages/en/api.json";
import { createHash, randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail, smtpConfigured } from "@/lib/email";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(100),
  locale: z.enum(["it", "en"]).default("it"),
});

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const locale = typeof body === "object" && body !== null && "locale" in body && body.locale === "en" ? "en" : "it";
  const t = dictionary(locale, it, en).register;
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: t.invalid }, { status: 400 });

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  if (!smtpConfigured()) return NextResponse.json({ error: t.unavailable }, { status: 503 });
  const exists = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
  if (exists) return NextResponse.json({ error: t.exists }, { status: 409 });

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.$transaction(async (tx) => {
    await tx.user.create({ data: { name, email: normalizedEmail, password: await hash(password, 12) } });
    await tx.emailVerificationToken.create({ data: { email: normalizedEmail, tokenHash, expiresAt } });
  });

  const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000";
  const verificationUrl = new URL("/api/auth/verify", site);
  verificationUrl.searchParams.set("token", token);
  verificationUrl.searchParams.set("locale", parsed.data.locale);
  try {
    await sendVerificationEmail(normalizedEmail, name, verificationUrl.toString(), parsed.data.locale);
    return NextResponse.json({ message: t.created }, { status: 201 });
  } catch {
    return NextResponse.json({ message: t.createdResend, resend: true }, { status: 201 });
  }
}
