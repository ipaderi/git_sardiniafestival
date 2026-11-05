"use client";

import { usePathname, useRouter } from "next/navigation";
import { isLocale, localeCookie, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();

  function changeLanguage(nextLocale: string) {
    if (!isLocale(nextLocale) || nextLocale === locale) return;
    document.cookie = `${localeCookie}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    const segments = pathname.split("/");
    if (isLocale(segments[1])) segments[1] = nextLocale;
    else segments.splice(1, 0, nextLocale);
    router.push(`${segments.join("/") || "/"}${location.search}${location.hash}`);
  }

  return <label className="inline-flex items-center gap-1 text-sm font-semibold">
    <span className="sr-only">{locale === "it" ? "Lingua" : "Language"}</span>
    <select value={locale} onChange={(event) => changeLanguage(event.target.value)} className="focus-ring cursor-pointer rounded-md bg-transparent px-1 py-2" aria-label={locale === "it" ? "Seleziona lingua" : "Select language"}>
      <option value="it">IT</option>
      <option value="en">EN</option>
    </select>
  </label>;
}
