import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { SignInForm } from "@/components/site/auth-forms";

export const metadata: Metadata = { title: "Accedi", robots: { index: false, follow: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; verification?: string }> }) {
  const params = await searchParams;
  const requested = params.callbackUrl || "/dashboard";
  const callbackUrl = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard";
  const verificationMessage = params.verification === "success" ? "Email verificata. Ora puoi accedere." : params.verification === "expired" ? "Il link è scaduto o è già stato usato. Puoi richiederne uno nuovo." : params.verification === "invalid" ? "Il link di verifica non è valido." : "";
  return <main className="grid min-h-[76vh] place-items-center bg-[#f6f7f4] px-5 py-12"><div className="w-full max-w-[450px]"><Link href="/" className="focus-ring mb-6 inline-flex items-center gap-2 rounded text-sm font-semibold text-muted hover:text-sea"><ArrowLeft size={15} /> Torna a SardiniaFestival</Link><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(8,40,72,.08)] md:p-9"><span className="flex size-11 items-center justify-center rounded-2xl bg-[#e7f5f2] text-sea"><Compass size={21} /></span><h1 className="mt-5 font-display text-3xl font-semibold tracking-[-.04em] text-ink">Bentornato.</h1><p className="mt-2 text-sm text-muted">Accedi per gestire i tuoi eventi e le tue segnalazioni.</p>{verificationMessage && <p role="status" className="mt-4 rounded-xl bg-[#e7f5f2] p-3 text-sm text-ink-soft">{verificationMessage}</p>}<div className="mt-7"><SignInForm callbackUrl={callbackUrl} /></div><p className="mt-5 text-center text-xs text-muted">Account non verificato? <Link href="/rinvia-verifica" className="font-bold text-sea hover:text-ink">Invia di nuovo il link</Link></p><p className="mt-4 text-center text-sm text-muted">Non hai un account? <Link href="/registrati" className="font-bold text-sea hover:text-ink">Registrati</Link></p></div></div></main>;
}
