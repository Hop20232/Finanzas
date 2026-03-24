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

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (typeof imported !== 'object') throw new Error('Formato inválido');
      if (imported.names) state.names = imported.names;
      if (imported.months) state.months = imported.months;
      if (imported.currencies) state.currencies = { ...state.currencies, ...imported.currencies };
      if (imported.currencySources) state.currencySources = imported.currencySources;
      // Si el JSON importado no tiene apiUrl, mantener el default
      state.apiUrl = imported.apiUrl || DEFAULT_API_URL;
      if (Array.isArray(imported.expenseTypes)) state.expenseTypes = imported.expenseTypes;
      if (Array.isArray(imported.invTypes)) state.invTypes = imported.invTypes;
      if (imported.templates) state.templates = imported.templates;
      saveState();
      initUI();
      toast('Importado correctamente', 'success');
    } catch(err) {
      toast('Error al importar: archivo inválido', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

