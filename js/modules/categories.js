/* =================================================
   CATEGORÍAS – CONSTRUCCIÓN Y GESTIÓN
================================================= */
const DEFAULT_CATEGORIES = [
  {
    id: 'vivienda', name: 'Vivienda',
    items: [
      { id: uid(), name: 'Alquiler', type: 'Fijo', amount: 0, currency: 'ARS' },
      { id: uid(), name: 'Expensas', type: 'Fijo', amount: 0, currency: 'ARS' },
      { id: uid(), name: 'ABL', type: 'Fijo', amount: 0, currency: 'ARS' },
      { id: uid(), name: 'Garage', type: 'Fijo', amount: 0, currency: 'ARS' },
    ]
  },
  {
    id: 'servicios', name: 'Servicios',
    items: [
      { id: uid(), name: 'Luz', type: 'Variable', amount: 0, currency: 'ARS' },
      { id: uid(), name: 'Gas', type: 'Variable', amount: 0, currency: 'ARS' },
      { id: uid(), name: 'Internet', type: 'Fijo', amount: 0, currency: 'ARS' },
      { id: uid(), name: 'Streaming / Netflix', type: 'Fijo', amount: 0, currency: 'ARS' },
      { id: uid(), name: 'Agua / otros servicios', type: 'Variable', amount: 0, currency: 'ARS' },
    ]
  },
  {
    id: 'familia', name: 'Familia y Educación',
    items: [
      { id: uid(), name: 'Jardín / colonia', type: 'Fijo', amount: 0, currency: 'ARS' },
      { id: uid(), name: 'Gimnasia / fútbol', type: 'Fijo', amount: 0, currency: 'ARS' },
      { id: uid(), name: 'Prepaga / salud familiar', type: 'Fijo', amount: 0, currency: 'ARS' },
      { id: uid(), name: 'Otros gastos del niño', type: 'Variable', amount: 0, currency: 'ARS' },
    ]
  },
  {
    id: 'movilidad', name: 'Movilidad',
    items: [
      { id: uid(), name: 'Seguro auto', type: 'Fijo', amount: 0, currency: 'ARS' },
      { id: uid(), name: 'Patente', type: 'Fijo', amount: 0, currency: 'ARS' },
      { id: uid(), name: 'Service', type: 'Eventual', amount: 0, currency: 'ARS' },
      { id: uid(), name: 'VTV', type: 'Eventual', amount: 0, currency: 'ARS' },
      { id: uid(), name: 'Combustible / peajes', type: 'Variable', amount: 0, currency: 'ARS' },
    ]
  },
  {
    id: 'alimentos', name: 'Alimentos',
    items: [
      { id: uid(), name: 'Supermercado', type: 'Variable', amount: 0, currency: 'ARS' },
      { id: uid(), name: 'Verdulería', type: 'Variable', amount: 0, currency: 'ARS' },
      { id: uid(), name: 'Carnicería / pollo / pescado', type: 'Variable', amount: 0, currency: 'ARS' },
      { id: uid(), name: 'Lácteos y panadería', type: 'Variable', amount: 0, currency: 'ARS' },
      { id: uid(), name: 'Limpieza e higiene', type: 'Variable', amount: 0, currency: 'ARS' },
    ]
  },
  {
    id: 'ocio', name: 'Ocio',
    items: [
      { id: uid(), name: 'Salidas a comer', type: 'Variable', amount: 0, currency: 'ARS' },
      { id: uid(), name: 'Ocio extra / cine / café / planes', type: 'Variable', amount: 0, currency: 'ARS' },
    ]
  },
];

let categoryOpenState = {};

function uid() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function buildCategoryBlock(cat) {
  const isOpen = categoryOpenState[cat.id] !== false;
  const container = document.getElementById('categories-container');
  const block = document.createElement('div');
  block.className = 'category-block';
  block.dataset.catId = cat.id;
  block.innerHTML = buildCategoryBlockHTML(cat, isOpen);
  container.appendChild(block);
  attachCategoryListeners(block, cat.id);
}

