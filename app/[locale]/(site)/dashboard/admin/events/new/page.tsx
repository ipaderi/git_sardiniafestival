import { dictionary } from "@/lib/dictionary";
import adminIt from "@/messages/it/admin.json";
import adminEn from "@/messages/en/admin.json";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { EventForm } from "@/components/admin/event-form";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = dictionary(locale, adminIt, adminEn);
  return <div className="mx-auto max-w-4xl">
    <nav aria-label={t.eventDetail.breadcrumb} className="flex items-center gap-1 text-xs font-semibold text-muted"><Link className="focus-ring rounded hover:text-ink" href={`/${locale}/dashboard/admin/events`}>{t.layout.events}</Link><ChevronRight size={12} aria-hidden /><span aria-current="page">{t.events.newEvent}</span></nav>
    <h1 className="mt-2 font-display text-3xl font-semibold">{t.events.newEvent}</h1>
    <div className="mt-6"><EventForm locale={locale} /></div>
  </div>;
}
