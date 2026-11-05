import { dictionary } from "@/lib/dictionary";
import it from "@/messages/it/navigation.json";
import en from "@/messages/en/navigation.json";
import Link from "next/link";
import { Plus } from "lucide-react";
import { MobileNav } from "@/components/site/mobile-nav";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { SignOutButton } from "@/components/site/auth-forms";
import { getCurrentUser } from "@/lib/authz";
import { defaultLocale, localizedPath, type Locale } from "@/lib/i18n";

export async function Header({ locale = defaultLocale }: { locale?: Locale }) {
  const user = await getCurrentUser();
  const t = dictionary(locale, it, en);
  const path = (href: string) => localizedPath(locale, href);
  const accountHref = path(user?.role === "ADMIN" ? "/dashboard/admin" : "/dashboard");
  return (
    <header className="relative z-20 border-b border-slate-100 bg-white">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href={path("/")} aria-label={t.homeAria} className="focus-ring rounded-sm">
          <img src="/brand/logo-sardiniafestival.svg" alt="SardiniaFestival" className="h-auto w-[210px] max-w-[48vw]" />
        </Link>
        <nav aria-label={t.mainNavigation} className="hidden items-center gap-6 lg:flex">
          <Link className="text-sm font-semibold text-ink-soft hover:text-sea" href={path("/events")}>{t.exploreEvents}</Link>
          <Link className="text-sm font-semibold text-ink-soft hover:text-sea" href={path("/events/category")}>{t.categories}</Link>
          <Link className="text-sm font-semibold text-ink-soft hover:text-sea" href={path("/events/province")}>{t.places}</Link>
          <Link className="text-sm font-semibold text-ink-soft hover:text-sea" href={path("/dashboard/crea-evento")}>{t.organisers}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher locale={locale} />
          {user ? <>
            <Link href={accountHref} className="hidden rounded-lg px-3 py-2 text-right text-sm font-semibold text-ink hover:bg-[#e7f5f2] sm:inline-flex sm:flex-col">
              <span>{user.role === "ADMIN" ? t.adminPanel : t.account}</span>
              <span className="max-w-36 truncate text-[10px] font-medium text-muted">{user.name || user.email}</span>
            </Link>
            <span className="hidden sm:inline-flex"><SignOutButton /></span>
          </> : <Link href={path("/auth/login")} className="hidden px-3 py-2 text-sm font-semibold text-ink hover:text-sea sm:inline-flex">{t.signIn}</Link>}
          <Link href={path("/dashboard/crea-evento")} className="focus-ring hidden h-9 items-center justify-center gap-2 rounded-xl bg-sea-bright px-3.5 text-xs font-semibold text-ink transition-colors hover:bg-[#4bd0c2] sm:inline-flex"><Plus size={15} /> {t.addEvent}</Link>
          <MobileNav locale={locale} isSignedIn={Boolean(user)} isAdmin={user?.role === "ADMIN"} />
        </div>
      </div>
    </header>
  );
}
