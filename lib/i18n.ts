export const locales = ["it", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "it";
export const localeCookie = "NEXT_LOCALE";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "it" || value === "en";
}

/** Prefix an internal path, retaining its query string and fragment. */
export function localizedPath(locale: Locale, path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
}

/** Choose the most preferred supported language, respecting q=0 and browser ordering. */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  const preferences = (acceptLanguage ?? "").split(",").map((entry, index) => {
    const [tag, ...parameters] = entry.trim().toLowerCase().split(";");
    const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith("q="));
    const quality = qualityParameter ? Number(qualityParameter.trim().slice(2)) : 1;
    return { tag: tag.split("-")[0], quality: Number.isFinite(quality) && quality >= 0 && quality <= 1 ? quality : 0, index };
  }).filter((entry) => entry.quality > 0).sort((a, b) => b.quality - a.quality || a.index - b.index);
  return (preferences.find((entry) => isLocale(entry.tag))?.tag as Locale | undefined) ?? defaultLocale;
}