function buildCategoryBlockHTML(cat, isOpen) {
  const totalARS = calcCategoryTotal(cat.items);
  const count = cat.items.length;
  return `
    <div class="category-header" data-cat-header="${cat.id}">
      <div class="category-header-left">
        <div class="category-toggle ${isOpen ? 'open' : ''}" data-cat-toggle="${cat.id}">▶</div>
        <span class="category-name">${escHtml(cat.name)}</span>
        <span class="badge badge-neutral">${count} ítem${count !== 1 ? 's' : ''}</span>
      </div>
      <div class="category-header-right">
        <span class="category-total">${fmtARS(totalARS)}</span>
        <button class="btn btn-ghost btn-xs" onclick="renameCategoryPrompt('${cat.id}')" title="Renombrar">✏️</button>
        <button class="btn btn-danger btn-xs" onclick="removeCategoryBlock('${cat.id}')" title="Eliminar categoría">✕</button>
      </div>
    </div>
    <div class="category-body ${isOpen ? 'open' : ''}" data-cat-body="${cat.id}">
      <div data-items-container="${cat.id}">
        ${cat.items.map(item => buildItemHTML(item)).join('')}
      </div>
      <div class="add-item-row">
        <button class="btn btn-success btn-sm" onclick="addItemToCategory('${cat.id}')">+ Agregar ítem</button>
      </div>
    </div>`;
}

function buildItemHTML(item) {
  return `
    <div class="expense-item" data-item-id="${item.id}">
      <input type="text" placeholder="Nombre del gasto" value="${escHtml(item.name)}"
        data-field="name" onchange="onItemFieldChange(this)" />
      <input type="text" placeholder="Tipo de gasto" value="${escHtml(item.type)}"
        list="expense-type-list" data-field="type"
        onchange="onItemTypeChange(this)" oninput="onItemTypeChange(this)" />
      <input type="number" placeholder="0" value="${item.amount || ''}"
        min="0" data-field="amount" onchange="onItemFieldChange(this)" oninput="onItemFieldChange(this)" />
      <select data-field="currency" onchange="onItemFieldChange(this)">
        ${['ARS','USD','EUR','BRL','UYU','CLP'].map(c =>
          `<option value="${c}" ${item.currency === c ? 'selected' : ''}>${c}</option>`
        ).join('')}
      </select>
      <button class="btn btn-danger btn-xs del-btn" onclick="removeItem(this)" title="Eliminar">✕</button>
    </div>`;
}

function attachCategoryListeners(block, catId) {
  const header = block.querySelector(`[data-cat-header="${catId}"]`);
  const body = block.querySelector(`[data-cat-body="${catId}"]`);
  const toggle = block.querySelector(`[data-cat-toggle="${catId}"]`);
  header.addEventListener('click', function(e) {
    if (e.target.closest('button') || e.target.tagName === 'BUTTON') return;
    const isOpen = body.classList.contains('open');
    if (isOpen) {
      body.classList.remove('open');
      toggle.classList.remove('open');
      categoryOpenState[catId] = false;
    } else {
      body.classList.add('open');
      toggle.classList.add('open');
      categoryOpenState[catId] = true;
    }
  });
}

function onItemFieldChange(el) {
  updateCategoryTotals();
  recalculate();
}

function onItemTypeChange(el) {
  const val = el.value.trim();
  if (val && !state.expenseTypes.includes(val)) {
    state.expenseTypes.push(val);
    saveState();
    refreshExpenseTypeDatalist();
  }
  updateCategoryTotals();
  recalculate();
}

function refreshExpenseTypeDatalist() {
  const dl = document.getElementById('expense-type-list');
  if (!dl) return;
  dl.innerHTML = state.expenseTypes.map(t => `<option value="${escHtml(t)}"></option>`).join('');
}

function refreshInvTypeDatalist() {
  const dl = document.getElementById('inv-type-list');
  if (!dl) return;
  dl.innerHTML = state.invTypes.map(t => `<option value="${escHtml(t)}"></option>`).join('');
}

function addItemToCategory(catId) {
  const container = document.querySelector(`[data-items-container="${catId}"]`);
  if (!container) return;
  const item = { id: uid(), name: '', type: '', amount: 0, currency: 'ARS' };
  const div = document.createElement('div');
  div.innerHTML = buildItemHTML(item);
  container.appendChild(div.firstElementChild);
  const inputs = container.querySelectorAll('.expense-item:last-child input[data-field="name"]');
  if (inputs.length) inputs[0].focus();
  updateCategoryTotals();
  recalculate();
}

