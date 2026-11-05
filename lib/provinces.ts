/** Province codes and names follow the Sardinian municipality registry in the seed. */
export const PROVINCES = [
  { code: "CA", name: "Cagliari", slug: "cagliari", mapId: "Cagliari", color: "#72d5c2" },
  { code: "OT", name: "Gallura Nord-Est Sardegna", slug: "gallura-nord-est-sardegna", mapId: "Olbia-Tempio", color: "#56b8b2" },
  { code: "VS", name: "Medio Campidano", slug: "medio-campidano", mapId: "Medio_Campidano", color: "#5dbdab" },
  { code: "NU", name: "Nuoro", slug: "nuoro", mapId: "Nuoro", color: "#74c7bf" },
  { code: "OG", name: "Ogliastra", slug: "ogliastra", mapId: "Ogliastra", color: "#97ddcb" },
  { code: "OR", name: "Oristano", slug: "oristano", mapId: "Oristano", color: "#8dd7c2" },
  { code: "SS", name: "Sassari", slug: "sassari", mapId: "Sassari", color: "#a1e3d0" },
  { code: "SU", name: "Sulcis Iglesiente", slug: "sulcis-iglesiente", mapId: "Carbonia-Iglesias", color: "#4caca8" },
] as const;

export type Province = (typeof PROVINCES)[number];

export function getProvinceBySlug(slug: string): Province | undefined {
  return PROVINCES.find((province) => province.slug === slug);
}

export function getProvinceByCode(code: string): Province | undefined {
  return PROVINCES.find((province) => province.code === code);
}
