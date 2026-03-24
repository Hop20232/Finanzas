/* =================================================
   TEMPLATES
================================================= */
function saveTemplate() {
  const name = document.getElementById('template-name').value.trim();
  if (!name) { toast('Escribí un nombre para el template', 'error'); return; }
  state.templates[name] = getCategoriesData();
  saveState();
  refreshTemplateSelector();
  document.getElementById('template-name').value = '';
  toast(`Template "${name}" guardado`, 'success');
}

function applyTemplate() {
  const sel = document.getElementById('template-selector');
  const name = sel.value;
  if (!name || !state.templates[name]) { toast('Seleccioná un template', 'error'); return; }
  if (!confirm(`¿Aplicar el template "${name}"? Se reemplazarán las categorías actuales.`)) return;
  rebuildCategoriesFromData(state.templates[name]);
  recalculate();
  toast(`Template "${name}" aplicado`, 'success');
}

function deleteTemplate() {
  const sel = document.getElementById('template-selector');
  const name = sel.value;
  if (!name) { toast('Seleccioná un template', 'error'); return; }
  if (!confirm(`¿Eliminar el template "${name}"?`)) return;
  delete state.templates[name];
  saveState();
  refreshTemplateSelector();
  toast(`Template "${name}" eliminado`, 'info');
}

function refreshTemplateSelector() {
  const sel = document.getElementById('template-selector');
  if (!sel) return;
  const keys = Object.keys(state.templates);
  sel.innerHTML = '<option value="">— Seleccionar template —</option>' +
    keys.map(k => `<option value="${escHtml(k)}">${escHtml(k)}</option>`).join('');
}

