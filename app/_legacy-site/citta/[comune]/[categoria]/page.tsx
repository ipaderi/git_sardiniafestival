import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalEventListing } from "@/components/site/local-event-listing";
import { findCategoryBySlug, slugifyCategory } from "@/lib/event-categories";
import { getLocalListing } from "@/lib/local-events";

type Props = { params: Promise<{ comune: string; categoria: string }> };
export const dynamic = "force-dynamic";

const getCityCategory = cache(async (comuneSlug: string, categorySlug: string) => {
  const category = findCategoryBySlug(categorySlug);
  if (!category) return null;
  const listing = await getLocalListing(comuneSlug, "eventi");
  if (!listing) return null;
  const events = listing.events.filter((event) => event.category.toLocaleLowerCase("it-IT") === category.name.toLocaleLowerCase("it-IT"));
  return { comune: listing.comune, category, events, allEvents: listing.events };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { comune, categoria } = await params;
  const page = await getCityCategory(comune, categoria);
  if (!page) return { title: "Pagina non trovata", robots: { index: false, follow: false } };
  const title = `${page.category.name} a ${page.comune.name}`;
  const description = `Scopri gli eventi di ${page.category.name} a ${page.comune.name}, in provincia di ${page.comune.provinceName}. Date, luoghi e archivio su SardiniaFestival.`;
  const canonical = `/citta/${page.comune.slug}/${slugifyCategory(page.category.name)}`;
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: page.events.length > 0, follow: true },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default async function CityCategoryPage({ params }: Props) {
  const { comune, categoria } = await params;
  const page = await getCityCategory(comune, categoria);
  if (!page) notFound();
  return <LocalEventListing type="eventi" {...page} />;
}
