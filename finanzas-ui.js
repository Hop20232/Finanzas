import {
  calculateBalances,
  formatMoney,
  getMonthlySummary,
  inferBeneficiarios,
  monthKey,
  normalizeGasto,
} from "./finanzas-helpers.js";

let trendChart;
let splitChart;

export function renderApp(root, state, handlers) {
  root.innerHTML = `
  <div class="container">
    <section class="card">
      <h1>Finanzas Familiares</h1>
      <p class="muted">Arquitectura modular con migración automática y balance estilo Tricount.</p>
      <div class="actions">
        <button id="exportBtn" class="secondary">Exportar gastos.json</button>
        <label class="secondary" style="display:inline-flex;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;border:1px solid #475569;cursor:pointer;">
          Importar gastos.json
          <input id="importInput" type="file" accept="application/json" hidden />
        </label>
        <button id="resetBtn" class="danger">Reiniciar datos locales</button>
      </div>
    </section>

    <section class="card">
      <h2>Nuevo gasto</h2>
      <form id="gastoForm" class="grid">
        <label>Fecha
          <input required type="date" name="fecha" value="${state.selectedMonth}-01" />
        </label>
        <label>Monto
          <input required type="number" min="0" step="0.01" name="monto" placeholder="0.00" />
        </label>
        <label>Categoría
          <input required name="categoria" placeholder="Supermercado" />
        </label>
        <label>Descripción
          <input name="descripcion" placeholder="Detalle opcional" />
        </label>
        <label>Pagador
          <select name="pagador">${state.db.config.personas.map((p) => `<option>${p}</option>`).join("")}</select>
        </label>
        <label>Tipo
          <select name="tipo" id="tipoSelect">
            <option value="compartido">Compartido</option>
            <option value="personal">Personal</option>
          </select>
        </label>
        <label id="beneficiarioWrap" style="display:none;">Beneficiario
          <select name="beneficiario">${state.db.config.personas.map((p) => `<option>${p}</option>`).join("")}</select>
        </label>
        <div class="actions" style="align-self:end;">
          <button type="submit">Guardar gasto</button>
        </div>
      </form>
    </section>

    <section class="card">
      <div class="actions" style="justify-content:space-between;align-items:center;">
        <h2 style="margin:0;">Resumen mensual</h2>
        <label>Mes
          <input id="monthInput" type="month" value="${state.selectedMonth}" />
        </label>
      </div>
      <div id="summaryGrid" class="grid"></div>
    </section>

    <section class="card">
      <h2>Balance entre personas (Tricount)</h2>
      <div id="balances"></div>
    </section>

    <section class="card">
      <h2>Gastos del mes</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Tipo</th><th>Pagador</th><th>Aplica a</th><th>Monto</th><th></th>
            </tr>
          </thead>
          <tbody id="gastosRows"></tbody>
        </table>
      </div>
    </section>

    <section class="card grid">
      <div>
        <h3>Evolución mensual</h3>
        <canvas id="trendChart"></canvas>
      </div>
      <div>
        <h3>Distribución por tipo</h3>
        <canvas id="splitChart"></canvas>
      </div>
    </section>
  </div>
  `;

  bindEvents(root, state, handlers);
  renderData(root, state, handlers);
}

function bindEvents(root, state, handlers) {
  root.querySelector("#exportBtn").onclick = () => handlers.onExport();
  root.querySelector("#resetBtn").onclick = () => handlers.onReset();
  root.querySelector("#importInput").onchange = (e) => {
    const file = e.target.files?.[0];
    if (file) handlers.onImport(file);
    e.target.value = "";
  };

  root.querySelector("#monthInput").onchange = (e) => handlers.onMonthChange(e.target.value);

  const tipoSelect = root.querySelector("#tipoSelect");
  const beneficiarioWrap = root.querySelector("#beneficiarioWrap");
  tipoSelect.onchange = () => {
    beneficiarioWrap.style.display = tipoSelect.value === "personal" ? "grid" : "none";
  };

  root.querySelector("#gastoForm").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const tipo = fd.get("tipo");
    const pagador = fd.get("pagador");
    const beneficiarios = inferBeneficiarios(tipo, fd.get("beneficiario") || pagador, state.db.config.personas);
    const gasto = normalizeGasto(
      {
        fecha: fd.get("fecha"),
        monto: fd.get("monto"),
        categoria: fd.get("categoria"),
        descripcion: fd.get("descripcion"),
        tipo,
        pagador,
        beneficiarios,
      },
      state.db.config.personas,
    );
    handlers.onAddGasto(gasto);
    e.target.reset();
  };
}

