/** How many active towns the home page shows. */
export const FEATURED_CITY_HOME_SLOTS = 3;

const SORT_STEP = 10;
const MAX_SORT_ORDER = 10000;

type Sortable = { id: string; name: string; featured: boolean; sortOrder: number };

/** Same ordering as the home page query: sortOrder first, then name. */
export function activeCities<T extends Sortable>(cities: T[]): T[] {
  return cities.filter((city) => city.featured).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "it"));
}

export function inactiveCities<T extends Sortable>(cities: T[]): T[] {
  return cities.filter((city) => !city.featured).sort((a, b) => a.name.localeCompare(b.name, "it"));
}

/** Sort value that places a town after every other saved town. */
export function nextSortOrder(cities: Sortable[]): number {
  return Math.min(MAX_SORT_ORDER, Math.max(-SORT_STEP, ...cities.map((city) => city.sortOrder)) + SORT_STEP);
}

function renumber<T extends Sortable>(ordered: T[]): T[] {
  return ordered.map((city, index) => ({ ...city, sortOrder: index * SORT_STEP }));
}

/** Move an active town one position. Returns null when it cannot move. */
export function moveCity<T extends Sortable>(cities: T[], id: string, direction: -1 | 1): T[] | null {
  const active = activeCities(cities);
  const from = active.findIndex((city) => city.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= active.length) return null;
  const moved = [...active];
  [moved[from], moved[to]] = [moved[to], moved[from]];
  return renumber([...moved, ...inactiveCities(cities)]);
}

/** Activate a town at the end of the active list, or take it out of that list. */
export function setCityActive<T extends Sortable>(cities: T[], id: string, featured: boolean): T[] {
  const updated = cities.map((city) => city.id === id ? { ...city, featured } : city);
  const active = activeCities(updated.filter((city) => city.id !== id));
  const target = updated.filter((city) => city.id === id);
  return renumber(featured
    ? [...active, ...target, ...inactiveCities(updated)]
    : [...active, ...inactiveCities(updated)]);
}
