/* =================================================
   ESTADO GLOBAL
   apiUrl arranca con el endpoint de exchangerate-api
   como valor por defecto
================================================= */
const APP_KEY_LEGACY = 'finanzasFamiliares_v4';
const APP_KEY_ENCRYPTED = 'finanzasFamiliares_v5_enc';

const DEFAULT_API_URL = 'https://api.exchangerate-api.com/v4/latest/ARS';

let state = {
  names: { p1: 'Persona 1', p2: 'Persona 2' },
  currentMonth: '',
  months: {},
  currencies: {
    USD: 1050,
    EUR: 1150,
    BRL: 200,
    UYU: 26,
    CLP: 1.1
  },
  currencySources: {},
  apiUrl: DEFAULT_API_URL,   // ← default precargado
  expenseTypes: [],
  invTypes: [],
  templates: {},
};

/* =================================================
   PERSISTENCIA
================================================= */
async function loadState() {
  try {
    let saved = null;

    if (typeof decryptAppState === 'function') {
      saved = await decryptAppState();
    }

    // fallback legacy (solo para recuperación, auth.js migra a cifrado)
    if (!saved) {
      const legacyRaw = localStorage.getItem(APP_KEY_LEGACY);
      if (legacyRaw) saved = JSON.parse(legacyRaw);
    }

    if (saved) {
      if (saved.names) state.names = saved.names;
      if (saved.months) state.months = saved.months;
      if (saved.currencies) state.currencies = { ...state.currencies, ...saved.currencies };
      if (saved.currencySources) state.currencySources = saved.currencySources;
      if (saved.apiUrl) state.apiUrl = saved.apiUrl;
      if (Array.isArray(saved.expenseTypes)) state.expenseTypes = saved.expenseTypes;
      if (Array.isArray(saved.invTypes)) state.invTypes = saved.invTypes;
      if (saved.templates) state.templates = saved.templates;
    }
  } catch (e) {
    console.warn('Error cargando estado:', e);
  }
}

function saveState() {
  const snapshot = JSON.parse(JSON.stringify(state));

  if (typeof encryptAndStoreAppState === 'function') {
    encryptAndStoreAppState(snapshot).catch(e => console.warn('Error guardando estado cifrado:', e));
    return;
  }

  // fallback no ideal
  try {
    localStorage.setItem(APP_KEY_LEGACY, JSON.stringify(snapshot));
  } catch (e) {
    console.warn('Error guardando estado legacy:', e);
  }
}

/* =================================================
   DATOS DEL MES ACTUAL (DESDE FORMULARIO)
================================================= */
function getCurrentMonthData() {
  return {
    month: state.currentMonth,
    names: { ...state.names },
    incomeP1: parseFloat(document.getElementById('income-p1').value) || 0,
    incomeP2: parseFloat(document.getElementById('income-p2').value) || 0,
    incomeOther: parseFloat(document.getElementById('income-other').value) || 0,
    invGoal: parseFloat(document.getElementById('inv-goal').value) || 0,
    metaName: document.getElementById('meta-name').value,
    emergencyMonths: parseFloat(document.getElementById('emergency-months').value) || 6,
    emergencyCurrent: parseFloat(document.getElementById('emergency-current').value) || 0,
    invProfile: document.getElementById('inv-profile').value,
    invReal: parseFloat(document.getElementById('inv-real').value) || 0,
    invType: document.getElementById('inv-type').value,
    invYield: parseFloat(document.getElementById('inv-yield').value) || 0,
    categories: getCategoriesData()
  };
}

function applyMonthDataToForm(data) {
  if (!data) return;
  setVal('income-p1', data.incomeP1 || '');
  setVal('income-p2', data.incomeP2 || '');
  setVal('income-other', data.incomeOther || '');
  setVal('inv-goal', data.invGoal || '');
  setVal('meta-name', data.metaName || '');
  setVal('emergency-months', data.emergencyMonths || 6);
  setVal('emergency-current', data.emergencyCurrent || '');
  setVal('inv-profile', data.invProfile || 'moderado');
  setVal('inv-real', data.invReal || '');
  setVal('inv-type', data.invType || '');
  setVal('inv-yield', data.invYield || '');
  if (data.categories) {
    rebuildCategoriesFromData(data.categories);
  }
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

/* =================================================
   GUARDAR / CARGAR MES
================================================= */
function saveMonth() {
  const m = state.currentMonth;
  if (!m) { toast('Seleccioná un mes primero', 'error'); return; }
  state.months[m] = getCurrentMonthData();
  const invType = document.getElementById('inv-type').value.trim();
  if (invType && !state.invTypes.includes(invType)) {
    state.invTypes.push(invType);
  }
  saveState();
  toast('Mes guardado ✔', 'success');
  updateCompareSelectors();
  refreshDashboards();
}

function loadMonthData() {
  const m = state.currentMonth;
  if (!m) { toast('Seleccioná un mes', 'error'); return; }
  const data = state.months[m];
  if (!data) { toast('No hay datos guardados para ese mes', 'info'); return; }
  applyMonthDataToForm(data);
  recalculate();
  toast('Mes cargado', 'success');
}

function deleteCurrentMonth() {
  const m = state.currentMonth;
  if (!m) return;
  if (!state.months[m]) { toast('No hay datos guardados para ese mes', 'info'); return; }
  if (!confirm(`¿Eliminar los datos de ${m}?`)) return;
  delete state.months[m];
  saveState();
  updateCompareSelectors();
  refreshDashboards();
  toast('Mes eliminado', 'info');
}

