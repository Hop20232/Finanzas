/* =================================================
   ESTADO GLOBAL
   apiUrl arranca con el endpoint de exchangerate-api
   como valor por defecto
================================================= */
const APP_KEY_LEGACY = 'finanzasFamiliares_v4';

const DEFAULT_API_URL = 'https://api.exchangerate-api.com/v4/latest/ARS';

function createDefaultState() {
  return {
    names: { p1: 'Persona 1', p2: 'Persona 2' },
    currentMonth: '',
    months: {},
    currencies: { USD: 1050, EUR: 1150, BRL: 200, UYU: 26, CLP: 1.1 },
    currencySources: {},
    apiUrl: DEFAULT_API_URL,
    expenseTypes: [],
    invTypes: [],
    templates: {},
  };
}

let state = createDefaultState();

/* =================================================
   PERSISTENCIA
================================================= */
async function loadState() {
  const appScopedKey = (typeof getActiveDataStorageKey === 'function')
    ? getActiveDataStorageKey()
    : 'finanzasFamiliares_v6::public';

  // Nunca se mezcla el estado previo con otro espacio.
  state = createDefaultState();

  try {
    const scopedRaw = localStorage.getItem(appScopedKey);
    if (!scopedRaw) return true;
    const saved = JSON.parse(scopedRaw);
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
      throw new Error('El estado guardado no tiene un formato válido.');
    }
    if (saved.names && typeof saved.names === 'object') state.names = saved.names;
    if (typeof saved.currentMonth === 'string') state.currentMonth = saved.currentMonth;
    if (saved.months && typeof saved.months === 'object' && !Array.isArray(saved.months)) state.months = saved.months;
    if (saved.currencies && typeof saved.currencies === 'object' && !Array.isArray(saved.currencies)) state.currencies = { ...state.currencies, ...saved.currencies };
    if (saved.currencySources && typeof saved.currencySources === 'object') state.currencySources = saved.currencySources;
    if (typeof saved.apiUrl === 'string') state.apiUrl = saved.apiUrl;
    if (Array.isArray(saved.expenseTypes)) state.expenseTypes = saved.expenseTypes;
    if (Array.isArray(saved.invTypes)) state.invTypes = saved.invTypes;
    if (saved.templates && typeof saved.templates === 'object') state.templates = saved.templates;
    return true;
  } catch (e) {
    console.warn('Error cargando estado:', e);
    toast('No se pudo cargar este espacio. Se abrió un estado vacío.', 'error');
    return false;
  }
}

function saveState() {
  const snapshot = JSON.parse(JSON.stringify(state));
  const appScopedKey = (typeof getActiveDataStorageKey === 'function')
    ? getActiveDataStorageKey()
    : 'finanzasFamiliares_v6::public';
  try {
    localStorage.setItem(appScopedKey, JSON.stringify(snapshot));
    return true;
  } catch (e) {
    console.warn('Error guardando estado:', e);
    toast('No se pudieron guardar los cambios. Verificá el almacenamiento del navegador.', 'error');
    return false;
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
  if (!saveState()) return;
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
  const deleted = state.months[m];
  delete state.months[m];
  if (!saveState()) {
    state.months[m] = deleted;
    return;
  }
  updateCompareSelectors();
  refreshDashboards();
  toast('Mes eliminado', 'info');
}
