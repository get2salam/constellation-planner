import { actions, initStore, selectStats, subscribe } from "./store.js";

const mapTitleEl = document.querySelector("[data-role='map-title']");
const mapNoteEl = document.querySelector("[data-role='map-note']");
const starsEl = document.querySelector("[data-role='stars-count']");
const linksEl = document.querySelector("[data-role='links-count']");
const activeBetsEl = document.querySelector("[data-role='active-bets']");
const topPriorityEl = document.querySelector("[data-role='top-priority']");
const canvasEl = document.querySelector("[data-role='canvas']");
const ledgerEl = document.querySelector("[data-role='ledger']");

function render(state) {
  const stats = selectStats(state);
  mapTitleEl.textContent = state.mapTitle;
  mapNoteEl.textContent = state.mapNote;
  starsEl.textContent = String(stats.stars);
  linksEl.textContent = String(stats.links);
  activeBetsEl.textContent = String(stats.activeBets);
  topPriorityEl.textContent = stats.topPriority;
  canvasEl.innerHTML = `
    <div>
      <strong>Constellation canvas</strong>
      <p>${stats.stars ? `${stats.stars} stars will render here next.` : "The interactive star map lands in the next commit."}</p>
    </div>
  `;
  ledgerEl.innerHTML = `
    <div>
      <strong>Mission ledger</strong>
      <p>${stats.topPriority !== "—" ? `Current top priority: ${stats.topPriority}` : "Stars, filters, and insights will appear here."}</p>
    </div>
  `;
}

document.querySelector("[data-action='new-star']")?.addEventListener("click", () => {
  actions.addStar({ title: "New star", note: "Define why this matters." });
});

subscribe(render);
initStore();
