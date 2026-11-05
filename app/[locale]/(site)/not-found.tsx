import { NotFoundContent } from "@/components/site/not-found-content";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function NotFound() {
  return <NotFoundContent locale={await getRequestLocale()} />;
}
