"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { SignOutButton } from "@/components/site/auth-forms";
import { localizedPath, type Locale } from "@/lib/i18n";

export function MobileNav({ isSignedIn, isAdmin, locale }: { isSignedIn: boolean; isAdmin: boolean; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const en = locale === "en";
  const linkClass = "block rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-[#e7f5f2]";
  const links = [
    ["/events", en ? "Explore events" : "Esplora eventi"],
    ["/events/category", en ? "Categories" : "Categorie"],
    ["/events/province", en ? "Places" : "Territori"],
    ["/dashboard/crea-evento", en ? "Add an event" : "Pubblica un evento"],
  ];
  return <div className="relative lg:hidden">
    <button type="button" aria-label={open ? (en ? "Close menu" : "Chiudi menu") : (en ? "Open menu" : "Apri menu")} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)} className="focus-ring rounded-xl p-2 text-ink">{open ? <X size={21} /> : <Menu size={21} />}</button>
    {open && <nav id="mobile-navigation" aria-label={en ? "Mobile navigation" : "Navigazione mobile"} className="absolute right-0 top-12 z-30 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
      {links.map(([href, label]) => <Link key={href} onClick={() => setOpen(false)} className={linkClass} href={localizedPath(locale, href)}>{label}</Link>)}
      {isSignedIn ? <><Link onClick={() => setOpen(false)} className={linkClass} href={localizedPath(locale, isAdmin ? "/dashboard/admin" : "/dashboard")}>{isAdmin ? (en ? "Admin panel" : "Pannello admin") : (en ? "My account" : "La mia area")}</Link><div className="px-2 py-1"><SignOutButton /></div></> : <Link onClick={() => setOpen(false)} className={linkClass} href={localizedPath(locale, "/auth/login")}>{en ? "Sign in" : "Accedi"}</Link>}
    </nav>}
  </div>;
}
