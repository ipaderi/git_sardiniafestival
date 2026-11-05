import assert from "node:assert/strict";
import test from "node:test";
import { addDaysToWallClock, formatWallClockRange, toLocalDateTime } from "../lib/event-wall-clock";

test("toLocalDateTime converts instants to Italian wall-clock time across DST", () => {
  assert.equal(toLocalDateTime("2026-07-12T19:00:00.000Z"), "2026-07-12T21:00");
  assert.equal(toLocalDateTime("2026-01-12T20:00:00.000Z"), "2026-01-12T21:00");
  assert.equal(toLocalDateTime(null), "");
  assert.equal(toLocalDateTime("not a date"), "");
});

test("addDaysToWallClock keeps the time and rolls over months and years", () => {
  assert.equal(addDaysToWallClock("2026-07-31T21:00", 1), "2026-08-01T21:00");
  assert.equal(addDaysToWallClock("2026-12-31T00:30", 1), "2027-01-01T00:30");
  // The clock time must not shift across the night the clocks change in Italy.
  assert.equal(addDaysToWallClock("2026-03-28T02:30", 1), "2026-03-29T02:30");
  assert.equal(addDaysToWallClock("", 1), "");
});

test("formatWallClockRange distinguishes same-day and multi-day ranges", () => {
  const single = formatWallClockRange("2026-07-12T21:00", "", "it-IT");
  assert.match(single, /12 lug 2026, 21:00$/);
  assert.match(formatWallClockRange("2026-07-12T21:00", "2026-07-12T23:30", "it-IT"), /21:00 – 23:30$/);
  assert.match(formatWallClockRange("2026-07-12T21:00", "2026-07-13T01:00", "it-IT"), /21:00 → .*13 lug 2026, 01:00$/);
  assert.equal(formatWallClockRange("", "", "it-IT"), "");
});
