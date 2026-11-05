"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Shield, UserRound, UserRoundX } from "lucide-react";
import { Button } from "@/components/ui/button";

type AdminUser = { id: string; name: string | null; email: string; role: "USER" | "ADMIN"; isActive: boolean; createdAt: string | Date; _count: { events: number } };

export function UserManagement({ users, currentUserId, locale = "it" }: { users: AdminUser[]; currentUserId: string; locale?: string }) {
  const en = locale === "en";
  const [busy, setBusy] = useState(""); const [error, setError] = useState(""); const router = useRouter();
  async function update(id: string, patch: { role?: "USER" | "ADMIN"; isActive?: boolean }) {
    setBusy(id); setError("");
    try { const response = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); router.refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : en ? "Update failed." : "Aggiornamento non riuscito."); }
    finally { setBusy(""); }
  }
  return <div>{error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{users.map((user) => <div key={user.id} className="grid gap-4 border-b border-slate-100 p-4 last:border-0 md:grid-cols-[1fr_auto] md:items-center md:p-5"><div className="flex items-center gap-3"><span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${user.role === "ADMIN" ? "bg-[#fff0e9] text-coral" : "bg-[#e7f5f2] text-sea"}`}>{user.role === "ADMIN" ? <Shield size={18} /> : <UserRound size={18} />}</span><div className="min-w-0"><p className="truncate font-semibold text-ink">{user.name || (en ? "Unnamed user" : "Senza nome")} {user.id === currentUserId && <span className="text-[10px] font-medium text-muted">{en ? "(you)" : "(tu)"}</span>}</p><p className="truncate text-xs text-muted">{user.email}</p><p className="mt-1 text-[10px] text-muted">{user._count.events} {en ? "events · since" : "eventi · dal"} {new Date(user.createdAt).toLocaleDateString(en ? "en-GB" : "it-IT", { timeZone: "Europe/Rome" })}</p></div></div><div className="flex flex-wrap items-center gap-2">{user.id !== currentUserId && <><Button size="sm" variant="outline" onClick={() => update(user.id, { role: user.role === "ADMIN" ? "USER" : "ADMIN" })} disabled={busy === user.id}>{busy === user.id ? <LoaderCircle size={14} className="animate-spin" /> : <Shield size={14} />}{user.role === "ADMIN" ? (en ? "Remove admin" : "Rimuovi admin") : (en ? "Make admin" : "Rendi admin")}</Button><Button size="sm" variant={user.isActive ? "ghost" : "primary"} onClick={() => update(user.id, { isActive: !user.isActive })} disabled={busy === user.id}>{user.isActive ? <><UserRoundX size={14} /> {en ? "Deactivate" : "Disattiva"}</> : (en ? "Reactivate" : "Riattiva")}</Button></>}<span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${user.isActive ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-600"}`}>{user.isActive ? (en ? "Active" : "Attivo") : (en ? "Inactive" : "Disattivato")}</span></div></div>)}</div></div>;
}
