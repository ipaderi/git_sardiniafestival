import it from "@/messages/it/categories.json";
import en from "@/messages/en/categories.json";
import { dictionary } from "@/lib/dictionary";

type CategoryDetails = { label: string; subtitle: string; description: string };

// Italian keys are the existing canonical database values and define the URL slugs.
export const eventCategories = Object.entries(it).map(([name, details]) => ({ name, ...details }));

export function slugifyCategory(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "e").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function findCategoryBySlug(slug: string) {
  return eventCategories.find((category) => slugifyCategory(category.name) === slug);
}

export function categoryDetails(name: string, locale: string): CategoryDetails {
  const values: Record<string, CategoryDetails> = dictionary(locale, it, en);
  return values[name] ?? { label: name, subtitle: "", description: "" };
}

export function categoryName(name: string, locale: string) {
  return categoryDetails(name, locale).label;
}
