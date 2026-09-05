/* =================================================
   EXPORT / IMPORT
================================================= */
function exportJSON() {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finanzas_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 1000);
  toast('Exportado correctamente', 'success');
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isValidMoney(value) {
  return typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)));
}

function validateImportedState(candidate) {
  if (!isPlainObject(candidate) || !isPlainObject(candidate.months)) return false;
  if (candidate.names !== undefined && !isPlainObject(candidate.names)) return false;
  if (candidate.currencies !== undefined && !isPlainObject(candidate.currencies)) return false;

  return Object.entries(candidate.months).every(([month, data]) => {
    if (!/^\d{4}-\d{2}$/.test(month) || !isPlainObject(data)) return false;
    if (data.categories !== undefined && !Array.isArray(data.categories)) return false;
    return (data.categories || []).every(category =>
      isPlainObject(category) &&
      typeof category.id === 'string' &&
      typeof category.name === 'string' &&
      Array.isArray(category.items) &&
      category.items.every(item =>
        isPlainObject(item) &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.currency === 'string' &&
        isValidMoney(item.amount)
      )
    );
  });
}

function normalizeImportedState(imported) {
  const next = createDefaultState();
  next.names = imported.names || next.names;
  next.currentMonth = typeof imported.currentMonth === 'string' ? imported.currentMonth : '';
  next.months = imported.months;
  next.currencies = { ...next.currencies, ...(imported.currencies || {}) };
  next.currencySources = isPlainObject(imported.currencySources) ? imported.currencySources : {};
  next.apiUrl = typeof imported.apiUrl === 'string' ? imported.apiUrl : DEFAULT_API_URL;
  next.expenseTypes = Array.isArray(imported.expenseTypes) ? imported.expenseTypes : [];
  next.invTypes = Array.isArray(imported.invTypes) ? imported.invTypes : [];
  next.templates = isPlainObject(imported.templates) ? imported.templates : {};
  return next;
}

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (!validateImportedState(imported)) throw new Error('Formato inválido');

      const previous = state;
      state = normalizeImportedState(imported);
      if (!saveState()) {
        state = previous;
        return;
      }
      initApp();
      toast('Importado correctamente', 'success');
    } catch (err) {
      toast('Error al importar: archivo inválido', 'error');
    }
  };

  reader.onerror = function() {
    toast('Error al leer el archivo.', 'error');
  };
  reader.readAsText(file);
  event.target.value = '';
}
