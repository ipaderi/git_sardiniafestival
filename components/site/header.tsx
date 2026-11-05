import Link from "next/link";
import { Plus } from "lucide-react";
import { MobileNav } from "@/components/site/mobile-nav";
import { SignOutButton } from "@/components/site/auth-forms";
import { getCurrentUser } from "@/lib/authz";

export async function Header() {
  const user = await getCurrentUser();
  const accountHref = user?.role === "ADMIN" ? "/admin" : "/dashboard";
  return (
    <header className="relative z-20 border-b border-slate-100 bg-white">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" aria-label="SardiniaFestival, homepage" className="focus-ring rounded-sm">
          <img src="/brand/logo-sardiniafestival.svg" alt="SardiniaFestival" className="h-auto w-[210px] max-w-[48vw]" />
        </Link>
        <nav aria-label="Navigazione principale" className="hidden items-center gap-6 lg:flex">
          <Link className="text-sm font-semibold text-ink-soft hover:text-sea" href="/eventi">Esplora eventi</Link>
          <Link className="text-sm font-semibold text-ink-soft hover:text-sea" href="/categorie">Categorie</Link>
          <Link className="text-sm font-semibold text-ink-soft hover:text-sea" href="/#territori">Territori</Link>
          <Link className="text-sm font-semibold text-ink-soft hover:text-sea" href="/segnala-evento">Per gli organizzatori</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? <>
            <Link href={accountHref} className="hidden rounded-lg px-3 py-2 text-right text-sm font-semibold text-ink hover:bg-[#e7f5f2] sm:inline-flex sm:flex-col">
              <span>{user.role === "ADMIN" ? "Pannello admin" : "La mia area"}</span>
              <span className="max-w-36 truncate text-[10px] font-medium text-muted">{user.name || user.email}</span>
            </Link>
            <span className="hidden sm:inline-flex"><SignOutButton /></span>
          </> : <Link href="/accedi" className="hidden px-3 py-2 text-sm font-semibold text-ink hover:text-sea sm:inline-flex">Accedi</Link>}
          <Link href="/segnala-evento" className="focus-ring hidden h-9 items-center justify-center gap-2 rounded-xl bg-sea-bright px-3.5 text-xs font-semibold text-ink transition-colors hover:bg-[#4bd0c2] sm:inline-flex"><Plus size={15} /> Pubblica un evento</Link>
          <MobileNav isSignedIn={Boolean(user)} isAdmin={user?.role === "ADMIN"} />
        </div>
      </div>
    </header>
  );
}
