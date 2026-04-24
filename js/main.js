import { KIND_META, KINDS, STATUSES, STATUS_META, priorityScore } from "./model.js";
import { actions, getState, initStore, selectStats, selectVisibleStars, subscribe } from "./store.js";
import { seedConstellation } from "./seeds.js";
import { renderConstellation } from "./sky.js";

const mapTitleEl = document.querySelector("[data-role='map-title']");
const mapNoteEl = document.querySelector("[data-role='map-note']");
const starsEl = document.querySelector("[data-role='stars-count']");
const linksEl = document.querySelector("[data-role='links-count']");
const activeBetsEl = document.querySelector("[data-role='active-bets']");
const topPriorityEl = document.querySelector("[data-role='top-priority']");
const canvasEl = document.querySelector("[data-role='canvas']");
const ledgerEl = document.querySelector("[data-role='ledger']");

function renderInspector(star) {
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
        <input type="text" value="${star.title.replaceAll('"', '&quot;')}" data-field="title" data-star-id="${star.id}" />
      </label>
      <label class="field">
        <span>Note</span>
        <textarea data-field="note" data-star-id="${star.id}">${star.note}</textarea>
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
    </section>
  `;
}

function renderLedger(state, visibleStars) {
  const rows = visibleStars
    .map((star) => `
      <li class="ledger-item ${state.ui.selectedId === star.id ? "is-selected" : ""}" data-action="select-star" data-star-id="${star.id}">
        <div class="ledger-row">
          <strong>${star.title}</strong>
          <span class="priority">Priority ${priorityScore(star)}</span>
        </div>
        <div class="chips">
          <span class="chip">${KIND_META[star.kind].label}</span>
          <span class="chip">${STATUS_META[star.status].label}</span>
          <span class="chip">Impact ${star.impact}</span>
          <span class="chip">Confidence ${star.confidence}</span>
        </div>
        <p>${star.note || "No notes yet."}</p>
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
      ${selected ? renderInspector(selected) : ""}
    </div>
  `;
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
  canvasEl.innerHTML = renderConstellation(state, visibleStars);
  ledgerEl.innerHTML = visibleStars.length
    ? renderLedger(state, visibleStars)
    : `
      <div>
        <strong>Mission ledger</strong>
        <p>${stats.topPriority !== "—" ? `Current top priority: ${stats.topPriority}` : "Stars, filters, and insights will appear here."}</p>
        <p>${visibleStars.length} visible stars on the sky map.</p>
      </div>
    `;
}

document.addEventListener("click", (event) => {
  const starId = event.target.closest("[data-star-id]")?.dataset.starId;
  if (starId) {
    actions.setUI({ selectedId: starId });
  }
});

document.querySelector("[data-action='new-star']")?.addEventListener("click", () => {
  actions.addStar({ title: "New star", note: "Define why this matters." });
});

document.addEventListener("input", (event) => {
  const starId = event.target.dataset.starId;
  const field = event.target.dataset.field;
  if (!starId || !field) return;
  actions.updateStar(starId, { [field]: event.target.value });
});

document.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-action='remove-star']");
  if (!removeButton) return;
  actions.removeStar(removeButton.dataset.starId);
});

subscribe((state) => {
  if (!state.ui.selectedId && state.stars.length) {
    const first = getState().stars[0];
    if (first) actions.setUI({ selectedId: first.id });
  }
  render(state);
});
initStore({ seed: seedConstellation });
