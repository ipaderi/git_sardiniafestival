import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { ResendVerificationForm } from "@/components/site/resend-verification-form";

export const metadata: Metadata = { title: "Verifica il tuo account", robots: { index: false, follow: false } };

export default function ResendVerificationPage() {
  return <main className="grid min-h-[76vh] place-items-center bg-[#f6f7f4] px-5 py-12"><div className="w-full max-w-[450px]"><Link href="/accedi" className="focus-ring mb-6 inline-flex items-center gap-2 rounded text-sm font-semibold text-muted hover:text-sea"><ArrowLeft size={15} /> Torna all'accesso</Link><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(8,40,72,.08)] md:p-9"><span className="flex size-11 items-center justify-center rounded-2xl bg-[#e7f5f2] text-sea"><MailCheck size={20} /></span><h1 className="mt-5 font-display text-3xl font-semibold tracking-[-.04em] text-ink">Ti rimandiamo il link.</h1><p className="mt-2 text-sm leading-6 text-muted">Inserisci l'indirizzo usato per registrarti. Se l'account esiste e non è ancora verificato, invieremo una nuova email.</p><div className="mt-7"><ResendVerificationForm /></div></div></div></main>;
}
