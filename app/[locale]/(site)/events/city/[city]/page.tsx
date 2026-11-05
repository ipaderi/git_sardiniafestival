import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPublicEvents } from "@/lib/public-events";
import { CityListing } from "@/components/site/city-listing";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string; city: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale, city } = await params; const comune = await prisma.comune.findUnique({ where: { slug: city } }); if (!comune) return { robots: { index: false } }; const events = await getPublicEvents({ comuneId: comune.id, cityName: comune.name, locale }); return { title: `${locale === "en" ? "Events in" : "Eventi a"} ${comune.name}`, alternates: { canonical: `/${locale}/events/city/${city}`, languages: { it: `/it/events/city/${city}`, en: `/en/events/city/${city}` } }, robots: { index: events.length > 0, follow: true } }; }
export default async function CityPage({ params }: Props) { const { locale, city } = await params; const comune = await prisma.comune.findUnique({ where: { slug: city } }); if (!comune) notFound(); const events = await getPublicEvents({ comuneId: comune.id, cityName: comune.name, locale }); return <CityListing locale={locale} city={comune} events={events} />; }
