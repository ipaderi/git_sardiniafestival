import { dictionary } from "@/lib/dictionary";
import it from "@/messages/it/account.json";
import enMessages from "@/messages/en/account.json";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { EventWizard } from "@/components/account/event-wizard";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; const t = dictionary(locale, it, enMessages).createPage; const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/auth/login?callbackUrl=${encodeURIComponent(`/${locale}/dashboard/crea-evento`)}`);
  return <main className="min-h-[70vh] bg-[#f6f7f4] px-5 py-12"><div className="mx-auto max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.16em] text-sea">SardiniaFestival</p><h1 className="mt-2 font-display text-4xl font-semibold text-ink">{t.createTitle}</h1><p className="mb-8 mt-2 text-sm text-muted">{t.createDescription}</p><EventWizard locale={locale}/></div></main>;
}