export function renderData(root, state, handlers) {
  const summary = getMonthlySummary(state.db, state.selectedMonth);
  const balances = calculateBalances(state.db, state.selectedMonth);

  root.querySelector("#summaryGrid").innerHTML = `
    <div class="card"><strong>Total</strong><br>${formatMoney(summary.total, state.db.config.moneda)}</div>
    <div class="card"><strong>Compartido</strong><br>${formatMoney(summary.compartido, state.db.config.moneda)}</div>
    <div class="card"><strong>Personal</strong><br>${formatMoney(summary.personal, state.db.config.moneda)}</div>
    ${state.db.config.personas
      .map(
        (p) =>
          `<div class="card"><strong>${p}</strong><br>Consumido: ${formatMoney(summary.porPersona[p], state.db.config.moneda)}<br>Pagado: ${formatMoney(summary.pagadoPor[p], state.db.config.moneda)}</div>`,
      )
      .join("")}
  `;

  root.querySelector("#balances").innerHTML = `
    ${state.db.config.personas
      .map((p) => {
        const v = balances.neto[p] || 0;
        const cls = v >= 0 ? "positive" : "negative";
        return `<div><span class="badge">${p}</span> <strong class="${cls}">${formatMoney(v, state.db.config.moneda)}</strong> ${v >= 0 ? "a favor" : "debe"}</div>`;
      })
      .join("")}
    <hr style="border-color:#334155;border-style:solid;border-width:1px 0 0;margin:10px 0;" />
    <h3 style="margin:0 0 8px;">Liquidación sugerida</h3>
    ${balances.movimientos.length ? balances.movimientos.map((m) => `<div>${m.de} → ${m.para}: <strong>${formatMoney(m.monto, state.db.config.moneda)}</strong></div>`).join("") : '<p class="muted">No hay deudas pendientes este mes.</p>'}
  `;

  const filtered = state.db.gastos.filter((g) => monthKey(g.fecha) === state.selectedMonth);
  root.querySelector("#gastosRows").innerHTML = filtered
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map(
      (g) => `
      <tr>
        <td>${g.fecha}</td>
        <td>${g.categoria}</td>
        <td>${g.descripcion || "-"}</td>
        <td>${g.tipo}</td>
        <td>${g.pagador}</td>
        <td>${g.beneficiarios.join(", ")}</td>
        <td>${formatMoney(g.monto, state.db.config.moneda)}</td>
        <td><button class="danger" data-id="${g.id}">Eliminar</button></td>
      </tr>
    `,
    )
    .join("\n");

  root.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.onclick = () => handlers.onDeleteGasto(btn.dataset.id);
  });

  renderCharts(root, state);
}

function renderCharts(root, state) {
  const byMonth = {};
  state.db.gastos.forEach((g) => {
    const key = monthKey(g.fecha);
    byMonth[key] = (byMonth[key] || 0) + g.monto;
  });

  const trendLabels = Object.keys(byMonth).sort();
  const trendValues = trendLabels.map((k) => byMonth[k]);

  const summary = getMonthlySummary(state.db, state.selectedMonth);

  if (trendChart) trendChart.destroy();
  if (splitChart) splitChart.destroy();

  trendChart = new Chart(root.querySelector("#trendChart"), {
    type: "line",
    data: {
      labels: trendLabels,
      datasets: [{ label: "Total mensual", data: trendValues, borderColor: "#22c55e", tension: 0.35 }],
    },
  });

  splitChart = new Chart(root.querySelector("#splitChart"), {
    type: "doughnut",
    data: {
      labels: ["Compartido", "Personal"],
      datasets: [{ data: [summary.compartido, summary.personal], backgroundColor: ["#3b82f6", "#f59e0b"] }],
    },
  });
}
