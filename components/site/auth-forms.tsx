"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { ArrowRight, LoaderCircle, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/use-locale";
import { dictionary } from "@/lib/dictionary";
import it from "@/messages/it/navigation.json";
import en from "@/messages/en/navigation.json";

export function SignInForm({ callbackUrl = "/dashboard" }: { callbackUrl?: string }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    const values = new FormData(event.currentTarget);
    const result = await signIn("credentials", { email: values.get("email"), password: values.get("password"), redirect: false, callbackUrl });
    if (result?.ok) { router.push(callbackUrl); router.refresh(); }
    else { setError("Email o password non corretti. Controlla i dati e riprova."); setLoading(false); }
  }
  return <form onSubmit={submit} className="space-y-4"><label className="grid gap-2 text-xs font-bold text-ink">Email<Input name="email" type="email" required autoComplete="email" placeholder="nome@esempio.it" /></label><label className="grid gap-2 text-xs font-bold text-ink">Password<Input name="password" type="password" required autoComplete="current-password" placeholder="La tua password" /></label>{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? <><LoaderCircle size={17} className="animate-spin" /> Accesso…</> : <>Accedi <ArrowRight size={17} /></>}</Button><p className="flex items-center justify-center gap-1.5 text-[11px] text-muted"><LockKeyhole size={13} /> Accesso protetto e password cifrata</p></form>;
}

export function RegisterForm() {
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const [done, setDone] = useState(false); const [statusMessage, setStatusMessage] = useState(""); const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    const values = new FormData(event.currentTarget);
    const password = String(values.get("password") || "");
    if (password !== String(values.get("confirmPassword") || "")) { setError("Le password non coincidono."); setLoading(false); return; }
    try {
      const response = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: values.get("name"), email: values.get("email"), password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Non è stato possibile creare l'account.");
      setStatusMessage(result.message || "Account creato. Controlla la tua posta per verificare l'indirizzo email.");
      setDone(true);
    } catch (error) { setError(error instanceof Error ? error.message : "Riprova tra poco."); setLoading(false); }
  }
  if (done) return <div role="status" className="rounded-2xl bg-[#e7f5f2] p-5"><h2 className="font-semibold text-ink">Controlla la tua posta</h2><p className="mt-2 text-sm leading-6 text-ink-soft">{statusMessage}</p><a className="mt-4 inline-flex text-sm font-bold text-sea" href="/accedi">Vai all'accesso <ArrowRight size={15} className="ml-1" /></a></div>;
  return <form onSubmit={submit} className="space-y-4"><label className="grid gap-2 text-xs font-bold text-ink">Nome<Input name="name" required minLength={2} maxLength={80} autoComplete="name" placeholder="Come ti chiami?" /></label><label className="grid gap-2 text-xs font-bold text-ink">Email<Input name="email" type="email" required autoComplete="email" placeholder="nome@esempio.it" /></label><label className="grid gap-2 text-xs font-bold text-ink">Password<Input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Almeno 8 caratteri" /></label><label className="grid gap-2 text-xs font-bold text-ink">Ripeti la password<Input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" placeholder="Inserisci di nuovo la password" /></label>{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm leading-5 text-rose-700">{error}</p>}<Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? <><LoaderCircle size={17} className="animate-spin" /> Creazione account…</> : <>Crea account <ArrowRight size={17} /></>}</Button></form>;
}

export function SignOutButton() {
  const locale = useLocale();
  return <button className="focus-ring rounded-lg px-3 py-2 text-xs font-bold text-muted hover:bg-slate-100 hover:text-ink" onClick={() => signOut({ redirectTo: `/${locale}` })}>{dictionary(locale, it, en).signOut}</button>;
}
