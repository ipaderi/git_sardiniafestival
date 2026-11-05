export type LocalizedTextMap = Record<string, string>;

export function toLocalizedTextMap(value: unknown): LocalizedTextMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

export function getLocalizedText(value: unknown, locale: string, fallbackLocale = "it"): string {
  const translations = toLocalizedTextMap(value);
  const preferred = translations[locale]?.trim();
  if (preferred) return translations[locale];

  const fallback = translations[fallbackLocale]?.trim();
  return fallback ? translations[fallbackLocale] : "";
}

export function getLocalizedDescription(base: string | null | undefined, translations: unknown, locale: string): string {
  return getLocalizedText({ ...toLocalizedTextMap(translations), it: base ?? "" }, locale);
}

export function setLocalizedText(value: unknown, locale: string, text: string | null | undefined): Record<string, string> {
  const translations = toLocalizedTextMap(value);
  if (text?.trim()) translations[locale] = text;
  else delete translations[locale];
  return translations;
}
