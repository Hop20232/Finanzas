/* =================================================
   CÁLCULOS Y RESUMEN
================================================= */
function recalculate() {
  const incomeP1 = parseFloat(document.getElementById('income-p1').value) || 0;
  const incomeP2 = parseFloat(document.getElementById('income-p2').value) || 0;
  const incomeOther = parseFloat(document.getElementById('income-other').value) || 0;
  const totalIncome = incomeP1 + incomeP2 + incomeOther;

  const invGoal = parseFloat(document.getElementById('inv-goal').value) || 0;
  const invReal = parseFloat(document.getElementById('inv-real').value) || 0;
  const emergencyMonths = parseFloat(document.getElementById('emergency-months').value) || 6;
  const emergencyCurrent = parseFloat(document.getElementById('emergency-current').value) || 0;
  const invProfile = document.getElementById('inv-profile').value;

  const catData = [];
  let totalExpenses = 0;
  document.querySelectorAll('#categories-container .category-block').forEach(block => {
    const catId = block.dataset.catId;
    const name = block.querySelector('.category-name')?.textContent?.trim() || '';
    const total = calcCategoryTotalFromDOM(block);
    totalExpenses += total;
    catData.push({ id: catId, name, total });
  });

  const disponible = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (disponible / totalIncome * 100) : 0;
  const emergencyTarget = totalExpenses * emergencyMonths;
  const emergencyPct = emergencyTarget > 0 ? Math.min(emergencyCurrent / emergencyTarget * 100, 100) : 0;

  document.getElementById('total-income-display').textContent = fmtARS(totalIncome);
  document.getElementById('total-expenses-display').textContent = fmtARS(totalExpenses);

  renderSummaryStats(totalIncome, totalExpenses, disponible, invReal, invGoal, savingsRate, emergencyPct);
  renderCategorySummary(catData, totalExpenses);
  renderProfileDisplay(invProfile, disponible);
  renderSuggestions(totalIncome, totalExpenses, disponible, invReal, invGoal, savingsRate, catData, emergencyPct, emergencyCurrent, emergencyTarget, invProfile);
}

function renderSummaryStats(totalIncome, totalExpenses, disponible, invReal, invGoal, savingsRate, emergencyPct) {
  const ratio = totalIncome > 0 ? totalExpenses / totalIncome : 0;
  const statsEl = document.getElementById('summary-stats');
  if (!statsEl) return;
  const invExec = invGoal > 0 ? (invReal / invGoal * 100) : (invReal > 0 ? 100 : 0);
  statsEl.innerHTML = `
    <div class="stat-card primary">
      <div class="stat-label">Ingreso Total</div>
      <div class="stat-value">${fmtARS(totalIncome)}</div>
    </div>
    <div class="stat-card ${ratio > 0.9 ? 'danger' : ratio > 0.75 ? 'warning' : 'success'}">
      <div class="stat-label">Gasto Total</div>
      <div class="stat-value">${fmtARS(totalExpenses)}</div>
      <div class="stat-sub">${(ratio * 100).toFixed(1)}% del ingreso</div>
    </div>
    <div class="stat-card ${disponible >= 0 ? 'success' : 'danger'}">
      <div class="stat-label">Disponible Teórico</div>
      <div class="stat-value">${fmtARS(disponible)}</div>
      <div class="stat-sub">Tasa ahorro: ${savingsRate.toFixed(1)}%</div>
    </div>
    <div class="stat-card ${invExec >= 100 ? 'success' : invExec >= 50 ? 'warning' : 'danger'}">
      <div class="stat-label">Inversión Real</div>
      <div class="stat-value">${fmtARS(invReal)}</div>
      <div class="stat-sub">Ejecución: ${invExec.toFixed(0)}%</div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill ${invExec >= 100 ? 'success' : invExec >= 50 ? 'warning' : 'danger'}"
          style="width:${Math.min(invExec,100)}%"></div>
      </div>
    </div>
  `;
}

