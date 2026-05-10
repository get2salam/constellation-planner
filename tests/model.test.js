import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, normalizeLink, normalizeStar, priorityScore } from "../js/model.js";

test("escapeHtml escapes the five HTML-significant characters", () => {
  assert.equal(
    escapeHtml("<a href=\"x\">&'</a>"),
    "&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;",
  );
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
});

test("priorityScore weights impact, confidence, and effort", () => {
  assert.equal(priorityScore({ impact: 10, confidence: 10, effort: 0 }), 100);
  assert.equal(priorityScore({ impact: 5, confidence: 4, effort: 5 }), 17);
});

test("normalizeStar clamps numeric fields and falls back to safe defaults", () => {
  const star = normalizeStar({ title: "  Aim high  ", impact: 99, effort: -3, kind: "ufo", x: 200 });
  assert.equal(star.title, "Aim high");
  assert.equal(star.impact, 10);
  assert.equal(star.effort, 1);
  assert.equal(star.kind, "bet");
  assert.equal(star.x, 92);
  assert.match(star.id, /^star_/);
});

test("normalizeLink trims labels and assigns a generated id", () => {
  const link = normalizeLink({ from: "a", to: "b", label: "  guides  " });
  assert.equal(link.label, "guides");
  assert.match(link.id, /^link_/);
});
