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

export function parseBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("That backup is missing its constellation data.");
  }
  if (parsed.schema !== SCHEMA) {
    throw new Error("That file is not a Constellation Planner backup.");
  }
  if (parsed.stars !== undefined && !Array.isArray(parsed.stars)) {
    throw new Error("That backup has a malformed stars list.");
  }
  if (parsed.links !== undefined && !Array.isArray(parsed.links)) {
    throw new Error("That backup has a malformed links list.");
  }
  return parsed;
}

export async function importConstellation(file) {
  const text = await file.text();
  actions.replaceAll(parseBackup(text));
}
