/* =================================================
   DASHBOARDS
================================================= */
let charts = {};

function switchDashTab(tab, btn) {
  document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.dash-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('dash-' + tab).classList.add('active');
  btn.classList.add('active');
  renderDashboardTab(tab);
}

function renderDashboardTab(tab) {
  if (tab === 'general') renderDashGeneral();
  else if (tab === 'gastos') renderDashGastos();
  else if (tab === 'inversion') renderDashInversion();
}

function refreshDashboards() {
  const activeTab = document.querySelector('.dash-tab.active');
  if (activeTab) {
    const tab = activeTab.getAttribute('onclick').match(/'(\w+)'/)?.[1];
    if (tab) renderDashboardTab(tab);
  }
}

function getMonthsSorted() {
  return Object.keys(state.months).sort();
}

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function renderDashGeneral() {
  const months = getMonthsSorted();
  if (months.length === 0) {
    const c1 = document.getElementById('chart-evolucion');
    const c2 = document.getElementById('chart-doughnut');
    if (c1) c1.parentElement.innerHTML = '<div class="no-data-chart">📭 Sin datos guardados. Cargá y guardá al menos un mes.</div>';
    if (c2) c2.parentElement.innerHTML = '<div class="no-data-chart">📭 Sin datos guardados.</div>';
    return;
  }

  const labels = months;
  const ingresos = months.map(m => {
    const d = state.months[m];
    return (d.incomeP1||0)+(d.incomeP2||0)+(d.incomeOther||0);
  });
  const gastos = months.map(m => calcTotalExpensesFromData(state.months[m]));
  const disponibles = months.map((m, i) => ingresos[i] - gastos[i]);
  const inversiones = months.map(m => state.months[m].invReal || 0);

  destroyChart('evolucion');
  const ctxE = document.getElementById('chart-evolucion');
  if (ctxE) {
    charts['evolucion'] = new Chart(ctxE, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Ingresos', data: ingresos, borderColor: '#1a56db', backgroundColor: 'rgba(26,86,219,0.08)', tension: 0.3, fill: true },
          { label: 'Gastos', data: gastos, borderColor: '#c81e1e', backgroundColor: 'rgba(200,30,30,0.06)', tension: 0.3, fill: true },
          { label: 'Disponible', data: disponibles, borderColor: '#057a55', backgroundColor: 'rgba(5,122,85,0.06)', tension: 0.3, fill: false },
          { label: 'Inv. Real', data: inversiones, borderColor: '#c27803', backgroundColor: 'rgba(194,120,3,0.06)', tension: 0.3, fill: false, borderDash: [5,3] },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { position: 'top' } },
        scales: { y: { ticks: { callback: v => '$' + v.toLocaleString('es-AR') } } }
      }
    });
  }

  const lastMonth = months[months.length - 1];
  const lastData = state.months[lastMonth];
  const catMap = buildCatMap(lastData);
  const catNames = Object.keys(catMap).filter(k => catMap[k] > 0);
  const catValues = catNames.map(k => catMap[k]);
  const COLORS = ['#1a56db','#057a55','#c81e1e','#c27803','#7c3aed','#db2777','#0891b2','#65a30d'];

  destroyChart('doughnut');
  const ctxD = document.getElementById('chart-doughnut');
  if (ctxD && catNames.length > 0) {
    charts['doughnut'] = new Chart(ctxD, {
      type: 'doughnut',
      data: {
        labels: catNames,
        datasets: [{
          data: catValues,
          backgroundColor: COLORS.slice(0, catNames.length),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: $${ctx.parsed.toLocaleString('es-AR')}` } }
        }
      }
    });
  } else if (ctxD) {
    ctxD.parentElement.innerHTML = '<div class="no-data-chart">Sin gastos cargados en el último mes.</div>';
  }
}

function renderDashGastos() {
  const months = getMonthsSorted();
  const insightsEl = document.getElementById('insights-gastos');
  const caminoEl = document.getElementById('mejor-camino');
  if (!insightsEl || !caminoEl) return;

  if (months.length === 0) {
    insightsEl.innerHTML = '<div class="suggestion-item info"><span class="s-icon">ℹ️</span><span>Sin datos históricos.</span></div>';
    caminoEl.innerHTML = '<p class="text-muted">Cargá y guardá meses para ver el camino sugerido.</p>';
    return;
  }

  const gastosArr = months.map(m => calcTotalExpensesFromData(state.months[m]));
  const avgGasto = gastosArr.reduce((a,b) => a+b, 0) / gastosArr.length;
  const lastD = state.months[months[months.length-1]];
  const lastIncome = (lastD.incomeP1||0)+(lastD.incomeP2||0)+(lastD.incomeOther||0);
  const lastExpenses = calcTotalExpensesFromData(lastD);
  const catMap = buildCatMap(lastD);

  const insights = [];
  insights.push({ type: 'info', icon: '📊', text: `Gasto mensual promedio histórico: ${fmtARS(avgGasto)} (${months.length} meses)` });

  const viv = catMap['Vivienda'] || 0;
  if (lastExpenses > 0 && viv > 0) insights.push({ type: 'info', icon: '🏠', text: `Vivienda representa el ${(viv/lastExpenses*100).toFixed(1)}% del gasto del último mes guardado.` });

  const alim = catMap['Alimentos'] || 0;
  if (lastExpenses > 0 && alim > 0) insights.push({ type: 'info', icon: '🛒', text: `Alimentos: ${(alim/lastExpenses*100).toFixed(1)}% del gasto total.` });

  const ocio = catMap['Ocio'] || 0;
  if (lastExpenses > 0 && ocio > 0) {
    const pct = ocio/lastExpenses*100;
    insights.push({ type: pct > 12 ? 'warning' : 'ok', icon: '🎭', text: `Ocio: ${pct.toFixed(1)}% del gasto. ${pct > 12 ? 'Por encima del 12% recomendado.' : 'Dentro del rango razonable.'}` });
  }

  const estructural = (viv || 0) + (catMap['Servicios'] || 0) + (catMap['Familia y Educación'] || 0) + (catMap['Movilidad'] || 0);
  const variable = (alim || 0) + (ocio || 0);
  if (lastExpenses > 0) {
    insights.push({ type: 'info', icon: '⚖️', text: `Gasto estructural: ${fmtARS(estructural)} (${(estructural/lastExpenses*100).toFixed(1)}%). Variable: ${fmtARS(variable)} (${(variable/lastExpenses*100).toFixed(1)}%).` });
  }

  insightsEl.innerHTML = insights.map(s =>
    `<div class="suggestion-item ${s.type}"><span class="s-icon">${s.icon}</span><span>${s.text}</span></div>`
  ).join('');

  const ratio = lastIncome > 0 ? lastExpenses / lastIncome : 0;
  let camino = '<ul style="padding-left:1.2rem;display:flex;flex-direction:column;gap:0.5rem;">';
  if (ratio > 0.9) {
    camino += `<li>⚠️ La situación actual es crítica. El paso 1 es reducir gastos variables (ocio, salidas, suscripciones) aunque sea el 15% del total.</li>`;
    camino += `<li>🔴 No invertir hasta tener control del gasto. Prioridad: equilibrio de ingresos vs egresos.</li>`;
  } else if (ratio > 0.75) {
    camino += `<li>🟡 Margen ajustado. Identificá los 2 ítems más reducibles en la categoría más pesada.</li>`;
    camino += `<li>💡 Destiná al menos el 10% del ingreso a inversión, aunque sea en instrumentos líquidos.</li>`;
  } else {
    camino += `<li>✅ Finanzas saludables. Mantené la disciplina de ahorro.</li>`;
    camino += `<li>💎 Aumentá gradualmente la proporción de inversión, priorizando el perfil ${lastD.invProfile || 'moderado'}.</li>`;
  }
  if (catMap['Vivienda'] && catMap['Vivienda'] / lastExpenses > 0.4) {
    camino += `<li>🏠 Vivienda es el rubro más pesado. Si es alquiler, evaluá alternativas o negociación en el mediano plazo.</li>`;
  }
  if (months.length >= 3) {
    const trend = gastosArr[gastosArr.length-1] - gastosArr[gastosArr.length-3];
    if (trend > 0) camino += `<li>📈 Tendencia de gasto al alza en los últimos 3 meses (+${fmtARS(trend)}). Poné atención.</li>`;
    else camino += `<li>📉 Tendencia de gasto a la baja en los últimos 3 meses. ¡Buen trabajo!</li>`;
  }
  camino += '</ul>';
  caminoEl.innerHTML = camino;
}

function renderDashInversion() {
  const months = getMonthsSorted();
  const tableEl = document.getElementById('inv-history-table');

  destroyChart('inversion');
  const ctxI = document.getElementById('chart-inversion');

  if (months.length === 0) {
    if (ctxI) ctxI.parentElement.innerHTML = '<div class="no-data-chart">Sin datos guardados.</div>';
    if (tableEl) tableEl.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div>Sin historial de inversiones.</div>';
    return;
  }

  const labels = months;
  const teorica = months.map(m => state.months[m].invGoal || 0);
  const real = months.map(m => state.months[m].invReal || 0);

  if (ctxI) {
    charts['inversion'] = new Chart(ctxI, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Inv. Teórica', data: teorica, borderColor: '#1a56db', backgroundColor: 'rgba(26,86,219,0.1)', tension: 0.3, borderDash: [5,3], fill: true },
          { label: 'Inv. Real', data: real, borderColor: '#057a55', backgroundColor: 'rgba(5,122,85,0.1)', tension: 0.3, fill: true },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { position: 'top' } },
        scales: { y: { ticks: { callback: v => '$' + v.toLocaleString('es-AR') } } }
      }
    });
  }

  if (tableEl) {
    tableEl.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Mes</th>
            <th>Monto Real</th>
            <th>Tipo</th>
            <th>Rend. Est.</th>
            <th>Ejecución</th>
          </tr>
        </thead>
        <tbody>
          ${months.map(m => {
            const d = state.months[m];
            const r = d.invReal || 0;
            const goal = d.invGoal || 0;
            const exec = goal > 0 ? (r / goal * 100).toFixed(0) : '—';
            const cls = goal > 0 ? (r >= goal ? 'color-success' : 'color-warning') : '';
            return `<tr>
              <td>${m}</td>
              <td class="fw-bold">${fmtARS(r)}</td>
              <td>${escHtml(d.invType || '—')}</td>
              <td>${d.invYield ? d.invYield + '%' : '—'}</td>
              <td class="${cls}">${exec}${exec !== '—' ? '%' : ''}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }
}

