import { showToast } from "./feedback.js";
import { exportConstellation, importConstellation } from "./io.js";
import { escapeHtml, KIND_META, KINDS, STATUSES, STATUS_META, priorityScore } from "./model.js";
import { mountShortcuts } from "./shortcuts.js";
import { actions, getState, initStore, selectRankedStars, selectStats, selectVisibleStars, subscribe } from "./store.js";
import { seedConstellation } from "./seeds.js";
import { renderRoadmap } from "./roadmap.js";
import { renderConstellation } from "./sky.js";

const mapTitleEl = document.querySelector("[data-role='map-title']");
const mapNoteEl = document.querySelector("[data-role='map-note']");
const starsEl = document.querySelector("[data-role='stars-count']");
const linksEl = document.querySelector("[data-role='links-count']");
const activeBetsEl = document.querySelector("[data-role='active-bets']");
const topPriorityEl = document.querySelector("[data-role='top-priority']");
const canvasEl = document.querySelector("[data-role='canvas']");
const ledgerEl = document.querySelector("[data-role='ledger']");
const searchEl = document.querySelector("[data-field='search']");
const kindFilterEl = document.querySelector("[data-field='kindFilter']");
const statusFilterEl = document.querySelector("[data-field='statusFilter']");
const insightsEl = document.querySelector("[data-role='insights']");

