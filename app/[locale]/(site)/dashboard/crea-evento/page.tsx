import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { EventWizard } from "@/components/account/event-wizard";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/auth/login?callbackUrl=${encodeURIComponent(`/${locale}/dashboard/crea-evento`)}`);
  return <main className="min-h-[70vh] bg-[#f6f7f4] px-5 py-12"><div className="mx-auto max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.16em] text-sea">SardiniaFestival</p><h1 className="mt-2 font-display text-4xl font-semibold text-ink">{locale === "en" ? "Create an event" : "Crea un evento"}</h1><p className="mb-8 mt-2 text-sm text-muted">{locale === "en" ? "Share your event with the community, one step at a time." : "Condividi il tuo evento con la community, un passo alla volta."}</p><EventWizard locale={locale}/></div></main>;
}
