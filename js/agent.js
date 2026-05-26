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
 * Returns stars that are blocked: not yet launched but with one or more
 * prerequisite stars that have not been launched yet. Each entry includes the
 * list of pending prerequisite IDs so dashboards can surface *why* a star
 * cannot start. Sorted by priority score descending so the most impactful
 * blocked work surfaces first.
 */
export function blockedActions(stars, links) {
  const byId = new Map(stars.map((s) => [s.id, s]));
  const prereqs = new Map(stars.map((s) => [s.id, []]));
  for (const { from, to } of links) {
    if (prereqs.has(to) && byId.has(from)) prereqs.get(to).push(from);
  }

  const blocked = [];
  for (const star of stars) {
    if (star.status === "launch") continue;
    const pending = prereqs
      .get(star.id)
      .filter((id) => byId.get(id).status !== "launch");
    if (pending.length) blocked.push({ star, pending });
  }
  return blocked.sort((a, b) => priorityScore(b.star) - priorityScore(a.star));
}

/**
 * Returns the longest dependency chain in the constellation — the "critical
 * path" that bounds the minimum number of sequential steps required to launch
 * every dependent star. Stars on this path are the highest-leverage targets:
 * slipping any of them slips the overall delivery date.
 *
 * Returns an array of star references in execution order (prerequisite first,
 * terminal last). Returns an empty array if no chain of two or more linked
 * stars exists. Stars participating in cycles are excluded from the search
 * via topological filtering, so the function always terminates.
 */
export function criticalPath(stars, links) {
  const byId = new Map(stars.map((s) => [s.id, s]));
  const successors = new Map(stars.map((s) => [s.id, []]));
  const inDegree = new Map(stars.map((s) => [s.id, 0]));

  for (const { from, to } of links) {
    if (byId.has(from) && byId.has(to)) {
      successors.get(from).push(to);
      inDegree.set(to, inDegree.get(to) + 1);
    }
  }

  // Kahn's topological order; cycle-participants never enter the queue.
  const order = [];
  const queue = [...inDegree.entries()].filter(([, d]) => d === 0).map(([id]) => id);
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const next of successors.get(id)) {
      const d = inDegree.get(next) - 1;
      inDegree.set(next, d);
      if (d === 0) queue.push(next);
    }
  }

  // Longest path via DP over the topological order.
  const longest = new Map(order.map((id) => [id, [id]]));
  for (const id of order) {
    const here = longest.get(id);
    for (const next of successors.get(id)) {
      if (!longest.has(next)) continue;
      const candidate = [...here, next];
      if (candidate.length > longest.get(next).length) longest.set(next, candidate);
    }
  }

  let best = [];
  for (const path of longest.values()) {
    if (path.length > best.length) best = path;
  }
  return best.length < 2 ? [] : best.map((id) => byId.get(id));
}

/**
 * Groups stars into parallel-executable waves using layered topological
 * sorting. Layer N contains every star whose prerequisites are all in layers
 * < N — i.e. the work that can be tackled concurrently once the previous
 * wave is complete. Within a layer, stars are ranked by priority score so
 * dashboards can highlight the most impactful work first.
 *
 * Stars participating in cycles are appended in a final "unresolved" layer
 * so the output always covers every star.
 */
export function executionLayers(stars, links) {
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
  const layers = [];
  let frontier = stars.filter((s) => inDegree.get(s.id) === 0);

  while (frontier.length) {
    layers.push([...frontier].sort(byScore));
    const next = [];
    for (const star of frontier) {
      for (const toId of successors.get(star.id)) {
        const deg = inDegree.get(toId) - 1;
        inDegree.set(toId, deg);
        if (deg === 0) next.push(byId.get(toId));
      }
    }
    frontier = next;
  }

  const placed = new Set(layers.flat().map((s) => s.id));
  const unresolved = stars.filter((s) => !placed.has(s.id));
  if (unresolved.length) layers.push(unresolved.sort(byScore));
  return layers;
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

/**
 * Assembles a structured execution report by combining health, audit, ordered
 * plan, and next actions into one snapshot. Designed for export, dashboards,
 * and autonomous evaluation loops that need a single consistent view of agent
 * state at a point in time.
 *
 * `issueCount` is a quick safety signal: non-zero means the plan has broken
 * links or cycles that should be resolved before autonomous execution proceeds.
 */
export function buildExecutionReport(stars, links, now = new Date()) {
  const audit = auditDependencyPlan(stars, links);
  return {
    generatedAt: now.toISOString(),
    health: constellationHealth(stars),
    issueCount: audit.brokenLinks.length + audit.cycles.length,
    audit,
    executionOrder: planExecutionOrder(stars, links).map((s, i) => ({
      step: i + 1,
      id: s.id,
      title: s.title,
      status: s.status,
    })),
    nextActions: nextActions(stars, links).map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
    })),
  };
}
