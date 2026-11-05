import assert from "node:assert/strict";
import test from "node:test";
import { contentSitemapEntries, type SitemapEvent } from "../lib/sitemap-entries";

const base = "https://sardiniafestival.com";
const now = new Date("2026-07-01T12:00:00Z");
const future = new Date("2026-08-01T12:00:00Z");
const past = new Date("2026-06-01T12:00:00Z");
const modified = new Date("2026-06-15T12:00:00Z");
const comuni = [{ name: "Cagliari", slug: "cagliari" }, { name: "Nuoro", slug: "nuoro" }, { name: "Sassari", slug: "sassari" }];

function event(overrides: Partial<SitemapEvent>): SitemapEvent {
  return {
    slug: "concerto", updatedAt: modified, startsAt: future, endsAt: null,
    eventType: "SINGLE_DAY", category: "Musica", subcategory: null,
    location: "Cagliari", comuneId: "ca", comune: { slug: "cagliari" }, dates: [],
    ...overrides,
  };
}

function occurrence(city: string, slug: string, startsAt: Date, endsAt: Date | null = null) {
  return { city, comuneId: slug, comune: { slug }, startsAt, endsAt };
}

test("sitemap includes canonical categories and cities with past or future events", () => {
  const entries = contentSitemapEntries(base, now, [
    event({}),
    event({ slug: "sagra", category: "Tradizione", location: "NUORO", comuneId: null, comune: null, startsAt: past, dates: [occurrence("Nuoro", "nuoro", future)] }),
    event({ slug: "mostra-passata", category: "Arte & cultura", location: "Sassari", comune: { slug: "sassari" }, startsAt: past }),
  ], comuni);
  const urls = entries.map((entry) => entry.url);

  assert.equal(new Set(urls).size, urls.length);
  for (const path of ["/eventi/concerto", "/categorie/musica", "/categorie/tradizione", "/categorie/arte-e-cultura", "/citta/cagliari", "/citta/nuoro", "/citta/sassari", "/sagre-a/nuoro"]) {
    assert.ok(urls.includes(`${base}${path}`), path);
  }
  assert.ok(!urls.includes(`${base}/sagre-a/cagliari`));
  assert.ok(!urls.some((url) => url.includes("/eventi-a/")));
});

test("multi-location uses each local date and online events never add cities", () => {
  const entries = contentSitemapEntries(base, now, [event({
    slug: "festa-itinerante", eventType: "MULTI_LOCATION", category: "Tradizione", startsAt: past,
    dates: [occurrence("Cagliari", "cagliari", past), occurrence("Nuoro", "nuoro", future), occurrence("Sassari", "sassari", past, future)],
  })], comuni);
  const urls = entries.map((entry) => entry.url);
  for (const path of ["/citta/cagliari", "/citta/nuoro", "/citta/sassari", "/sagre-a/nuoro", "/sagre-a/sassari"]) assert.ok(urls.includes(`${base}${path}`), path);
  assert.ok(!urls.includes(`${base}/sagre-a/cagliari`));
  const otherEntries = contentSitemapEntries(base, now, [
    event({ slug: "online", eventType: "ONLINE", category: "Tradizione", dates: [occurrence("Cagliari", "cagliari", future)] }),
    event({ slug: "luogo-ignoto", comuneId: null, comune: null, location: "Luogo sconosciuto" }),
  ], comuni);
  const otherUrls = otherEntries.map((entry) => entry.url);
  assert.ok(otherUrls.includes(`${base}/eventi/online`));
  assert.ok(!otherUrls.some((url) => url.includes("/citta/") || url.includes("/sagre-a/")));
});