function removeItem(btn) {
  const item = btn.closest('.expense-item');
  if (item) {
    item.remove();
    updateCategoryTotals();
    recalculate();
  }
}

function addCategory() {
  const name = prompt('Nombre de la nueva categoría:');
  if (!name || !name.trim()) return;
  const cat = { id: 'cat_' + uid(), name: name.trim(), items: [] };
  categoryOpenState[cat.id] = true;
  buildCategoryBlock(cat);
  recalculate();
}

function removeCategoryBlock(catId) {
  if (!confirm('¿Eliminar esta categoría y todos sus ítems?')) return;
  const block = document.querySelector(`[data-cat-id="${catId}"]`);
  if (block) block.remove();
  recalculate();
}

function renameCategoryPrompt(catId) {
  const block = document.querySelector(`[data-cat-id="${catId}"]`);
  if (!block) return;
  const nameEl = block.querySelector('.category-name');
  const current = nameEl ? nameEl.textContent : '';
  const newName = prompt('Nuevo nombre:', current);
  if (!newName || !newName.trim()) return;
  if (nameEl) nameEl.textContent = newName.trim();
}

function expandAllCategories() {
  document.querySelectorAll('.category-body').forEach(b => {
    b.classList.add('open');
    categoryOpenState[b.dataset.catBody] = true;
  });
  document.querySelectorAll('.category-toggle').forEach(t => t.classList.add('open'));
}

function collapseAllCategories() {
  document.querySelectorAll('.category-body').forEach(b => {
    b.classList.remove('open');
    categoryOpenState[b.dataset.catBody] = false;
  });
  document.querySelectorAll('.category-toggle').forEach(t => t.classList.remove('open'));
}

function getCategoriesData() {
  const cats = [];
  document.querySelectorAll('#categories-container .category-block').forEach(block => {
    const catId = block.dataset.catId;
    const nameEl = block.querySelector('.category-name');
    const name = nameEl ? nameEl.textContent.trim() : '';
    const items = [];
    block.querySelectorAll('.expense-item').forEach(row => {
      const nameInput = row.querySelector('input[data-field="name"]');
      const typeInput = row.querySelector('input[data-field="type"]');
      const amtInput = row.querySelector('input[data-field="amount"]');
      const curSelect = row.querySelector('select[data-field="currency"]');
      items.push({
        id: row.dataset.itemId || uid(),
        name: nameInput ? nameInput.value : '',
        type: typeInput ? typeInput.value : '',
        amount: amtInput ? (parseFloat(amtInput.value) || 0) : 0,
        currency: curSelect ? curSelect.value : 'ARS'
      });
    });
    cats.push({ id: catId, name, open: categoryOpenState[catId] !== false, items });
  });
  return cats;
}

function rebuildCategoriesFromData(cats) {
  const container = document.getElementById('categories-container');
  container.innerHTML = '';
  categoryOpenState = {};
  cats.forEach(cat => {
    categoryOpenState[cat.id] = cat.open !== false;
    buildCategoryBlock(cat);
  });
  updateCategoryTotals();
}

function calcItemARS(item) {
  const amount = parseFloat(item.amount) || 0;
  if (item.currency === 'ARS') return amount;
  const rate = state.currencies[item.currency] || 1;
  return amount * rate;
}

function calcCategoryTotal(items) {
  return items.reduce((sum, item) => sum + calcItemARS(item), 0);
}

function calcCategoryTotalFromDOM(block) {
  let total = 0;
  block.querySelectorAll('.expense-item').forEach(row => {
    const amt = parseFloat(row.querySelector('input[data-field="amount"]')?.value) || 0;
    const cur = row.querySelector('select[data-field="currency"]')?.value || 'ARS';
    const rate = cur === 'ARS' ? 1 : (state.currencies[cur] || 1);
    total += amt * rate;
  });
  return total;
}

function updateCategoryTotals() {
  document.querySelectorAll('#categories-container .category-block').forEach(block => {
    const total = calcCategoryTotalFromDOM(block);
    const totalEl = block.querySelector('.category-total');
    if (totalEl) totalEl.textContent = fmtARS(total);
    const count = block.querySelectorAll('.expense-item').length;
    const badgeEl = block.querySelector('.badge-neutral');
    if (badgeEl) badgeEl.textContent = `${count} ítem${count !== 1 ? 's' : ''}`;
  });
}

