import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalEventListing } from "@/components/site/local-event-listing";
import { getLocalListing, localListingMetadata } from "@/lib/local-events";

type Props = { params: Promise<{ comune: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { comune } = await params;
  return localListingMetadata(await getLocalListing(comune, "sagre"), "sagre");
}

export default async function SagreInComunePage({ params }: Props) {
  const { comune: slug } = await params;
  const listing = await getLocalListing(slug, "sagre");
  if (!listing) notFound();
  return <LocalEventListing type="sagre" comune={listing.comune} events={listing.events} />;
}
