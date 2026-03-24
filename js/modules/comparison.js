/* =================================================
   COMPARATIVA MENSUAL
================================================= */
function updateCompareSelectors() {
  const months = Object.keys(state.months).sort();
  const selA = document.getElementById('compare-month-a');
  const selB = document.getElementById('compare-month-b');
  if (!selA || !selB) return;
  const optHtml = '<option value="">— Mes —</option>' +
    months.map(m => `<option value="${m}">${m}</option>`).join('');
  selA.innerHTML = optHtml;
  selB.innerHTML = optHtml;
}

function runComparison() {
  const mA = document.getElementById('compare-month-a').value;
  const mB = document.getElementById('compare-month-b').value;
  const result = document.getElementById('comparison-result');
  if (!mA || !mB) { result.innerHTML = '<p class="text-muted">Seleccioná dos meses para comparar.</p>'; return; }
  if (mA === mB) { result.innerHTML = '<p class="text-muted">Seleccioná dos meses distintos.</p>'; return; }
  const dA = state.months[mA];
  const dB = state.months[mB];
  if (!dA || !dB) { result.innerHTML = '<p class="text-muted">Faltan datos de uno de los meses.</p>'; return; }

  const tIncomeA = (dA.incomeP1||0)+(dA.incomeP2||0)+(dA.incomeOther||0);
  const tIncomeB = (dB.incomeP1||0)+(dB.incomeP2||0)+(dB.incomeOther||0);
  const tExpA = calcTotalExpensesFromData(dA);
  const tExpB = calcTotalExpensesFromData(dB);
  const dispA = tIncomeA - tExpA;
  const dispB = tIncomeB - tExpB;
  const invA = dA.invReal || 0;
  const invB = dB.invReal || 0;

  const catMapA = buildCatMap(dA);
  const catMapB = buildCatMap(dB);
  const allCats = [...new Set([...Object.keys(catMapA), ...Object.keys(catMapB)])];

  function diffCell(vA, vB, higherIsBad) {
    if (vA === 0 && vB === 0) return `<span class="diff">—</span>`;
    const diff = vB - vA;
    if (diff === 0) return `<span class="diff">Sin cambio</span>`;
    const pct = vA !== 0 ? (diff / Math.abs(vA) * 100).toFixed(1) : '—';
    const cls = diff > 0
      ? (higherIsBad ? 'up-bad' : 'up-good')
      : (higherIsBad ? 'down-good' : 'down-bad');
    const arrow = diff > 0 ? '▲' : '▼';
    return `<span class="diff ${cls}">${arrow} ${fmtARS(Math.abs(diff))} (${pct}%)</span>`;
  }

  let rows = `
    <div class="compare-header">
      <span>Concepto</span>
      <span>${mA}</span>
      <span>${mB}</span>
      <span>Variación</span>
    </div>
    <div class="compare-row">
      <span class="label">Ingreso Total</span>
      <span class="val">${fmtARS(tIncomeA)}</span>
      <span class="val">${fmtARS(tIncomeB)}</span>
      <span>${diffCell(tIncomeA, tIncomeB, false)}</span>
    </div>
    <div class="compare-row">
      <span class="label">Gasto Total</span>
      <span class="val">${fmtARS(tExpA)}</span>
      <span class="val">${fmtARS(tExpB)}</span>
      <span>${diffCell(tExpA, tExpB, true)}</span>
    </div>
    <div class="compare-row">
      <span class="label">Disponible Teórico</span>
      <span class="val">${fmtARS(dispA)}</span>
      <span class="val">${fmtARS(dispB)}</span>
      <span>${diffCell(dispA, dispB, false)}</span>
    </div>
    <div class="compare-row">
      <span class="label">Inversión Real</span>
      <span class="val">${fmtARS(invA)}</span>
      <span class="val">${fmtARS(invB)}</span>
      <span>${diffCell(invA, invB, false)}</span>
    </div>`;

  if (allCats.length) {
    rows += `<div style="margin-top:0.75rem;padding-top:0.5rem;border-top:2px solid var(--neutral-200);">
      <p style="font-size:0.8rem;font-weight:700;color:var(--neutral-500);text-transform:uppercase;margin-bottom:0.4rem;">Por categoría</p></div>`;
    allCats.forEach(cat => {
      const vA = catMapA[cat] || 0;
      const vB = catMapB[cat] || 0;
      rows += `
        <div class="compare-row">
          <span class="label">${escHtml(cat)}</span>
          <span class="val">${fmtARS(vA)}</span>
          <span class="val">${fmtARS(vB)}</span>
          <span>${diffCell(vA, vB, true)}</span>
        </div>`;
    });
  }

  result.innerHTML = rows;
}

function calcTotalExpensesFromData(data) {
  if (!data.categories) return 0;
  return data.categories.reduce((sum, cat) => {
    return sum + (cat.items || []).reduce((s, item) => {
      const rate = item.currency === 'ARS' ? 1 : (state.currencies[item.currency] || 1);
      return s + (parseFloat(item.amount) || 0) * rate;
    }, 0);
  }, 0);
}

function buildCatMap(data) {
  const map = {};
  if (!data.categories) return map;
  data.categories.forEach(cat => {
    const total = (cat.items || []).reduce((s, item) => {
      const rate = item.currency === 'ARS' ? 1 : (state.currencies[item.currency] || 1);
      return s + (parseFloat(item.amount) || 0) * rate;
    }, 0);
    map[cat.name] = (map[cat.name] || 0) + total;
  });
  return map;
}

