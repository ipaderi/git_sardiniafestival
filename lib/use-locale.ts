"use client";

import { usePathname } from "next/navigation";
import { defaultLocale, isLocale } from "@/lib/i18n";

export function useLocale() {
  const locale = usePathname().split("/")[1];
  return isLocale(locale) ? locale : defaultLocale;
}
