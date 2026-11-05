import { dictionary } from "@/lib/dictionary";
import adminIt from "@/messages/it/admin.json";
import adminEn from "@/messages/en/admin.json";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { FeaturedCityManagement } from "@/components/admin/featured-city-management";
import { getLocalizedText } from "@/lib/localized-text";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; const t = dictionary(locale, adminIt, adminEn).citiesPage;
  if (!(await requireAdmin())) redirect(`/${locale}/dashboard`);
  const [saved, comuni] = await Promise.all([
    prisma.featuredCity.findMany({ select: { id: true, name: true, slug: true, province: true, descriptions: true, imageUrl: true, featured: true, sortOrder: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.comune.findMany({ select: { id: true, name: true, slug: true } }),
  ]);
  const bySlug = new Map(comuni.map((comune) => [comune.slug, comune.id]));
  const byName = new Map(comuni.map((comune) => [comune.name.toLocaleLowerCase("it-IT"), comune.id]));
  const cities = saved.map(({ descriptions, ...city }) => ({
    ...city,
    description: getLocalizedText(descriptions, "it"),
    descriptionEn: getLocalizedText(descriptions, "en", "") || null,
    comuneId: bySlug.get(city.slug) ?? byName.get(city.name.toLocaleLowerCase("it-IT")) ?? null,
  }));
  return <div className="mx-auto max-w-5xl"><h1 className="font-display text-3xl font-semibold">{t.featuredTowns}</h1><p className="mt-2 text-sm text-muted">{t.chooseTownsAndTheirAppearanceOnTheHomePage}</p><div className="mt-7"><FeaturedCityManagement initialCities={cities} locale={locale} /></div></div>;
}