function renderCategorySummary(catData, totalExpenses) {
  const el = document.getElementById('summary-categories');
  if (!el) return;
  if (!catData.length) { el.innerHTML = '<p class="text-muted">Sin categorías cargadas.</p>'; return; }
  el.innerHTML = catData.map(cat => {
    const pct = totalExpenses > 0 ? (cat.total / totalExpenses * 100).toFixed(1) : '0.0';
    return `
      <div class="cat-summary-item">
        <div class="cat-name">${escHtml(cat.name)}</div>
        <div class="cat-amount">${fmtARS(cat.total)}</div>
        <div class="cat-pct">${pct}% del total</div>
      </div>`;
  }).join('');
}

function renderProfileDisplay(profile, disponible) {
  const el = document.getElementById('profile-display');
  if (!el) return;
  const profiles = {
    conservador: { label: 'Conservador', dist: [{label:'Base líquida',pct:70,color:'#1a56db'},{label:'Crecimiento',pct:20,color:'#057a55'},{label:'Alto riesgo',pct:10,color:'#c27803'}] },
    moderado:    { label: 'Moderado',    dist: [{label:'Base líquida',pct:50,color:'#1a56db'},{label:'Crecimiento',pct:35,color:'#057a55'},{label:'Alto riesgo',pct:15,color:'#c27803'}] },
    agresivo:    { label: 'Agresivo',    dist: [{label:'Base líquida',pct:30,color:'#1a56db'},{label:'Crecimiento',pct:45,color:'#057a55'},{label:'Alto riesgo',pct:25,color:'#c81e1e'}] },
  };
  const p = profiles[profile] || profiles.moderado;
  const bars = p.dist.map(d => {
    const monto = disponible > 0 ? disponible * d.pct / 100 : 0;
    return `<div class="profile-bar" style="background:${d.color};flex:${d.pct};">
      <span>${d.label} ${d.pct}% (${fmtARS(monto)})</span>
    </div>`;
  }).join('');
  el.innerHTML = `
    <h4 style="font-size:0.88rem;color:var(--neutral-600);margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.4px;">
      Perfil ${p.label} — Distribución sugerida del excedente
    </h4>
    <div class="profile-distribution">${bars}</div>`;
}

