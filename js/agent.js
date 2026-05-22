import { priorityScore, STATUSES } from "./model.js";

/**
 * Returns stars in dependency-aware execution order using Kahn's algorithm.
 * A link "from → to" means `from` must complete before `to` can start.
 * Independent stars are ranked by priority score (highest first).
 * Stars involved in cycles are appended after the main order, also by score.
 */
export function planExecutionOrder(stars, links) {
  const byId = new Map(stars.map((s) => [s.id, s]));
  const inDegree = new Map(stars.map((s) => [s.id, 0]));
  const successors = new Map(stars.map((s) => [s.id, []]));

  for (const { from, to } of links) {
    if (byId.has(from) && byId.has(to)) {
      successors.get(from).push(to);
      inDegree.set(to, inDegree.get(to) + 1);
    }
  }

  const byScore = (a, b) => priorityScore(b) - priorityScore(a);
  const queue = stars.filter((s) => inDegree.get(s.id) === 0).sort(byScore);
  const result = [];

  while (queue.length) {
    const star = queue.shift();
    result.push(star);
    for (const toId of successors.get(star.id)) {
      const deg = inDegree.get(toId) - 1;
      inDegree.set(toId, deg);
      if (deg === 0) {
        const next = byId.get(toId);
        const idx = queue.findIndex((s) => priorityScore(s) < priorityScore(next));
        queue.splice(idx === -1 ? queue.length : idx, 0, next);
      }
    }
  }

  // Cycle participants: append by priority so the output is always complete.
  const seen = new Set(result.map((s) => s.id));
  return [...result, ...stars.filter((s) => !seen.has(s.id)).sort(byScore)];
}

/**
 * Returns up to `limit` stars that are immediately actionable: not yet
 * launched and every prerequisite (all "from" neighbors) is already launched.
 * Sorted by priority score descending so the most impactful work surfaces first.
 */
export function nextActions(stars, links, limit = 3) {
  const launched = new Set(
    stars.filter((s) => s.status === "launch").map((s) => s.id),
  );
  const prereqs = new Map(stars.map((s) => [s.id, []]));
  for (const { from, to } of links) {
    if (prereqs.has(to)) prereqs.get(to).push(from);
  }

  return stars
    .filter(
      (s) =>
        s.status !== "launch" &&
        prereqs.get(s.id).every((id) => launched.has(id)),
    )
    .sort((a, b) => priorityScore(b) - priorityScore(a))
    .slice(0, limit);
}

/**
 * Returns a health snapshot of the constellation suitable for agent status
 * checks, dashboards, or automated evaluation loops.
 */
export function constellationHealth(stars) {
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const s of stars) byStatus[s.status]++;

  const total = stars.length;
  const scores = stars.map(priorityScore);
  const avgScore =
    total === 0
      ? 0
      : Math.round((scores.reduce((a, b) => a + b, 0) / total) * 10) / 10;
  const completionRate =
    total === 0 ? 0 : Math.round((byStatus.launch / total) * 100);

  return { byStatus, avgScore, completionRate, total };
}

/**
 * Audits a dependency plan for safety issues: broken links, circular
 * dependencies, and isolated components. Returns an object with issues
 * categorized by severity for orchestration auditing.
 */
export function auditDependencyPlan(stars, links) {
  const starIds = new Set(stars.map((s) => s.id));
  const issues = {
    brokenLinks: [],
    cycles: [],
    isolated: [],
  };

  // Check for broken links (referencing non-existent stars).
  for (const { from, to } of links) {
    if (!starIds.has(from)) issues.brokenLinks.push(`link from nonexistent star "${from}"`);
    if (!starIds.has(to)) issues.brokenLinks.push(`link to nonexistent star "${to}"`);
  }

  // Detect cycles using DFS.
  const adj = new Map(stars.map((s) => [s.id, []]));
  for (const { from, to } of links) {
    if (starIds.has(from) && starIds.has(to)) {
      adj.get(from).push(to);
    }
  }

  const visited = new Set();
  const recStack = new Set();

  const dfs = (id) => {
    visited.add(id);
    recStack.add(id);
    for (const neighbor of adj.get(id)) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recStack.has(neighbor)) {
        issues.cycles.push(`cycle detected: ${id} → ${neighbor}`);
      }
    }
    recStack.delete(id);
  };

  for (const star of stars) {
    if (!visited.has(star.id)) dfs(star.id);
  }

  // Find isolated stars (no incoming or outgoing links).
  const linked = new Set();
  for (const { from, to } of links) {
    if (starIds.has(from)) linked.add(from);
    if (starIds.has(to)) linked.add(to);
  }
  for (const star of stars) {
    if (!linked.has(star.id)) issues.isolated.push(star.id);
  }

  return issues;
}
