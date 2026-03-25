let appReady = false;

/* =================================================
   NAVEGACIÓN
================================================= */
function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.main-nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.getElementById('tab-' + view).classList.add('active');
  if (view === 'dashboard') {
    const activeTab = document.querySelector('.dash-tab.active');
    if (activeTab) {
      const tab = activeTab.getAttribute('onclick').match(/'(\w+)'/)?.[1];
      if (tab) renderDashboardTab(tab);
    } else {
      renderDashGeneral();
    }
  }
}

/* =================================================
   HELPERS
================================================= */
function fmtARS(n) {
  if (isNaN(n)) return '$ 0';
  return '$ ' + Math.round(n).toLocaleString('es-AR');
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
    t.style.transition = '0.3s';
    setTimeout(() => t.remove(), 350);
  }, 3000);
}

/* =================================================
   INICIALIZACIÓN
================================================= */
function initApp() {
  // Nombres
  document.getElementById('name-p1').value = state.names.p1 || 'Persona 1';
  document.getElementById('name-p2').value = state.names.p2 || 'Persona 2';
  updatePersonaLabels();

  // Mes actual
  if (!state.currentMonth) {
    const now = new Date();
    state.currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  }
  document.getElementById('current-month').value = state.currentMonth;
  document.getElementById('header-month-label').textContent = state.currentMonth;

  // API url — siempre visible y precargada con el default si no hay otro valor
  const apiUrlField = document.getElementById('api-url');
  apiUrlField.value = state.apiUrl || DEFAULT_API_URL;
  state.apiUrl = apiUrlField.value; // sincronizar state

  // Cotizaciones
  renderCurrencyRateGrid();

  // Datalists
  refreshExpenseTypeDatalist();
  refreshInvTypeDatalist();

  // Templates
  refreshTemplateSelector();

  // Categorías
  const container = document.getElementById('categories-container');
  container.innerHTML = '';
  categoryOpenState = {};

  const currentData = state.months[state.currentMonth];
  if (currentData && currentData.categories) {
    rebuildCategoriesFromData(currentData.categories);
    applyMonthDataToForm(currentData);
  } else {
    DEFAULT_CATEGORIES.forEach(cat => {
      const catCopy = {
        id: cat.id,
        name: cat.name,
        open: true,
        items: cat.items.map(i => ({ ...i, id: uid() }))
      };
      categoryOpenState[catCopy.id] = true;
      buildCategoryBlock(catCopy);
    });
  }

  updateCompareSelectors();
  recalculate();
}

function updatePersonaLabels() {
  const n1 = state.names.p1 || 'Persona 1';
  const n2 = state.names.p2 || 'Persona 2';
  const l1 = document.getElementById('label-p1');
  const l2 = document.getElementById('label-p2');
  if (l1) l1.textContent = `Ingreso ${n1}`;
  if (l2) l2.textContent = `Ingreso ${n2}`;
}

/* =================================================
   EVENT LISTENERS
================================================= */
document.addEventListener('DOMContentLoaded', function() {
  setAppLocked(true);
  setupAuthScreen();

  document.getElementById('name-p1').addEventListener('input', function() {
    state.names.p1 = this.value || 'Persona 1';
    updatePersonaLabels();
    saveState();
  });
  document.getElementById('name-p2').addEventListener('input', function() {
    state.names.p2 = this.value || 'Persona 2';
    updatePersonaLabels();
    saveState();
  });

  document.getElementById('current-month').addEventListener('change', function() {
    state.currentMonth = this.value;
    document.getElementById('header-month-label').textContent = this.value;
    const data = state.months[this.value];
    if (data) {
      applyMonthDataToForm(data);
      toast(`Datos de ${this.value} cargados`, 'info');
    } else {
      setVal('income-p1', '');
      setVal('income-p2', '');
      setVal('income-other', '');
      setVal('inv-goal', '');
      setVal('inv-real', '');
      setVal('inv-type', '');
      setVal('inv-yield', '');
    }
    recalculate();
  });

  document.getElementById('inv-type').addEventListener('change', function() {
    const val = this.value.trim();
    if (val && !state.invTypes.includes(val)) {
      state.invTypes.push(val);
      saveState();
      refreshInvTypeDatalist();
    }
  });

  // Guardar apiUrl cuando el usuario la modifica
  document.getElementById('api-url').addEventListener('change', function() {
    state.apiUrl = this.value.trim() || DEFAULT_API_URL;
    saveState();
  });

  ['income-p1','income-p2','income-other','inv-goal','meta-name','emergency-months',
   'emergency-current','inv-profile','inv-real','inv-type','inv-yield'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => saveState());
  });
});
