import assert from "node:assert/strict";
import test from "node:test";
import { dateBadge, formatDaySpan, occurrenceDetail, occurrenceStatus, occurrenceWhen, splitLongText } from "../lib/event-occurrences";

const rome = (value: string) => new Date(`${value}+02:00`); // CEST

test("00:00 start and end mean a whole-day occurrence closing the previous day", () => {
  const when = occurrenceWhen(rome("2026-09-18T00:00:00"), rome("2026-09-22T00:00:00"));
  assert.equal(when.allDay, true);
  assert.equal(when.startDay, "2026-09-18");
  assert.equal(when.endDay, "2026-09-21");
  assert.equal(when.startTime, null);
  assert.deepEqual(dateBadge(when, "it-IT"), { top: "18–21", bottom: "set" });
  assert.equal(formatDaySpan(when.startDay, when.endDay, "it-IT"), "18–21 set 2026");
});

test("a one-day occurrence stored up to the next midnight stays on one day", () => {
  const when = occurrenceWhen(new Date("2026-10-30T23:00:00Z"), new Date("2026-10-31T23:00:00Z")) // CET;
  assert.equal(when.startDay, when.endDay);
  assert.equal(dateBadge(when, "it-IT").top, "31");
  assert.equal(occurrenceDetail(when, "it-IT"), "sabato");
});

test("real times are kept, and a late-night end stays on the same evening", () => {
  const when = occurrenceWhen(rome("2026-07-14T20:30:00"), rome("2026-07-15T02:00:00"));
  assert.equal(when.allDay, false);
  assert.equal(when.endDay, "2026-07-14");
  assert.equal(occurrenceDetail(when, "it-IT"), "martedì · 20:30 – 02:00");
  const midnight = occurrenceWhen(rome("2026-07-14T21:00:00"), rome("2026-07-15T00:00:00"));
  assert.equal(midnight.endDay, "2026-07-14");
  assert.equal(midnight.endTime, "00:00");
});

test("a daytime end on a later day remains a multi-day occurrence", () => {
  const when = occurrenceWhen(rome("2026-09-28T10:00:00"), rome("2026-10-02T18:00:00"));
  assert.deepEqual(dateBadge(when, "it-IT"), { top: "28 set", bottom: "2 ott" });
  assert.equal(formatDaySpan(when.startDay, when.endDay, "it-IT"), "28 set – 2 ott 2026");
});

test("an end before or equal to the start is ignored", () => {
  const when = occurrenceWhen(rome("2026-08-01T21:00:00"), rome("2026-08-01T21:00:00"));
  assert.equal(when.endDay, when.startDay);
  assert.equal(when.endTime, null);
});

test("status follows Italian time and lasts to the end of the last day", () => {
  const when = occurrenceWhen(new Date("2026-10-31T23:00:00Z"), new Date("2026-11-30T23:00:00Z")) // 1–30 Nov, CET;
  assert.equal(occurrenceStatus(when, new Date("2026-10-31T22:59:00Z")), "upcoming");
  assert.equal(occurrenceStatus(when, new Date("2026-11-05T12:00:00Z")), "ongoing");
  assert.equal(occurrenceStatus(when, new Date("2026-11-30T22:30:00Z")), "ongoing");
  assert.equal(occurrenceStatus(when, new Date("2026-12-01T00:30:00Z")), "past");
});

test("splitLongText leaves short text alone and prefers paragraph breaks", () => {
  assert.deepEqual(splitLongText("Breve."), { intro: "Breve.", rest: "" });
  const long = `${"a".repeat(520)}\n${"b".repeat(600)}`;
  assert.deepEqual(splitLongText(long), { intro: "a".repeat(520), rest: "b".repeat(600) });
});
