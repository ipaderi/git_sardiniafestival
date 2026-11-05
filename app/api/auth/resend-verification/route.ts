import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail, smtpConfigured } from "@/lib/email";

const schema = z.object({ email: z.string().trim().email().max(160) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inserisci un indirizzo email valido." }, { status: 400 });
  if (!smtpConfigured()) return NextResponse.json({ error: "Il servizio email non è disponibile al momento." }, { status: 503 });

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }, select: { name: true, emailVerified: true } });
  if (user && !user.emailVerified) {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await prisma.emailVerificationToken.deleteMany({ where: { email } });
    await prisma.emailVerificationToken.create({ data: { email, tokenHash, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000";
    const verificationUrl = new URL("/api/auth/verify", site);
    verificationUrl.searchParams.set("token", token);
    try {
      await sendVerificationEmail(email, user.name || "", verificationUrl.toString());
    } catch {
      return NextResponse.json({ error: "Non è stato possibile inviare l'email. Riprova più tardi." }, { status: 503 });
    }
  }

  return NextResponse.json({ message: "Se l'account esiste e deve ancora essere verificato, riceverai un nuovo link." });
}
