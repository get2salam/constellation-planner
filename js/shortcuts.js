import { exportConstellation } from "./io.js";
import { actions } from "./store.js";
import { showToast } from "./feedback.js";

let mounted = false;

export function mountShortcuts() {
  if (mounted) return;
  mounted = true;

  document.addEventListener("keydown", (event) => {
    if (event.target.closest("input, textarea, select")) return;

    const key = event.key.toLowerCase();
    if (key === "n") {
      event.preventDefault();
      actions.addStar({ title: "New star", note: "Define why this matters." });
      showToast("Added a fresh star.", "success");
    } else if (key === "e") {
      event.preventDefault();
      exportConstellation();
      showToast("Downloaded your constellation backup.", "success");
    } else if (key === "/") {
      event.preventDefault();
      document.querySelector("[data-field='search']")?.focus();
    }
  });
}
