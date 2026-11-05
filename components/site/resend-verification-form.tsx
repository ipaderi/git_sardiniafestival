"use client";

import { useState } from "react";
import { ArrowRight, LoaderCircle, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResendVerificationForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const email = new FormData(event.currentTarget).get("email");
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Invio non riuscito.");
      setMessage(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Riprova tra poco.");
    } finally {
      setLoading(false);
    }
  }

  return <form onSubmit={submit} className="space-y-4">
    <label className="grid gap-2 text-xs font-bold text-ink">Email registrata<Input name="email" type="email" required autoComplete="email" placeholder="nome@esempio.it" /></label>
    {message && <p role="status" className="rounded-xl bg-[#e7f5f2] p-3 text-sm text-ink-soft">{message}</p>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? <><LoaderCircle size={16} className="animate-spin" /> Invio…</> : <><MailCheck size={16} /> Invia il link <ArrowRight size={16} /></>}</Button>
  </form>;
}
