import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { FeaturedCityManagement } from "@/components/admin/featured-city-management";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(await requireAdmin())) redirect(`/${locale}/dashboard`);
  const [saved, comuni] = await Promise.all([
    prisma.featuredCity.findMany({ select: { id: true, name: true, slug: true, province: true, description: true, descriptionEn: true, imageUrl: true, featured: true, sortOrder: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.comune.findMany({ select: { id: true, name: true, slug: true } }),
  ]);
  const bySlug = new Map(comuni.map((comune) => [comune.slug, comune.id]));
  const byName = new Map(comuni.map((comune) => [comune.name.toLocaleLowerCase("it-IT"), comune.id]));
  const cities = saved.map((city) => ({ ...city, comuneId: bySlug.get(city.slug) ?? byName.get(city.name.toLocaleLowerCase("it-IT")) ?? null }));
  return <div className="mx-auto max-w-5xl"><h1 className="font-display text-3xl font-semibold">{locale === "en" ? "Featured towns" : "Città in evidenza"}</h1><p className="mt-2 text-sm text-muted">{locale === "en" ? "Choose towns and their appearance on the home page." : "Scegli i comuni e il loro aspetto nella pagina iniziale."}</p><div className="mt-7"><FeaturedCityManagement initialCities={cities} locale={locale} /></div></div>;
}
