export const STORAGE_KEY = "constellation-planner:v1";

export const KINDS = ["mission", "bet", "experiment", "ops"];
export const STATUSES = ["spark", "orbit", "cluster", "launch"];

export const KIND_META = {
  mission: { label: "Mission", hue: "var(--mission)" },
  bet: { label: "Bet", hue: "var(--bet)" },
  experiment: { label: "Experiment", hue: "var(--experiment)" },
  ops: { label: "Ops", hue: "var(--ops)" },
};

export const STATUS_META = {
  spark: { label: "Spark", hue: "var(--spark)" },
  orbit: { label: "Orbit", hue: "var(--orbit)" },
  cluster: { label: "Cluster", hue: "var(--cluster)" },
  launch: { label: "Launch", hue: "var(--launch)" },
};

export function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function priorityScore(star) {
  return Math.round((star.impact * star.confidence - star.effort * 0.6) * 10) / 10;
}

export function normalizeStar(input = {}) {
  const kind = KINDS.includes(input.kind) ? input.kind : "bet";
  const status = STATUSES.includes(input.status) ? input.status : "spark";
  return {
    id: input.id || uid("star"),
    title: (input.title || "Untitled star").trim(),
    note: input.note || "",
    kind,
    status,
    impact: Math.max(1, Math.min(10, Number(input.impact) || 5)),
    confidence: Math.max(1, Math.min(10, Number(input.confidence) || 5)),
    effort: Math.max(1, Math.min(10, Number(input.effort) || 5)),
    x: Math.max(8, Math.min(92, Number(input.x) || 50)),
    y: Math.max(10, Math.min(88, Number(input.y) || 50)),
  };
}

export function normalizeLink(input = {}) {
  return {
    id: input.id || uid("link"),
    from: input.from || "",
    to: input.to || "",
    label: (input.label || "supports").trim(),
  };
}

export function defaultState() {
  return {
    mapTitle: "My strategy constellation",
    mapNote: "Track the bets, missions, and experiments that pull your work forward.",
    stars: [],
    links: [],
    ui: {
      selectedId: null,
      kindFilter: "all",
      statusFilter: "all",
      search: "",
      view: "sky",
    },
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}
