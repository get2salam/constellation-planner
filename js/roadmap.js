import { escapeHtml, STATUS_META } from "./model.js";

export function renderRoadmap(stars) {
  const lanes = ["spark", "orbit", "cluster", "launch"];
  return `
    <div class="roadmap">
      ${lanes.map((lane) => `
        <section class="roadmap-lane">
          <header>
            <strong>${STATUS_META[lane].label}</strong>
            <span>${stars.filter((star) => star.status === lane).length}</span>
          </header>
          <div class="roadmap-stack">
            ${stars.filter((star) => star.status === lane).map((star) => `
              <button class="roadmap-card" type="button" data-star-id="${star.id}">
                <strong>${escapeHtml(star.title)}</strong>
                <p>${star.note ? escapeHtml(star.note) : 'No notes yet.'}</p>
              </button>
            `).join("") || `<div class="roadmap-empty">Nothing here yet.</div>`}
          </div>
        </section>
      `).join("")}
    </div>
  `;
}
