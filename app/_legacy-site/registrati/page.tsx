import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { RegisterForm } from "@/components/site/auth-forms";

export const metadata: Metadata = { title: "Crea un account", robots: { index: false, follow: false } };

export default function RegisterPage() {
  return <main className="grid min-h-[76vh] place-items-center bg-[#f6f7f4] px-5 py-12"><div className="w-full max-w-[450px]"><Link href="/" className="focus-ring mb-6 inline-flex items-center gap-2 rounded text-sm font-semibold text-muted hover:text-sea"><ArrowLeft size={15} /> Torna a SardiniaFestival</Link><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(8,40,72,.08)] md:p-9"><span className="flex size-11 items-center justify-center rounded-2xl bg-[#fff0e9] text-coral"><Sparkles size={20} /></span><h1 className="mt-5 font-display text-3xl font-semibold tracking-[-.04em] text-ink">Entra nella community.</h1><p className="mt-2 text-sm text-muted">Un account per seguire le tue segnalazioni e pubblicare nuovi eventi.</p><div className="mt-7"><RegisterForm /></div><p className="mt-6 text-center text-sm text-muted">Hai già un account? <Link href="/accedi" className="font-bold text-sea hover:text-ink">Accedi</Link></p></div></div></main>;
}
