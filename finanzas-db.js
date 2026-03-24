import { DEFAULT_DB, migrateDb } from "./finanzas-helpers.js";

const LS_KEY = "finanzas-familiares-db";

export function loadDb() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return { ...DEFAULT_DB };
  try {
    return migrateDb(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_DB };
  }
}

export function saveDb(db) {
  const migrated = migrateDb(db);
  localStorage.setItem(LS_KEY, JSON.stringify(migrated));
  return migrated;
}

export function resetDb() {
  localStorage.removeItem(LS_KEY);
  return { ...DEFAULT_DB };
}

export async function importDbFromFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  return saveDb(parsed);
}

export function exportDbToFile(db) {
  const migrated = migrateDb(db);
  const blob = new Blob([JSON.stringify(migrated, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gastos.json";
  a.click();
  URL.revokeObjectURL(url);

  return migrated;
}
