export const eventCategories = [
  { name: "Musica", subtitle: "Concerti e festival", description: "Live, festival e suoni della Sardegna." },
  { name: "Tradizione", subtitle: "Sagre e feste", description: "Sagre, riti, feste di paese e tradizioni." },
  { name: "Teatro", subtitle: "Palchi e spettacoli", description: "Teatro, danza, prosa e spettacoli dal vivo." },
  { name: "Arte & cultura", subtitle: "Mostre e incontri", description: "Mostre, cinema, incontri e cultura." },
  { name: "Sport", subtitle: "Competizioni e outdoor", description: "Gare, attività e appuntamenti all'aria aperta." },
  { name: "Food & wine", subtitle: "Degustazioni e sagre", description: "Sapori, cantine e cucina dell'isola." },
  { name: "Natura", subtitle: "Escursioni e outdoor", description: "Esperienze nei paesaggi sardi." },
  { name: "Altro", subtitle: "Incontri e appuntamenti", description: "Altri appuntamenti da vivere in Sardegna." },
] as const;

export function slugifyCategory(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "e").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function findCategoryBySlug(slug: string) {
  return eventCategories.find((category) => slugifyCategory(category.name) === slug);
}

export function categoryName(name: string, locale: string) {
  if (locale !== "en") return name;
  const translations: Record<string, string> = { Musica: "Music", Tradizione: "Traditions", Teatro: "Theatre", "Arte & cultura": "Art & culture", Sport: "Sport", "Food & wine": "Food & wine", Natura: "Nature", Altro: "Other" };
  return translations[name] ?? name;
}
