import { exportDbToFile, importDbFromFile, loadDb, resetDb, saveDb } from "./finanzas-db.js";
import { migrateDb } from "./finanzas-helpers.js";
import { renderApp, renderData } from "./finanzas-ui.js";

const state = {
  db: migrateDb(loadDb()),
  selectedMonth: new Date().toISOString().slice(0, 7),
};

const root = document.querySelector("#app");

const handlers = {
  onAddGasto(gasto) {
    state.db.gastos.push(gasto);
    persistAndRender();
  },
  onDeleteGasto(id) {
    state.db.gastos = state.db.gastos.filter((g) => g.id !== id);
    persistAndRender();
  },
  onMonthChange(month) {
    state.selectedMonth = month;
    renderData(root, state, handlers);
  },
  onExport() {
    state.db = exportDbToFile(state.db);
    saveDb(state.db);
  },
  async onImport(file) {
    state.db = await importDbFromFile(file);
    renderApp(root, state, handlers);
  },
  onReset() {
    state.db = resetDb();
    renderApp(root, state, handlers);
  },
};

function persistAndRender() {
  state.db = saveDb(state.db);
  renderData(root, state, handlers);
}

renderApp(root, state, handlers);
