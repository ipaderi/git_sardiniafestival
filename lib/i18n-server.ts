import "server-only";
import { headers } from "next/headers";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";

/** Proxy sets this header from the URL, never from a client-provided value. */
export async function getRequestLocale(): Promise<Locale> {
  const locale = (await headers()).get("x-sf-locale");
  return isLocale(locale) ? locale : defaultLocale;
}
