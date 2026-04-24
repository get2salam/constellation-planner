import { KIND_META, STATUS_META } from "./model.js";

export function renderConstellation(state, visibleStars) {
  const byId = new Map(state.stars.map((star) => [star.id, star]));
  const visibleIds = new Set(visibleStars.map((star) => star.id));
  const lines = state.links
    .map((link) => ({ link, from: byId.get(link.from), to: byId.get(link.to) }))
    .filter(({ from, to }) => from && to && visibleIds.has(from.id) && visibleIds.has(to.id));

  const stars = visibleStars
    .map((star) => {
      const glow = KIND_META[star.kind].hue;
      const ring = STATUS_META[star.status].hue;
      const radius = 8 + star.impact;
      return `
        <button class="star-node" type="button" data-star-id="${star.id}" style="left:${star.x}%;top:${star.y}%">
          <span class="star-glow" style="background:${glow};width:${radius * 3}px;height:${radius * 3}px"></span>
          <span class="star-core" style="background:${glow};width:${radius}px;height:${radius}px;box-shadow:0 0 0 2px ${ring}"></span>
          <span class="star-label">${star.title}</span>
        </button>
      `;
    })
    .join("");

  const routes = lines
    .map(({ link, from, to }) => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      return `
        <div class="route" style="left:${from.x}%;top:${from.y}%;width:${length}%;transform:rotate(${angle}deg)"></div>
        <span class="route-label" style="left:${midX}%;top:${midY}%">${link.label}</span>
      `;
    })
    .join("");

  return `
    <div class="sky-stage">
      <div class="sky-grid"></div>
      ${routes}
      ${stars}
    </div>
  `;
}
