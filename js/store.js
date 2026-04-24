import {
  defaultState,
  normalizeLink,
  normalizeStar,
  priorityScore,
  STORAGE_KEY,
} from "./model.js";

let state = defaultState();
const listeners = new Set();

function emit() {
  for (const listener of listeners) listener(state);
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function commit(next) {
  state = {
    ...next,
    meta: {
      ...next.meta,
      updatedAt: new Date().toISOString(),
    },
  };
  persist();
  emit();
}

export function hydrate(input = {}) {
  return {
    ...defaultState(),
    ...input,
    stars: Array.isArray(input.stars) ? input.stars.map(normalizeStar) : [],
    links: Array.isArray(input.links) ? input.links.map(normalizeLink) : [],
    ui: {
      ...defaultState().ui,
      ...(input.ui || {}),
    },
    meta: {
      ...defaultState().meta,
      ...(input.meta || {}),
    },
  };
}

export function initStore({ seed } = {}) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state = raw ? hydrate(JSON.parse(raw)) : hydrate(typeof seed === "function" ? seed() : defaultState());
  } catch {
    state = hydrate(typeof seed === "function" ? seed() : defaultState());
  }
  emit();
}

export function subscribe(listener) {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function getState() {
  return state;
}

export const actions = {
  replaceAll(nextState) {
    commit(hydrate(nextState));
  },
  setMapMeta(patch) {
    commit({ ...state, ...patch });
  },
  setUI(patch) {
    commit({ ...state, ui: { ...state.ui, ...patch } });
  },
  addStar(input = {}) {
    const star = normalizeStar(input);
    commit({ ...state, stars: [...state.stars, star], ui: { ...state.ui, selectedId: star.id } });
  },
  updateStar(id, patch = {}) {
    commit({
      ...state,
      stars: state.stars.map((star) =>
        star.id === id ? normalizeStar({ ...star, ...patch, id }) : star
      ),
    });
  },
  removeStar(id) {
    commit({
      ...state,
      stars: state.stars.filter((star) => star.id !== id),
      links: state.links.filter((link) => link.from !== id && link.to !== id),
      ui: { ...state.ui, selectedId: state.ui.selectedId === id ? null : state.ui.selectedId },
    });
  },
};

export function selectVisibleStars(input = state) {
  return input.stars.filter((star) => {
    const matchesKind = input.ui.kindFilter === "all" || star.kind === input.ui.kindFilter;
    const matchesStatus = input.ui.statusFilter === "all" || star.status === input.ui.statusFilter;
    const q = input.ui.search.trim().toLowerCase();
    const matchesSearch = !q || `${star.title} ${star.note}`.toLowerCase().includes(q);
    return matchesKind && matchesStatus && matchesSearch;
  });
}

export function selectStats(input = state) {
  const ranked = [...input.stars].sort((a, b) => priorityScore(b) - priorityScore(a));
  return {
    stars: input.stars.length,
    links: input.links.length,
    activeBets: input.stars.filter((star) => star.kind === "bet" && star.status !== "launch").length,
    topPriority: ranked[0]?.title || "—",
  };
}