function renderInspector(star, state) {
  const relatedLinks = state.links.filter((link) => link.from === star.id || link.to === star.id);
  const targets = state.stars.filter((entry) => entry.id !== star.id);
  return `
    <section class="inspector">
      <div class="ledger-head">
        <div>
          <strong>Star inspector</strong>
          <p>Edit the selected initiative in place.</p>
        </div>
        <button class="btn btn-danger" type="button" data-action="remove-star" data-star-id="${star.id}">Remove</button>
      </div>
      <label class="field">
        <span>Title</span>
        <input type="text" value="${escapeHtml(star.title)}" data-field="title" data-star-id="${star.id}" />
      </label>
      <label class="field">
        <span>Note</span>
        <textarea data-field="note" data-star-id="${star.id}">${escapeHtml(star.note)}</textarea>
      </label>
      <div class="field-grid two">
        <label class="field">
          <span>Kind</span>
          <select data-field="kind" data-star-id="${star.id}">
            ${KINDS.map((kind) => `<option value="${kind}" ${star.kind === kind ? "selected" : ""}>${KIND_META[kind].label}</option>`).join("")}
          </select>
        </label>
        <label class="field">
          <span>Status</span>
          <select data-field="status" data-star-id="${star.id}">
            ${STATUSES.map((status) => `<option value="${status}" ${star.status === status ? "selected" : ""}>${STATUS_META[status].label}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="field-grid two">
        <label class="field"><span>Impact</span><input type="range" min="1" max="10" value="${star.impact}" data-field="impact" data-star-id="${star.id}" /></label>
        <label class="field"><span>Confidence</span><input type="range" min="1" max="10" value="${star.confidence}" data-field="confidence" data-star-id="${star.id}" /></label>
      </div>
      <label class="field"><span>Effort</span><input type="range" min="1" max="10" value="${star.effort}" data-field="effort" data-star-id="${star.id}" /></label>
      <div class="field-grid two">
        <label class="field">
          <span>Link to another star</span>
          <select data-role="link-target">
            <option value="">Choose target…</option>
            ${targets.map((target) => `<option value="${target.id}">${escapeHtml(target.title)}</option>`).join("")}
          </select>
        </label>
        <label class="field">
          <span>Relationship label</span>
          <input type="text" data-role="link-label" value="supports" />
        </label>
      </div>
      <button class="btn" type="button" data-action="add-link" data-star-id="${star.id}">Add dependency link</button>
      <div class="link-list">
        ${relatedLinks.length ? relatedLinks.map((link) => {
          const peer = state.stars.find((entry) => entry.id === (link.from === star.id ? link.to : link.from));
          return `<div class="link-pill"><span>${escapeHtml(link.label)} · ${escapeHtml(peer?.title || "Unknown")}</span><button type="button" data-action="remove-link" data-link-id="${link.id}">✕</button></div>`;
        }).join("") : `<span class="chip">No links yet</span>`}
      </div>
    </section>
  `;
}

function renderLedger(state, visibleStars) {
  const rows = visibleStars
    .map((star) => `
      <li class="ledger-item ${state.ui.selectedId === star.id ? "is-selected" : ""}" data-action="select-star" data-star-id="${star.id}">
        <div class="ledger-row">
          <strong>${escapeHtml(star.title)}</strong>
          <span class="priority">Priority ${priorityScore(star)}</span>
        </div>
        <div class="chips">
          <span class="chip">${KIND_META[star.kind].label}</span>
          <span class="chip">${STATUS_META[star.status].label}</span>
          <span class="chip">Impact ${star.impact}</span>
          <span class="chip">Confidence ${star.confidence}</span>
        </div>
        <p>${star.note ? escapeHtml(star.note) : "No notes yet."}</p>
      </li>
    `)
    .join("");

  const selected = state.stars.find((star) => star.id === state.ui.selectedId) || visibleStars[0];
  return `
    <div class="stack">
      <div class="ledger-head">
        <div>
          <strong>Mission ledger</strong>
          <p>Prioritized stars from your visible constellation.</p>
        </div>
      </div>
      <ul class="ledger-list">
        ${rows}
      </ul>
      ${selected ? renderInspector(selected, state) : ""}
    </div>
  `;
}

function renderInsights(state) {
  const ranked = selectRankedStars(state);
  const fastestWin = [...state.stars].sort((a, b) => a.effort - b.effort || priorityScore(b) - priorityScore(a))[0];
  const launchReady = state.stars.find((star) => star.status === 'launch') || ranked[0];
  const cards = [
    {
      title: ranked[0]?.title || 'No stars yet',
      body: ranked[0] ? `Highest leverage score at ${priorityScore(ranked[0])}.` : 'Add a few initiatives to surface strategic leaders.',
      meta: 'Top priority',
    },
    {
      title: fastestWin?.title || 'No quick win yet',
      body: fastestWin ? `Lowest effort star with effort ${fastestWin.effort}/10.` : 'Quick wins appear once the map has stars.',
      meta: 'Fastest win',
    },
    {
      title: launchReady?.title || 'Nothing launched yet',
      body: launchReady ? `${STATUS_META[launchReady.status].label} status, ready for execution focus.` : 'Promote a star to Launch when it is execution-ready.',
      meta: 'Execution anchor',
    },
  ];
  insightsEl.innerHTML = cards.map((card) => `
    <article class="insight card">
      <small>${card.meta}</small>
      <strong>${escapeHtml(card.title)}</strong>
      <p>${escapeHtml(card.body)}</p>
    </article>
  `).join('');
}

function render(state) {
  const stats = selectStats(state);
  const visibleStars = selectVisibleStars(state);
  mapTitleEl.textContent = state.mapTitle;
  mapNoteEl.textContent = state.mapNote;
  starsEl.textContent = String(stats.stars);
  linksEl.textContent = String(stats.links);
  activeBetsEl.textContent = String(stats.activeBets);
  topPriorityEl.textContent = stats.topPriority;
  searchEl.value = state.ui.search;
  kindFilterEl.innerHTML = `<option value="all">All kinds</option>${KINDS.map((kind) => `<option value="${kind}" ${state.ui.kindFilter === kind ? "selected" : ""}>${KIND_META[kind].label}</option>`).join("")}`;
  statusFilterEl.innerHTML = `<option value="all">All stages</option>${STATUSES.map((status) => `<option value="${status}" ${state.ui.statusFilter === status ? "selected" : ""}>${STATUS_META[status].label}</option>`).join("")}`;
  canvasEl.innerHTML = visibleStars.length
    ? state.ui.view === 'roadmap' ? renderRoadmap(visibleStars) : renderConstellation(state, visibleStars)
    : `<div><strong>No stars match this view.</strong><p>Try clearing the filters or plant a new star.</p></div>`;
  ledgerEl.innerHTML = visibleStars.length
    ? renderLedger(state, visibleStars)
    : `
      <div>
        <strong>Mission ledger</strong>
        <p>${stats.topPriority !== "—" ? `Current top priority: ${stats.topPriority}` : "Stars, filters, and insights will appear here."}</p>
        <p>${visibleStars.length} visible stars on the sky map.</p>
      </div>
    `;
  renderInsights(state);
}

document.addEventListener("click", (event) => {
  const starId = event.target.closest("[data-star-id]")?.dataset.starId;
  if (starId) {
    actions.setUI({ selectedId: starId });
  }
});

document.querySelector("[data-action='new-star']")?.addEventListener("click", () => {
  actions.addStar({ title: "New star", note: "Define why this matters." });
  showToast("Added a fresh star.", "success");
});

document.querySelectorAll("[data-action='set-view']").forEach((button) => {
  button.addEventListener('click', () => actions.setUI({ view: button.dataset.view }));
});

document.querySelector("[data-action='reset-sample']")?.addEventListener('click', () => {
  actions.replaceAll(seedConstellation());
  showToast('Replanted the sample constellation.', 'success');
});

document.querySelector("[data-action='clear-map']")?.addEventListener('click', () => {
  actions.replaceAll({ mapTitle: 'Fresh constellation', mapNote: 'A blank sky waiting for a new strategy.' });
  showToast('Cleared the current map.', 'success');
});

document.querySelector("[data-action='export']")?.addEventListener("click", () => {
  exportConstellation();
  showToast("Downloaded your constellation backup.", "success");
});

document.querySelector("[data-action='import']")?.addEventListener("click", () => {
  document.querySelector('#import-file')?.click();
});

document.addEventListener("click", (event) => {
  const addLinkButton = event.target.closest("[data-action='add-link']");
  if (addLinkButton) {
    const starId = addLinkButton.dataset.starId;
    const inspector = addLinkButton.closest('.inspector');
    const targetId = inspector?.querySelector('[data-role="link-target"]')?.value;
    const label = inspector?.querySelector('[data-role="link-label"]')?.value || 'supports';
    if (starId && targetId) actions.addLink({ from: starId, to: targetId, label });
    return;
  }

  const removeLinkButton = event.target.closest("[data-action='remove-link']");
  if (removeLinkButton) {
    actions.removeLink(removeLinkButton.dataset.linkId);
    return;
  }
});

document.addEventListener("input", (event) => {
  const starId = event.target.dataset.starId;
  const field = event.target.dataset.field;
  if (field === 'search') {
    actions.setUI({ search: event.target.value });
    return;
  }
  if (!starId || !field) return;
  actions.updateStar(starId, { [field]: event.target.value });
});

document.addEventListener("change", async (event) => {
  if (event.target.id === 'import-file') {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importConstellation(file);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Import failed.');
    } finally {
      event.target.value = '';
    }
    return;
  }

  const field = event.target.dataset.field;
  if (field === 'kindFilter' || field === 'statusFilter') {
    actions.setUI({ [field]: event.target.value });
  }
});

document.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-action='remove-star']");
  if (!removeButton) return;
  actions.removeStar(removeButton.dataset.starId);
});

mountShortcuts();

subscribe((state) => {
  if (!state.ui.selectedId && state.stars.length) {
    const first = getState().stars[0];
    if (first) actions.setUI({ selectedId: first.id });
  }
  render(state);
});
initStore({ seed: seedConstellation });
