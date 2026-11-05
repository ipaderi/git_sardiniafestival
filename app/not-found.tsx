import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { NotFoundContent } from "@/components/site/not-found-content";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function NotFound() {
  const locale = await getRequestLocale();
  return <><Header locale={locale} /><NotFoundContent locale={locale} /><Footer locale={locale} /></>;
}
