import { cache } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getPublicEvents } from "@/lib/public-events";

export type LocalListingType = "eventi" | "sagre";

export const getLocalListing = cache(async (slug: string, type: LocalListingType) => {
  const comune = await prisma.comune.findUnique({ where: { slug } });
  if (!comune) return null;
  const events = await getPublicEvents({
    comuneId: comune.id,
    cityName: comune.name,
    sagreOnly: type === "sagre",
    upcomingOnly: type === "sagre",
  });
  return { comune, events, type };
});

export function localListingMetadata(listing: Awaited<ReturnType<typeof getLocalListing>>, type: LocalListingType): Metadata {
  if (!listing) return { title: "Comune non trovato", robots: { index: false, follow: false } };
  const { comune, events } = listing;
  const phrase = type === "sagre" ? `Sagre, feste e tradizioni a ${comune.name}` : `Eventi a ${comune.name}`;
  const description = events.length
    ? `Scopri ${events.length} ${type === "sagre" ? "sagre e feste in programma" : "eventi pubblicati"} a ${comune.name}, in provincia di ${comune.provinceName}. Consulta date e luoghi su SardiniaFestival.`
    : `Consulta il calendario ${type === "sagre" ? "di sagre e feste" : "degli eventi"} a ${comune.name}, in provincia di ${comune.provinceName}.`;
  const canonical = type === "sagre" ? `/sagre-a/${comune.slug}` : `/citta/${comune.slug}`;
  return {
    title: phrase,
    description,
    alternates: { canonical },
    robots: events.length ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { title: phrase, description, url: canonical, type: "website" },
  };
}
