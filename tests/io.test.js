import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBackupPayload, parseBackup, SCHEMA } from "../js/io.js";

test("parseBackup rejects text that is not valid JSON", () => {
  assert.throws(() => parseBackup("{not json"), /not valid JSON/);
});

test("parseBackup rejects payloads that are not plain objects", () => {
  assert.throws(() => parseBackup("null"), /missing its constellation data/);
  assert.throws(() => parseBackup("[]"), /missing its constellation data/);
  assert.throws(() => parseBackup("42"), /missing its constellation data/);
});

test("parseBackup rejects payloads with a missing or mismatched schema", () => {
  assert.throws(() => parseBackup("{}"), /not a Constellation Planner backup/);
  assert.throws(
    () => parseBackup(JSON.stringify({ schema: "other/v1" })),
    /not a Constellation Planner backup/,
  );
});

test("parseBackup rejects malformed stars and links collections", () => {
  assert.throws(
    () => parseBackup(JSON.stringify({ schema: SCHEMA, stars: "oops" })),
    /malformed stars list/,
  );
  assert.throws(
    () => parseBackup(JSON.stringify({ schema: SCHEMA, links: 7 })),
    /malformed links list/,
  );
});

test("parseBackup returns the payload when the schema and collections are valid", () => {
  const payload = { schema: SCHEMA, stars: [{ title: "x" }], links: [] };
  assert.deepEqual(parseBackup(JSON.stringify(payload)), payload);
});

test("buildBackupPayload stamps the schema and export timestamp", () => {
  const state = { stars: [{ id: "a" }], links: [], mapTitle: "Plan" };
  const payload = buildBackupPayload(state, new Date("2026-05-21T09:30:00.000Z"));
  assert.equal(payload.schema, SCHEMA);
  assert.equal(payload.exportedAt, "2026-05-21T09:30:00.000Z");
  assert.equal(payload.mapTitle, "Plan");
  assert.deepEqual(payload.stars, [{ id: "a" }]);
});

test("buildBackupPayload round-trips through parseBackup", () => {
  const state = { stars: [], links: [], mapTitle: "Round trip" };
  const payload = buildBackupPayload(state, new Date("2026-05-21T00:00:00.000Z"));
  assert.deepEqual(parseBackup(JSON.stringify(payload)), payload);
});
