import { dictionary, interpolate } from "@/lib/dictionary";
import publicIt from "@/messages/it/public.json";
import publicEn from "@/messages/en/public.json";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPublicEvents } from "@/lib/public-events";
import { categoryName, findCategoryBySlug } from "@/lib/event-categories";
import { CityListing } from "@/components/site/city-listing";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string; city: string; category: string }> };
async function data(city: string, category: string, locale: string) { const [comune, kind] = await Promise.all([prisma.comune.findUnique({ where: { slug: city } }), Promise.resolve(findCategoryBySlug(category))]); if (!comune || !kind) return null; const allEvents = await getPublicEvents({ comuneId: comune.id, cityName: comune.name, locale }); return { comune, kind, allEvents, events: allEvents.filter((event) => event.category.toLowerCase() === kind.name.toLowerCase()) }; }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale, city, category } = await params; const page = await data(city, category, locale); if (!page) return { robots: { index: false } }; return { title: interpolate(dictionary(locale, publicIt, publicEn).categoryInCity, { category: categoryName(page.kind.name, locale), city: page.comune.name }), alternates: { canonical: `/${locale}/events/city/${city}/${category}`, languages: { it: `/it/events/city/${city}/${category}`, en: `/en/events/city/${city}/${category}` } }, robots: { index: page.events.length > 0, follow: true } }; }
export default async function CityCategoryPage({ params }: Props) { const { locale, city, category } = await params; const page = await data(city, category, locale); if (!page) notFound(); return <CityListing locale={locale} city={page.comune} selectedCategory={page.kind.name} allEvents={page.allEvents} events={page.events} />; }
