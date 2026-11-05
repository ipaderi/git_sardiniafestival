/** Select a JSON dictionary for the current locale. Italian is the fallback. */
export function dictionary<T>(locale: string | undefined, italian: T, english: T): T {
  return locale === "en" ? english : italian;
}

/** Interpolate named values without interpreting them as markup. */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] === undefined ? match : String(values[key]));
}
