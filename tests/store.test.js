import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hydrate,
  selectRankedStars,
  selectStats,
  selectVisibleStars,
} from "../js/store.js";

function makeState(overrides = {}) {
  return hydrate({
    stars: [
      { id: "a", title: "Ship onboarding", kind: "mission", status: "orbit", impact: 9, confidence: 8, effort: 4, note: "north star" },
      { id: "b", title: "Trial pricing", kind: "experiment", status: "spark", impact: 6, confidence: 5, effort: 3 },
      { id: "c", title: "Renew vendor", kind: "ops", status: "launch", impact: 4, confidence: 7, effort: 2 },
    ],
    ui: { kindFilter: "all", statusFilter: "all", search: "" },
    ...overrides,
  });
}

test("hydrate fills defaults and normalizes nested collections", () => {
  const state = hydrate({ stars: [{ title: "x" }], links: [{ from: "a", to: "b" }] });
  assert.equal(state.mapTitle, "My strategy constellation");
  assert.equal(state.ui.view, "sky");
  assert.match(state.stars[0].id, /^star_/);
  assert.equal(state.stars[0].kind, "bet");
  assert.equal(state.links[0].label, "supports");
});

test("hydrate coerces non-array stars and links to empty arrays", () => {
  const state = hydrate({ stars: "nope", links: null });
  assert.deepEqual(state.stars, []);
  assert.deepEqual(state.links, []);
});

test("selectVisibleStars applies kind, status, and search filters together", () => {
  const state = makeState({ ui: { kindFilter: "mission", statusFilter: "all", search: "ship" } });
  const visible = selectVisibleStars(state);
  assert.deepEqual(visible.map((s) => s.id), ["a"]);
});

test("selectRankedStars orders by priority score, then impact", () => {
  const ranked = selectRankedStars(makeState());
  assert.deepEqual(ranked.map((s) => s.id), ["a", "b", "c"]);
});

test("selectStats reports counts and the top priority title", () => {
  const stats = selectStats(makeState());
  assert.equal(stats.stars, 3);
  assert.equal(stats.activeBets, 0);
  assert.equal(stats.topPriority, "Ship onboarding");
});
