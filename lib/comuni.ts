import comuniSardegna from "../prisma/data/comuni-sardegna.json";

export type ComuneSeed = (typeof comuniSardegna)[number];
export { comuniSardegna };

export function slugifyComune(value: string) {
  return value.trim().replace(/(?:,\s*|\s+\()[a-z]{2}\)?$/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function comuneSeoPath(slug: string, type: "eventi" | "sagre") {
  return type === "eventi" ? `/citta/${slug}` : `/sagre-a/${slug}`;
}