/* =================================================
   SUGERENCIAS
================================================= */
function renderSuggestions(totalIncome, totalExpenses, disponible, invReal, invGoal, savingsRate, catData, emergencyPct, emergencyCurrent, emergencyTarget, profile) {
  const el = document.getElementById('suggestions-list');
  if (!el) return;
  const suggestions = [];
  const ratio = totalIncome > 0 ? totalExpenses / totalIncome : 0;
  const catMap = {};
  catData.forEach(c => { catMap[normKey(c.name)] = c.total; });

  if (ratio > 0.9) {
    suggestions.push({ type: 'danger', icon: '🚨', text: `Los gastos representan el ${(ratio*100).toFixed(1)}% del ingreso. Situación crítica: no hay margen de ahorro real. Revisá urgente los gastos variables.` });
  } else if (ratio > 0.75) {
    suggestions.push({ type: 'warning', icon: '⚠️', text: `Los gastos representan el ${(ratio*100).toFixed(1)}% del ingreso. Margen ajustado. Revisá categorías de mayor peso.` });
  } else if (ratio < 0.6 && totalIncome > 0) {
    suggestions.push({ type: 'ok', icon: '✅', text: `Excelente: solo gastás el ${(ratio*100).toFixed(1)}% de tus ingresos. Tenés buen margen para invertir o reforzar metas.` });
  }

  const vivienda = catMap['vivienda'] || catMap['alquiler'] || 0;
  if (totalExpenses > 0 && vivienda / totalExpenses > 0.4) {
    suggestions.push({ type: 'warning', icon: '🏠', text: `El gasto en Vivienda representa el ${(vivienda/totalExpenses*100).toFixed(1)}% del gasto total. Se recomienda no superar el 40%.` });
  }

  const ocio = catMap['ocio'] || 0;
  if (totalExpenses > 0 && ocio / totalExpenses > 0.12) {
    suggestions.push({ type: 'warning', icon: '🎭', text: `El gasto en Ocio es del ${(ocio/totalExpenses*100).toFixed(1)}% del total. Revisar si está dentro de tus prioridades.` });
  }

  const alimentos = catMap['alimentos'] || 0;
  if (totalExpenses > 0 && alimentos / totalExpenses > 0.35) {
    suggestions.push({ type: 'warning', icon: '🛒', text: `Alimentos representa el ${(alimentos/totalExpenses*100).toFixed(1)}% del gasto. Puede ser por precios o falta de planificación de compras.` });
  }

  const familia = catMap['familia y educación'] || catMap['familia'] || catMap['educación'] || 0;
  if (totalExpenses > 0 && familia / totalExpenses > 0.25) {
    suggestions.push({ type: 'info', icon: '👨‍👩‍👧', text: `Familia y Educación representa el ${(familia/totalExpenses*100).toFixed(1)}% del gasto total. Bloque estructural: no recortar, pero analizar otros rubros.` });
  }

  if (emergencyPct < 100 && emergencyTarget > 0) {
    suggestions.push({ type: 'info', icon: '🛡️', text: `Tu fondo de emergencia está al ${emergencyPct.toFixed(1)}% del objetivo (${fmtARS(emergencyCurrent)} de ${fmtARS(emergencyTarget)}). Destinar parte del excedente a completarlo es prioritario.` });
  } else if (emergencyPct >= 100) {
    suggestions.push({ type: 'ok', icon: '🛡️', text: `Fondo de emergencia completo (${fmtARS(emergencyCurrent)}). Podés enfocarte en objetivos de inversión.` });
  }

  if (invGoal > 0) {
    if (invReal < invGoal) {
      suggestions.push({ type: 'warning', icon: '📉', text: `Invertiste ${fmtARS(invReal)} de un objetivo de ${fmtARS(invGoal)}. Ejecución: ${(invReal/invGoal*100).toFixed(0)}%. Intentá incrementar la inversión el próximo mes.` });
    } else if (invReal > invGoal) {
      suggestions.push({ type: 'ok', icon: '🌟', text: `Superaste el objetivo de inversión (${fmtARS(invReal)} vs ${fmtARS(invGoal)}). Excelente. Revisá que no hayas comprometido liquidez de emergencia.` });
    }
  }

  if (disponible > 0 && totalIncome > 0) {
    const profiles = {
      conservador: [{label:'Base líquida (70%)',pct:70},{label:'Crecimiento (20%)',pct:20},{label:'Alto riesgo (10%)',pct:10}],
      moderado:    [{label:'Base líquida (50%)',pct:50},{label:'Crecimiento (35%)',pct:35},{label:'Alto riesgo (15%)',pct:15}],
      agresivo:    [{label:'Base líquida (30%)',pct:30},{label:'Crecimiento (45%)',pct:45},{label:'Alto riesgo (25%)',pct:25}],
    };
    const p = profiles[profile] || profiles.moderado;
    const dist = p.map(d => `${d.label}: ${fmtARS(disponible * d.pct / 100)}`).join(' · ');
    suggestions.push({ type: 'info', icon: '💡', text: `Excedente teórico: ${fmtARS(disponible)}. Distribución sugerida (perfil ${profile}): ${dist}` });
  } else if (disponible < 0) {
    suggestions.push({ type: 'danger', icon: '🔴', text: `Tus gastos superan tus ingresos en ${fmtARS(Math.abs(disponible))}. Revisá urgente qué podés reducir.` });
  }

  if (!suggestions.length) {
    el.innerHTML = '<div class="suggestion-item info"><span class="s-icon">ℹ️</span><span>Cargá ingresos y gastos para obtener sugerencias automáticas.</span></div>';
    return;
  }
  el.innerHTML = suggestions.map(s =>
    `<div class="suggestion-item ${s.type}"><span class="s-icon">${s.icon}</span><span>${s.text}</span></div>`
  ).join('');
}

function normKey(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

