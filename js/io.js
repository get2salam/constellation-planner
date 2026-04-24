import { actions, getState } from "./store.js";

export const SCHEMA = "constellation-planner/v1";

export function exportConstellation() {
  const payload = {
    schema: SCHEMA,
    exportedAt: new Date().toISOString(),
    ...getState(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `constellation-planner-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function importConstellation(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (parsed.schema !== SCHEMA) {
    throw new Error("That file is not a Constellation Planner backup.");
  }
  actions.replaceAll(parsed);
}
