"use client";

import { dictionary } from "@/lib/dictionary";
import it from "@/messages/it/account.json";
import enMessages from "@/messages/en/account.json";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AccountAuthForm({ locale, mode, token = "", callbackUrl }: { locale: string; mode: "login" | "register" | "password-reset" | "verify-resend"; token?: string; callbackUrl?: string }) {
  const t = dictionary(locale, it, enMessages).authForm;
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
      setError(t.passwordsDoNotMatch); setBusy(false); return;
    }
    try {
      if (mode === "login") {
        const destination = callbackUrl && ((callbackUrl.startsWith(`/${locale}/`) && !callbackUrl.startsWith("//")) || callbackUrl.startsWith("/api/oauth/authorize?")) ? callbackUrl : `/${locale}/dashboard`;
        const result = await signIn("credentials", { email, password, redirect: false, callbackUrl: destination });
        if (!result?.ok) throw new Error(t.incorrectEmailOrPassword);
        if (destination.startsWith("/api/oauth/authorize?")) {
          window.location.assign(destination);
        } else {
          router.push(destination); router.refresh();
        }
        return;
      }
      const endpoint = mode === "register" ? "/api/register" : mode === "verify-resend" ? "/api/auth/resend-verification" : "/api/auth/password-reset";
      const body = mode === "register" ? { name: values.get("name"), email, password, locale } : token ? { token, password, locale } : { email, locale };
      const response = await fetch(endpoint, { method: token && mode === "password-reset" ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error(response.status === 503 ? (t.emailServiceUnavailablePleaseTryLater) : mode === "password-reset" && token ? (t.invalidOrExpiredLinkRequestANew) : (t.unableToCompleteTheRequestCheckThe));
      setMessage(mode === "register" ? (t.accountCreatedCheckYourEmailForThe) : mode === "verify-resend" ? (t.ifYourAccountNeedsVerificationYouWill) : token ? (t.passwordUpdatedYouCanNowSignIn) : (t.ifTheAccountExistsYouWillReceive));
      setDone(true);
    } catch (err) { setError(err instanceof Error ? err.message : (t.pleaseTryAgain)); } finally { setBusy(false); }
  }
  if (done) return <div role="status" className="space-y-4 rounded-2xl bg-[#e7f5f2] p-5 text-sm text-ink"><p>{message}</p><Link href={`/${locale}/auth/login`} className="font-bold text-sea">{t.goToLogin}</Link></div>;
  const label = "grid gap-2 text-xs font-bold text-ink";
  return <form onSubmit={submit} className="space-y-4">
    {mode === "register" && <label className={label}>{t.name}<Input name="name" required minLength={2} maxLength={80} autoComplete="name" /></label>}
    {!(mode === "password-reset" && token) && <label className={label}>{t.email}<Input name="email" type="email" required maxLength={160} autoComplete="email" /></label>}
    {(mode === "login" || mode === "register" || (mode === "password-reset" && token)) && <label className={label}>{t.password}<Input name="password" type="password" required minLength={mode === "login" ? undefined : 8} maxLength={100} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>}
    {(mode === "register" || (mode === "password-reset" && token)) && <label className={label}>{t.confirmPassword}<Input name="confirmPassword" type="password" required minLength={8} maxLength={100} autoComplete="new-password" /></label>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? (t.pleaseWait) : mode === "login" ? (t.signIn) : mode === "register" ? (t.createAccount) : mode === "password-reset" && token ? (t.savePassword) : (t.sendLink)}</Button>
  </form>;
}
