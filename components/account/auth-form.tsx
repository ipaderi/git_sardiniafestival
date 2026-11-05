"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AccountAuthForm({ locale, mode, token = "", callbackUrl }: { locale: string; mode: "login" | "register" | "password-reset" | "verify-resend"; token?: string; callbackUrl?: string }) {
  const en = locale === "en";
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const values = new FormData(event.currentTarget);
    const email = values.get("email");
    const password = String(values.get("password") || "");
    if ((mode === "register" || (mode === "password-reset" && token)) && password !== values.get("confirmPassword")) {
      setError(en ? "Passwords do not match." : "Le password non coincidono."); setBusy(false); return;
    }
    try {
      if (mode === "login") {
        const destination = callbackUrl?.startsWith(`/${locale}/`) && !callbackUrl.startsWith("//") ? callbackUrl : `/${locale}/dashboard`;
        const result = await signIn("credentials", { email, password, redirect: false, callbackUrl: destination });
        if (!result?.ok) throw new Error(en ? "Incorrect email or password." : "Email o password non corretti.");
        router.push(destination); router.refresh(); return;
      }
      const endpoint = mode === "register" ? "/api/register" : mode === "verify-resend" ? "/api/auth/resend-verification" : "/api/auth/password-reset";
      const body = mode === "register" ? { name: values.get("name"), email, password, locale } : token ? { token, password } : { email, locale };
      const response = await fetch(endpoint, { method: token && mode === "password-reset" ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error(response.status === 503 ? (en ? "Email service unavailable. Please try later." : "Servizio email non disponibile. Riprova più tardi.") : mode === "password-reset" && token ? (en ? "Invalid or expired link. Request a new one." : "Link non valido o scaduto. Richiedine uno nuovo.") : (en ? "Unable to complete the request. Check the details and try again." : "Impossibile completare la richiesta. Controlla i dati e riprova."));
      setMessage(mode === "register" ? (en ? "Account created. Check your email for the verification link; if it does not arrive, request a new link." : "Account creato. Controlla la posta per il link di verifica; se non arriva, richiedine uno nuovo.") : mode === "verify-resend" ? (en ? "If your account needs verification, you will receive an email." : "Se l'account deve essere verificato, riceverai una email.") : token ? (en ? "Password updated. You can now sign in." : "Password aggiornata. Ora puoi accedere.") : (en ? "If the account exists, you will receive a reset link." : "Se l'account esiste, riceverai un link per reimpostare la password."));
      setDone(true);
    } catch (err) { setError(err instanceof Error ? err.message : (en ? "Please try again." : "Riprova più tardi.")); } finally { setBusy(false); }
  }
  if (done) return <div role="status" className="space-y-4 rounded-2xl bg-[#e7f5f2] p-5 text-sm text-ink"><p>{message}</p><Link href={`/${locale}/auth/login`} className="font-bold text-sea">{en ? "Go to login" : "Vai all'accesso"}</Link></div>;
  const label = "grid gap-2 text-xs font-bold text-ink";
  return <form onSubmit={submit} className="space-y-4">
    {mode === "register" && <label className={label}>{en ? "Name" : "Nome"}<Input name="name" required minLength={2} maxLength={80} autoComplete="name" /></label>}
    {!(mode === "password-reset" && token) && <label className={label}>Email<Input name="email" type="email" required maxLength={160} autoComplete="email" /></label>}
    {(mode === "login" || mode === "register" || (mode === "password-reset" && token)) && <label className={label}>{en ? "Password" : "Password"}<Input name="password" type="password" required minLength={mode === "login" ? undefined : 8} maxLength={100} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>}
    {(mode === "register" || (mode === "password-reset" && token)) && <label className={label}>{en ? "Confirm password" : "Ripeti la password"}<Input name="confirmPassword" type="password" required minLength={8} maxLength={100} autoComplete="new-password" /></label>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? (en ? "Please wait…" : "Attendi…") : mode === "login" ? (en ? "Sign in" : "Accedi") : mode === "register" ? (en ? "Create account" : "Crea account") : mode === "password-reset" && token ? (en ? "Save password" : "Salva password") : (en ? "Send link" : "Invia il link")}</Button>
  </form>;
}
