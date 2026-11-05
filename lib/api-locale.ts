import { dictionary } from "@/lib/dictionary";
import it from "@/messages/it/api-events.json";
import en from "@/messages/en/api-events.json";

/** Explicit API language; unsupported values fall back to Italian. */
export function requestLocale(request: Request): "it" | "en" {
  const locale = request.headers.get("x-sf-locale") ?? new URL(request.url).searchParams.get("locale");
  return locale === "en" ? "en" : "it";
}

export function apiEventMessages(request: Request) {
  return dictionary(requestLocale(request), it, en);
}
