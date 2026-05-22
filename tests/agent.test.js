import { test } from "node:test";
import assert from "node:assert/strict";
import { planExecutionOrder, nextActions, constellationHealth } from "../js/agent.js";
import { normalizeStar, normalizeLink } from "../js/model.js";

const s = (id, overrides = {}) =>
  normalizeStar({ id, title: id, impact: 5, confidence: 5, effort: 5, ...overrides });

const l = (from, to) => normalizeLink({ from, to });

// planExecutionOrder --------------------------------------------------------

test("planExecutionOrder places prerequisite stars before their dependents", () => {
  const hi = s("hi", { impact: 9 }); // higher priority but depends on lo
  const lo = s("lo", { impact: 1 });
  const order = planExecutionOrder([hi, lo], [l("lo", "hi")]);
  assert.equal(order[0].id, "lo");
  assert.equal(order[1].id, "hi");
});

test("planExecutionOrder preserves a multi-step dependency chain", () => {
  const stars = [s("a"), s("b"), s("c")];
  const order = planExecutionOrder(stars, [l("a", "b"), l("b", "c")]);
  assert.deepEqual(
    order.map((x) => x.id),
    ["a", "b", "c"],
  );
});

test("planExecutionOrder ranks independent stars by priority score descending", () => {
  const low = s("low", { impact: 1, confidence: 1, effort: 9 });
  const high = s("high", { impact: 9, confidence: 9, effort: 1 });
  const order = planExecutionOrder([low, high], []);
  assert.equal(order[0].id, "high");
});

test("planExecutionOrder returns all stars even when a cycle exists", () => {
  const stars = [s("a"), s("b")];
  const order = planExecutionOrder(stars, [l("a", "b"), l("b", "a")]);
  assert.equal(order.length, 2);
});

test("planExecutionOrder handles an empty input gracefully", () => {
  assert.deepEqual(planExecutionOrder([], []), []);
});

// nextActions ---------------------------------------------------------------

test("nextActions returns stars whose prerequisites are launched", () => {
  const a = s("a", { status: "launch" });
  const b = s("b", { status: "orbit" });
  const c = s("c", { status: "spark" }); // blocked: b not launched
  const actions = nextActions([a, b, c], [l("a", "b"), l("b", "c")]);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].id, "b");
});

test("nextActions excludes launched stars", () => {
  assert.equal(nextActions([s("a", { status: "launch" })], []).length, 0);
});

test("nextActions respects the limit parameter", () => {
  const stars = ["a", "b", "c", "d"].map((id) => s(id, { status: "spark" }));
  assert.equal(nextActions(stars, [], 2).length, 2);
});

test("nextActions ranks results by priority score descending", () => {
  const cheap = s("cheap", { impact: 1, effort: 9, status: "spark" });
  const pricey = s("pricey", { impact: 9, effort: 1, status: "spark" });
  const actions = nextActions([cheap, pricey], []);
  assert.equal(actions[0].id, "pricey");
});

// constellationHealth -------------------------------------------------------

test("constellationHealth counts stars by status and computes completion rate", () => {
  const stars = [
    s("a", { status: "launch" }),
    s("b", { status: "launch" }),
    s("c", { status: "spark" }),
    s("d", { status: "orbit" }),
  ];
  const h = constellationHealth(stars);
  assert.equal(h.byStatus.launch, 2);
  assert.equal(h.byStatus.spark, 1);
  assert.equal(h.total, 4);
  assert.equal(h.completionRate, 50);
});

test("constellationHealth returns safe zero values for an empty constellation", () => {
  const h = constellationHealth([]);
  assert.equal(h.total, 0);
  assert.equal(h.avgScore, 0);
  assert.equal(h.completionRate, 0);
});

test("constellationHealth computes average priority score", () => {
  const stars = [
    s("a", { impact: 10, confidence: 10, effort: 0 }), // score = 100
    s("b", { impact: 1, confidence: 1, effort: 1 }),   // score = 0.4
  ];
  const h = constellationHealth(stars);
  assert.ok(h.avgScore > 0, "average score should be positive");
});
