import assert from "node:assert/strict";
import test from "node:test";
import { activeCities, inactiveCities, moveCity, nextSortOrder, setCityActive } from "../lib/featured-cities";

const city = (id: string, featured: boolean, sortOrder: number) => ({ id, name: id, featured, sortOrder });
const ids = (items: { id: string }[]) => items.map((item) => item.id);

test("active towns follow sortOrder and then name, like the home page", () => {
  const cities = [city("Nuoro", true, 0), city("Alghero", true, 0), city("Olbia", true, -1), city("Bosa", false, 0)];
  assert.deepEqual(ids(activeCities(cities)), ["Olbia", "Alghero", "Nuoro"]);
  assert.deepEqual(ids(inactiveCities(cities)), ["Bosa"]);
});

test("moving works even when every saved town has the same sortOrder", () => {
  const moved = moveCity([city("Alghero", true, 0), city("Bosa", true, 0), city("Cagliari", true, 0)], "Cagliari", -1);
  assert.ok(moved);
  assert.deepEqual(ids(activeCities(moved)), ["Alghero", "Cagliari", "Bosa"]);
  assert.equal(new Set(moved.map((item) => item.sortOrder)).size, 3);
});

test("towns cannot move past the ends of the active list", () => {
  const cities = [city("Alghero", true, 0), city("Bosa", true, 10), city("Cagliari", false, 20)];
  assert.equal(moveCity(cities, "Alghero", -1), null);
  assert.equal(moveCity(cities, "Bosa", 1), null);
  assert.equal(moveCity(cities, "Cagliari", -1), null);
});

test("an activated town joins the end of the active list", () => {
  const updated = setCityActive([city("Alghero", false, 0), city("Bosa", true, 10), city("Cagliari", true, 20)], "Alghero", true);
  assert.deepEqual(ids(activeCities(updated)), ["Bosa", "Cagliari", "Alghero"]);
});

test("a deactivated town leaves the active list and keeps the others in order", () => {
  const updated = setCityActive([city("Alghero", true, 0), city("Bosa", true, 10), city("Cagliari", true, 20)], "Bosa", false);
  assert.deepEqual(ids(activeCities(updated)), ["Alghero", "Cagliari"]);
  assert.deepEqual(ids(inactiveCities(updated)), ["Bosa"]);
});

test("new towns are placed after every saved town", () => {
  assert.equal(nextSortOrder([]), 0);
  assert.equal(nextSortOrder([city("Alghero", true, 40), city("Bosa", false, 70)]), 80);
  assert.equal(nextSortOrder([city("Alghero", true, 10000)]), 10000);
});
