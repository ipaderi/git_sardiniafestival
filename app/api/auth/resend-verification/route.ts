import { dictionary } from "@/lib/dictionary";
import it from "@/messages/it/api.json";
import en from "@/messages/en/api.json";
import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail, smtpConfigured } from "@/lib/email";

const schema = z.object({ email: z.string().trim().email().max(160), locale: z.enum(["it", "en"]).default("it") });

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const locale = typeof body === "object" && body !== null && "locale" in body && body.locale === "en" ? "en" : "it";
  const t = dictionary(locale, it, en).resend;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: t.invalid }, { status: 400 });
  if (!smtpConfigured()) return NextResponse.json({ error: t.unavailable }, { status: 503 });

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }, select: { name: true, emailVerified: true } });
  if (user && !user.emailVerified) {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await prisma.emailVerificationToken.deleteMany({ where: { email } });
    await prisma.emailVerificationToken.create({ data: { email, tokenHash, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000";
    const verificationUrl = new URL("/api/auth/verify", site);
    verificationUrl.searchParams.set("locale", parsed.data.locale === "en" ? "en" : "it");
    verificationUrl.searchParams.set("token", token);
    try {
      await sendVerificationEmail(email, user.name || "", verificationUrl.toString(), parsed.data.locale);
    } catch {
      return NextResponse.json({ error: t.failed }, { status: 503 });
    }
  }

  return NextResponse.json({ message: t.sent });
}
