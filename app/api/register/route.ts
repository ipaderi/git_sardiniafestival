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
});

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Controlla nome, email e password (almeno 8 caratteri)." }, { status: 400 });

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  if (!smtpConfigured()) return NextResponse.json({ error: "La verifica email non è ancora configurata. Riprova più tardi." }, { status: 503 });
  const exists = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
  if (exists) return NextResponse.json({ error: "Esiste già un account con questa email." }, { status: 409 });

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
  try {
    await sendVerificationEmail(normalizedEmail, name, verificationUrl.toString());
    return NextResponse.json({ message: "Account creato. Ti abbiamo inviato un link valido 24 ore per verificare l'indirizzo email." }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Account creato. L'invio dell'email non è riuscito: puoi richiedere un nuovo link dalla pagina di accesso.", resend: true }, { status: 201 });
  }
}
