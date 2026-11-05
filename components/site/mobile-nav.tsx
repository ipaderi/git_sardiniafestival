"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { SignOutButton } from "@/components/site/auth-forms";

export function MobileNav({ isSignedIn, isAdmin }: { isSignedIn: boolean; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  return <div className="relative lg:hidden">
    <button type="button" aria-label={open ? "Chiudi menu" : "Apri menu"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)} className="focus-ring rounded-xl p-2 text-ink">{open ? <X size={21} /> : <Menu size={21} />}</button>
    {open && <nav id="mobile-navigation" aria-label="Navigazione mobile" className="absolute right-0 top-12 z-30 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"><Link onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-[#e7f5f2]" href="/eventi">Esplora eventi</Link><Link onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-[#e7f5f2]" href="/categorie">Categorie</Link><Link onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-[#e7f5f2]" href="/#territori">Territori</Link><Link onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-[#e7f5f2]" href="/segnala-evento">Pubblica un evento</Link>{isSignedIn ? <><Link onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-[#e7f5f2]" href={isAdmin ? "/admin" : "/dashboard"}>{isAdmin ? "Pannello admin" : "La mia area"}</Link><div className="px-2 py-1"><SignOutButton /></div></> : <Link onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-[#e7f5f2]" href="/accedi">Accedi</Link>}</nav>}
  </div>;
}
