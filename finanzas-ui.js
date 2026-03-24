import { exportJSON, loadState, saveState } from './finanzas-db.js';
import { DEFAULT_API_URL, DEFAULT_CATEGORIES, escHtml, fmtARS, normKey, uid } from './finanzas-helpers.js';

let state = loadState();
let categoryOpenState = {};
let charts = {};

export function initFinanzasApp(root) {
  root.innerHTML = buildLayout();
  bindGlobalFns();
  bindListeners();
  initUI();
}

function buildLayout() {
  return `
<header id="app-header">
  <div class="header-inner">
    <div style="display:flex;flex-direction:column;gap:2px;">
      <h1>💰 FinanzasFamiliares <span id="header-month-label"></span></h1>
      <div class="persona-names">
        <label>P1:</label><input type="text" id="name-p1" placeholder="Persona 1" maxlength="20" />
        <label>P2:</label><input type="text" id="name-p2" placeholder="Persona 2" maxlength="20" />
      </div>
    </div>
    <nav class="main-nav">
      <button id="tab-carga" class="active" onclick="switchView('carga')">📋 Carga Mensual</button>
      <button id="tab-dash" onclick="switchView('dashboard')">📊 Dashboards</button>
    </nav>
    <div class="header-actions">
      <button onclick="triggerExport()">⬇️ Exportar</button>
      <button onclick="document.getElementById('import-file').click()">⬆️ Importar</button>
      <input type="file" id="import-file" accept=".json" style="display:none" />
    </div>
    <div class="user-admin-panel">
      <span id="current-user-badge" class="user-badge">No autenticado</span>
      <button id="logout-btn" style="display:none">Salir</button>
      <button id="admin-open-btn" style="display:none">Admin</button>
    </div>
  </div>
</header>
<div id="app-content">${documentBodyContent()}</div>
<div id="toast-container"></div>
<div id="login-overlay" class="login-overlay" style="display:none;">${loginMarkup()}</div>
`;
}

function documentBodyContent() {
  const full = document.querySelector('#app-source-template')?.innerHTML;
  if (full) return full;
  return `
  <div id="view-carga" class="view active"></div>
  <div id="view-dashboard" class="view"></div>`;
}

function loginMarkup() {
  return `<div class="login-card">
  <h2>Acceso con Google + aprobación</h2>
  <p>Ingresá con Google (simulado por email). El administrador debe aprobarte para acceso total.</p>
  <div class="grid-2">
    <div>
      <div class="form-group"><label>Email Google</label><input type="text" id="login-google-email" placeholder="nombre@gmail.com"></div>
      <button class="btn btn-primary" id="google-login-btn">Entrar con Google</button>
    </div>
    <div>
      <div class="form-group"><label>Usuario admin</label><input type="text" id="admin-user" placeholder="rcordoba"></div>
      <div class="form-group"><label>Password admin</label><input type="password" id="admin-pass" placeholder="Hop202420"></div>
      <button class="btn btn-success" id="admin-login-btn">Ingresar como admin</button>
    </div>
  </div>
  <div id="login-msg" class="text-muted mt-1">—</div>
</div>`;
}

function injectMainTemplate() {
  const carga = document.getElementById('view-carga');
  const dash = document.getElementById('view-dashboard');
  if (!carga || carga.children.length) return;

  carga.innerHTML = `
    <div class="month-selector-row"><label>📅 Mes de trabajo:</label><input type="month" id="current-month" style="width:auto;" />
      <button class="btn btn-primary btn-sm" onclick="saveMonth()">💾 Guardar mes</button>
      <button class="btn btn-ghost btn-sm" onclick="loadMonthData()">📂 Cargar mes</button>
      <button class="btn btn-ghost btn-sm" onclick="deleteCurrentMonth()">🗑️ Eliminar mes</button></div>
    <div class="grid-2"><div class="card"><div class="card-header"><h3><span class="icon">💵</span> Ingresos</h3></div><div class="card-body">
      <div class="form-group"><label id="label-p1">Ingreso Persona 1</label><div class="inline-flex"><input type="number" id="income-p1" min="0" oninput="recalculate()" /><span class="text-muted">ARS</span></div></div>
      <div class="form-group"><label id="label-p2">Ingreso Persona 2</label><div class="inline-flex"><input type="number" id="income-p2" min="0" oninput="recalculate()" /><span class="text-muted">ARS</span></div></div>
      <div class="form-group"><label>Otros ingresos del hogar</label><div class="inline-flex"><input type="number" id="income-other" min="0" oninput="recalculate()" /><span class="text-muted">ARS</span></div></div>
      <hr class="separator" /><div class="inline-flex" style="justify-content:space-between;"><span class="text-muted">Ingreso total</span><span class="fw-bold color-primary" id="total-income-display">$ 0</span></div>
    </div></div>
    <div class="card"><div class="card-header"><h3><span class="icon">🎯</span> Objetivos</h3></div><div class="card-body">
      <div class="form-group"><label>Objetivo mínimo de inversión mensual (ARS)</label><input type="number" id="inv-goal" min="0" oninput="recalculate()" /></div>
      <div class="form-group"><label>Nombre de meta principal</label><input type="text" id="meta-name" /></div>
      <div class="form-group"><label>Meses objetivo para fondo de emergencia</label><input type="number" id="emergency-months" min="1" max="24" oninput="recalculate()" /></div>
      <div class="form-group"><label>Fondo de emergencia actual acumulado (ARS)</label><input type="number" id="emergency-current" min="0" oninput="recalculate()" /></div>
      <div class="form-group"><label>Perfil de inversión</label><select id="inv-profile" onchange="recalculate()"><option value="conservador">Conservador</option><option value="moderado" selected>Moderado</option><option value="agresivo">Agresivo</option></select></div>
    </div></div></div>
    <div class="card"><div class="card-header"><h3><span class="icon">💱</span> Cotización de Monedas</h3><div id="currency-status-badge" class="currency-status manual">⚡ Manual</div></div><div class="card-body">
      <div class="grid-2"><div><div class="form-group"><label>Moneda a configurar</label><select id="currency-selector"><option value="USD">USD – Dólar</option><option value="EUR">EUR – Euro</option><option value="BRL">BRL – Real Brasileño</option><option value="UYU">UYU – Peso Uruguayo</option><option value="CLP">CLP – Peso Chileno</option></select></div>
      <div class="form-group"><label>Cotización manual (ARS por 1 unidad)</label><div class="inline-flex"><input type="number" id="currency-manual-rate" min="0" /><button class="btn btn-primary btn-sm" onclick="saveManualRate()">Guardar</button></div></div></div>
      <div><div class="form-group"><label>URL de API de cotización</label><input type="text" id="api-url" value="${DEFAULT_API_URL}" /></div><div class="form-group mt-1"><button class="btn btn-ghost btn-sm" onclick="fetchRateFromAPI()">🌐 Consultar por API</button><p class="text-muted mt-1" id="api-status-msg">—</p></div></div></div>
      <div class="currency-rate-grid" id="currency-rate-grid"></div></div></div>
    <div class="card"><div class="card-header"><h3><span class="icon">📈</span> Cierre Real de Inversión del Mes</h3></div><div class="card-body"><div class="grid-3"><div class="form-group"><label>Monto realmente invertido (ARS)</label><input type="number" id="inv-real" min="0" oninput="recalculate()" /></div><div class="form-group"><label>Tipo de inversión</label><input type="text" id="inv-type" list="inv-type-list" /><datalist id="inv-type-list"></datalist></div><div class="form-group"><label>Rendimiento estimado %</label><input type="number" id="inv-yield" step="0.1" min="0" /></div></div></div></div>
    <div class="card"><div class="card-header"><h3><span class="icon">📋</span> Templates de Gastos</h3></div><div class="card-body"><div class="inline-flex"><input type="text" id="template-name" style="flex:1;max-width:240px;" /><button class="btn btn-primary btn-sm" onclick="saveTemplate()">💾 Guardar template</button><select id="template-selector" style="flex:1;max-width:220px;"></select><button class="btn btn-success btn-sm" onclick="applyTemplate()">▶ Aplicar</button><button class="btn btn-danger btn-sm" onclick="deleteTemplate()">🗑️ Borrar</button></div></div></div>
    <div class="card"><div class="card-header"><h3><span class="icon">🧾</span> Gastos por Categoría</h3><div class="inline-flex"><button class="btn btn-ghost btn-sm" onclick="expandAllCategories()">⊞ Expandir todo</button><button class="btn btn-ghost btn-sm" onclick="collapseAllCategories()">⊟ Colapsar todo</button><button class="btn btn-primary btn-sm" onclick="addCategory()">+ Categoría</button></div></div><div class="card-body"><datalist id="expense-type-list"></datalist><div id="categories-container"></div><div class="inline-flex" style="justify-content:flex-end;margin-top:0.5rem;"><span class="text-muted">Total gastos:</span><span class="fw-bold color-danger" id="total-expenses-display" style="font-size:1.1rem;">$ 0</span></div></div></div>
    <div class="card"><div class="card-header"><h3><span class="icon">📊</span> Resumen del Mes</h3></div><div class="card-body"><div class="grid-4" id="summary-stats"></div><hr class="separator" /><h4 style="font-size:0.88rem;color:var(--neutral-600);margin-bottom:0.75rem;text-transform:uppercase;letter-spacing:0.4px;">Resumen por categoría</h4><div class="cat-summary-grid" id="summary-categories"></div><hr class="separator" /><div id="profile-display"></div></div></div>
    <div class="card"><div class="card-header"><h3><span class="icon">💡</span> Sugerencias Automáticas</h3></div><div class="card-body"><div class="suggestion-list" id="suggestions-list"></div></div></div>
    <div class="card" id="admin-users" style="display:none"><div class="card-header"><h3><span class="icon">🔐</span> Aprobación de Usuarios</h3></div><div class="card-body"><div id="admin-users-table"></div></div></div>
  `;

  dash.innerHTML = `<div class="dash-tabs"><button class="dash-tab active" onclick="switchDashTab('general',this)">📈 General</button><button class="dash-tab" onclick="switchDashTab('gastos',this)">🧾 Gastos</button><button class="dash-tab" onclick="switchDashTab('inversion',this)">💎 Inversión</button></div><div id="dash-general" class="dash-panel active"><div class="grid-2"><div class="chart-wrap"><h4>Evolución Mensual — Ingresos, Gastos, Disponible, Inversión</h4><div class="chart-container"><canvas id="chart-evolucion"></canvas></div></div><div class="chart-wrap"><h4>Distribución por Categorías (mes actual)</h4><div class="chart-container" style="min-height:220px;"><canvas id="chart-doughnut"></canvas></div></div></div></div><div id="dash-gastos" class="dash-panel"><div class="card"><div class="card-header"><h3><span class="icon">📉</span> Insights de Gastos</h3></div><div class="card-body"><div id="insights-gastos" class="suggestion-list"></div></div></div><div class="card"><div class="card-header"><h3><span class="icon">🗺️</span> Mejor Camino Sugerido</h3></div><div class="card-body"><div id="mejor-camino" style="line-height:1.7;color:var(--neutral-700);"></div></div></div></div><div id="dash-inversion" class="dash-panel"><div class="chart-wrap"><h4>Inversión Teórica vs Real por Mes</h4><div class="chart-container"><canvas id="chart-inversion"></canvas></div></div><div class="card"><div class="card-header"><h3><span class="icon">📋</span> Historial de Cierres Reales</h3></div><div class="card-body"><div id="inv-history-table"></div></div></div></div>`;
}

function bindListeners() {
  document.getElementById('import-file').addEventListener('change', onImportJSON);
}

function bindGlobalFns() {
  Object.assign(window, {
    switchView, saveMonth, loadMonthData, deleteCurrentMonth, recalculate,
    saveManualRate, fetchRateFromAPI, saveTemplate, applyTemplate, deleteTemplate,
    expandAllCategories, collapseAllCategories, addCategory, switchDashTab,
    triggerExport: () => exportJSON(state),
  });
}

function initUI() {
  injectMainTemplate();
  wireAuth();
  document.getElementById('name-p1').value = state.names.p1;
  document.getElementById('name-p2').value = state.names.p2;
  updatePersonaLabels();
  if (!state.currentMonth) state.currentMonth = new Date().toISOString().slice(0, 7);
  document.getElementById('current-month').value = state.currentMonth;
  document.getElementById('header-month-label').textContent = state.currentMonth;
  document.getElementById('api-url').value = state.apiUrl || DEFAULT_API_URL;
  refreshTemplateSelector();
  refreshInvTypeDatalist();
  refreshExpenseTypeDatalist();
  renderCurrencyRateGrid();
  loadCurrentMonthOrDefault();
  attachPersistentListeners();
  recalculate();
}

function wireAuth() {
  const overlay = document.getElementById('login-overlay');
  const badge = document.getElementById('current-user-badge');
  const adminBtn = document.getElementById('admin-open-btn');
  const logoutBtn = document.getElementById('logout-btn');

  const current = state.auth.currentUser;
  if (!current || (!current.isAdmin && !current.approved)) overlay.style.display = 'flex';
  else overlay.style.display = 'none';

  if (!current) badge.textContent = 'No autenticado';
  else if (current.isAdmin) badge.textContent = `Admin: ${current.email || current.username}`;
  else badge.textContent = `${current.email} ${current.approved ? '✅' : '⏳'}`;

  adminBtn.style.display = current?.isAdmin ? 'inline-flex' : 'none';
  logoutBtn.style.display = current ? 'inline-flex' : 'none';
  document.getElementById('admin-users').style.display = current?.isAdmin ? 'block' : 'none';

  adminBtn.onclick = renderAdminUsers;
  logoutBtn.onclick = () => { state.auth.currentUser = null; persist(); wireAuth(); };
  document.getElementById('google-login-btn').onclick = loginGoogle;
  document.getElementById('admin-login-btn').onclick = loginAdmin;
  if (current?.isAdmin) renderAdminUsers();
}

function loginGoogle() {
  const email = (document.getElementById('login-google-email').value || '').trim().toLowerCase();
  if (!email.includes('@')) return setLoginMsg('Email inválido');
  const entry = state.auth.users[email] || { approved: false, fullAccess: false };
  state.auth.users[email] = entry;
  state.auth.currentUser = { email, isAdmin: false, approved: entry.approved, fullAccess: entry.fullAccess };
  persist();
  setLoginMsg(entry.approved ? 'Acceso concedido.' : 'Solicitud enviada. Esperando aprobación admin.');
  wireAuth();
}

function loginAdmin() {
  const user = document.getElementById('admin-user').value.trim();
  const pass = document.getElementById('admin-pass').value;
  if (user === state.auth.admin.user && pass === state.auth.admin.pass) {
    state.auth.currentUser = { username: user, email: user, isAdmin: true, approved: true, fullAccess: true };
    persist();
    setLoginMsg('Admin autenticado');
    wireAuth();
  } else setLoginMsg('Credenciales admin incorrectas');
}

function setLoginMsg(msg) { document.getElementById('login-msg').textContent = msg; }
function persist() { saveState(state); }
function toast(msg, type='info'){const c=document.getElementById('toast-container');const t=document.createElement('div');t.className=`toast ${type}`;t.textContent=msg;c.appendChild(t);setTimeout(()=>{t.remove();},3000);}

function renderAdminUsers() {
  const el = document.getElementById('admin-users-table');
  const rows = Object.entries(state.auth.users);
  if (!rows.length) return (el.innerHTML = '<p class="text-muted">Sin solicitudes.</p>');
  el.innerHTML = `<table><thead><tr><th>Email</th><th>Aprobado</th><th>Full</th><th>Acción</th></tr></thead><tbody>${rows.map(([email, u]) => `<tr><td>${escHtml(email)}</td><td>${u.approved?'Sí':'No'}</td><td>${u.fullAccess?'Sí':'No'}</td><td><button class="btn btn-success btn-xs" data-approve="${escHtml(email)}">Aprobar+Full</button></td></tr>`).join('')}</tbody></table>`;
  el.querySelectorAll('[data-approve]').forEach((btn) => {
    btn.onclick = () => {
      const email = btn.dataset.approve;
      state.auth.users[email] = { approved: true, fullAccess: true };
      persist();
      renderAdminUsers();
      toast(`Usuario ${email} aprobado con permisos full`, 'success');
    };
  });
}

function attachPersistentListeners() {
  ['name-p1','name-p2'].forEach((id)=>document.getElementById(id).addEventListener('input',()=>{state.names.p1=document.getElementById('name-p1').value||'Persona 1';state.names.p2=document.getElementById('name-p2').value||'Persona 2';updatePersonaLabels();persist();}));
  document.getElementById('current-month').addEventListener('change', (e) => { state.currentMonth = e.target.value; loadCurrentMonthOrDefault(); persist(); });
}

function updatePersonaLabels(){document.getElementById('label-p1').textContent=`Ingreso ${state.names.p1||'Persona 1'}`;document.getElementById('label-p2').textContent=`Ingreso ${state.names.p2||'Persona 2'}`;}
function loadCurrentMonthOrDefault(){document.getElementById('header-month-label').textContent=state.currentMonth;const d=state.months[state.currentMonth];if(d){applyMonthDataToForm(d);rebuildCategoriesFromData(d.categories||[]);}else{rebuildCategoriesFromData(DEFAULT_CATEGORIES.map((c)=>({...c,open:true,items:c.items.map((i)=>({...i,id:uid()}))})));}}
function saveMonth(){state.months[state.currentMonth]=getCurrentMonthData();persist();toast('Mes guardado ✔','success');}
function loadMonthData(){loadCurrentMonthOrDefault();recalculate();}
function deleteCurrentMonth(){delete state.months[state.currentMonth];persist();toast('Mes eliminado','info');loadCurrentMonthOrDefault();recalculate();}
function getCurrentMonthData(){return{month:state.currentMonth,names:{...state.names},incomeP1:num('income-p1'),incomeP2:num('income-p2'),incomeOther:num('income-other'),invGoal:num('inv-goal'),metaName:val('meta-name'),emergencyMonths:num('emergency-months')||6,emergencyCurrent:num('emergency-current'),invProfile:val('inv-profile'),invReal:num('inv-real'),invType:val('inv-type'),invYield:num('inv-yield'),categories:getCategoriesData()};}
function applyMonthDataToForm(d){setVal('income-p1',d.incomeP1||'');setVal('income-p2',d.incomeP2||'');setVal('income-other',d.incomeOther||'');setVal('inv-goal',d.invGoal||'');setVal('meta-name',d.metaName||'');setVal('emergency-months',d.emergencyMonths||6);setVal('emergency-current',d.emergencyCurrent||'');setVal('inv-profile',d.invProfile||'moderado');setVal('inv-real',d.invReal||'');setVal('inv-type',d.invType||'');setVal('inv-yield',d.invYield||'');}
function val(id){return document.getElementById(id)?.value||'';} function num(id){return parseFloat(val(id))||0;} function setVal(id,v){const e=document.getElementById(id);if(e)e.value=v;}

function buildCategoryBlock(cat){const isOpen=categoryOpenState[cat.id]!==false;const c=document.getElementById('categories-container');const b=document.createElement('div');b.className='category-block';b.dataset.catId=cat.id;b.innerHTML=`<div class="category-header" data-cat-header="${cat.id}"><div class="category-header-left"><div class="category-toggle ${isOpen?'open':''}" data-cat-toggle="${cat.id}">▶</div><span class="category-name">${escHtml(cat.name)}</span><span class="badge badge-neutral">${cat.items.length} ítems</span></div><div class="category-header-right"><span class="category-total">${fmtARS(calcCategoryTotal(cat.items))}</span></div></div><div class="category-body ${isOpen?'open':''}" data-cat-body="${cat.id}"><div data-items-container="${cat.id}">${cat.items.map(buildItemHTML).join('')}</div><div class="add-item-row"><button class="btn btn-success btn-sm" data-add="${cat.id}">+ Agregar ítem</button></div></div>`;c.appendChild(b);b.querySelector(`[data-add='${cat.id}']`).onclick=()=>addItemToCategory(cat.id);attachCategoryListeners(b,cat.id);} 
function buildItemHTML(i){return`<div class="expense-item" data-item-id="${i.id}"><input type="text" data-field="name" value="${escHtml(i.name)}" onchange="recalculate()"/><input type="text" data-field="type" value="${escHtml(i.type)}" list="expense-type-list" onchange="recalculate()"/><input type="number" data-field="amount" value="${i.amount||''}" min="0" onchange="recalculate()"/><select data-field="currency" onchange="recalculate()">${['ARS','USD','EUR','BRL','UYU','CLP'].map(c=>`<option ${i.currency===c?'selected':''}>${c}</option>`).join('')}</select><button class="btn btn-danger btn-xs del-btn" onclick="this.closest('.expense-item').remove();recalculate()">✕</button></div>`;}
function attachCategoryListeners(block,id){const h=block.querySelector(`[data-cat-header='${id}']`);const b=block.querySelector(`[data-cat-body='${id}']`);const t=block.querySelector(`[data-cat-toggle='${id}']`);h.onclick=(e)=>{if(e.target.closest('button'))return;b.classList.toggle('open');t.classList.toggle('open');categoryOpenState[id]=b.classList.contains('open');};}
function addCategory(){const name=prompt('Nombre de la nueva categoría:');if(!name)return;const cat={id:'cat_'+uid(),name,items:[]};categoryOpenState[cat.id]=true;buildCategoryBlock(cat);recalculate();}
function addItemToCategory(catId){const c=document.querySelector(`[data-items-container='${catId}']`);const w=document.createElement('div');w.innerHTML=buildItemHTML({id:uid(),name:'',type:'',amount:0,currency:'ARS'});c.appendChild(w.firstElementChild);recalculate();}
function expandAllCategories(){document.querySelectorAll('.category-body').forEach((b)=>b.classList.add('open'));document.querySelectorAll('.category-toggle').forEach((t)=>t.classList.add('open'));}
function collapseAllCategories(){document.querySelectorAll('.category-body').forEach((b)=>b.classList.remove('open'));document.querySelectorAll('.category-toggle').forEach((t)=>t.classList.remove('open'));}
function getCategoriesData(){const cats=[];document.querySelectorAll('#categories-container .category-block').forEach((b)=>{const items=[];b.querySelectorAll('.expense-item').forEach((r)=>items.push({id:r.dataset.itemId||uid(),name:r.querySelector('[data-field=name]').value,type:r.querySelector('[data-field=type]').value,amount:parseFloat(r.querySelector('[data-field=amount]').value)||0,currency:r.querySelector('[data-field=currency]').value}));cats.push({id:b.dataset.catId,name:b.querySelector('.category-name').textContent,open:categoryOpenState[b.dataset.catId]!==false,items});});return cats;}
function rebuildCategoriesFromData(cats){const c=document.getElementById('categories-container');c.innerHTML='';categoryOpenState={};cats.forEach((cat)=>{categoryOpenState[cat.id]=cat.open!==false;buildCategoryBlock(cat);});recalculate();}
function calcCategoryTotal(items){return items.reduce((s,i)=>s+((i.currency==='ARS'?1:(state.currencies[i.currency]||1))*(parseFloat(i.amount)||0)),0);} 

function recalculate(){const ti=num('income-p1')+num('income-p2')+num('income-other');let te=0;const catData=[];document.querySelectorAll('#categories-container .category-block').forEach((b)=>{const n=b.querySelector('.category-name').textContent;const t=[...b.querySelectorAll('.expense-item')].reduce((s,r)=>{const a=parseFloat(r.querySelector('[data-field=amount]').value)||0;const c=r.querySelector('[data-field=currency]').value;return s+a*(c==='ARS'?1:(state.currencies[c]||1));},0);te+=t;catData.push({name:n,total:t});b.querySelector('.category-total').textContent=fmtARS(t);});document.getElementById('total-income-display').textContent=fmtARS(ti);document.getElementById('total-expenses-display').textContent=fmtARS(te);const disp=ti-te;renderSummaryStats(ti,te,disp,num('inv-real'),num('inv-goal'));renderCategorySummary(catData,te);renderSuggestions(ti,te,disp,catData);renderProfileDisplay(val('inv-profile'),disp);persist();}
function renderSummaryStats(totalIncome,totalExpenses,disp,invReal,invGoal){document.getElementById('summary-stats').innerHTML=`<div class="stat-card primary"><div class="stat-label">Ingreso Total</div><div class="stat-value">${fmtARS(totalIncome)}</div></div><div class="stat-card warning"><div class="stat-label">Gasto Total</div><div class="stat-value">${fmtARS(totalExpenses)}</div></div><div class="stat-card ${disp>=0?'success':'danger'}"><div class="stat-label">Disponible Teórico</div><div class="stat-value">${fmtARS(disp)}</div></div><div class="stat-card ${invReal>=invGoal?'success':'warning'}"><div class="stat-label">Inversión Real</div><div class="stat-value">${fmtARS(invReal)}</div></div>`;}
function renderCategorySummary(catData,total){document.getElementById('summary-categories').innerHTML=catData.map((c)=>`<div class="cat-summary-item"><div class="cat-name">${escHtml(c.name)}</div><div class="cat-amount">${fmtARS(c.total)}</div><div class="cat-pct">${total?((c.total/total)*100).toFixed(1):0}% del total</div></div>`).join('');}
function renderSuggestions(totalIncome,totalExpenses,disp,catData){const list=[];const ratio=totalIncome?totalExpenses/totalIncome:0;if(ratio>0.9)list.push({type:'danger',icon:'🚨',text:'Gasto crítico sobre ingresos.'});else if(ratio<0.6&&totalIncome>0)list.push({type:'ok',icon:'✅',text:'Buen margen de ahorro.'});const map={};catData.forEach((c)=>map[normKey(c.name)]=c.total);if(totalExpenses&&((map['ocio']||0)/totalExpenses)>0.12)list.push({type:'warning',icon:'🎭',text:'Ocio por encima del 12%.'});if(disp<0)list.push({type:'danger',icon:'🔴',text:`Gastos superan ingresos por ${fmtARS(Math.abs(disp))}.`});document.getElementById('suggestions-list').innerHTML=(list.length?list:[{type:'info',icon:'ℹ️',text:'Cargá ingresos y gastos para obtener sugerencias.'}]).map((s)=>`<div class="suggestion-item ${s.type}"><span class="s-icon">${s.icon}</span><span>${s.text}</span></div>`).join('');}
function renderProfileDisplay(profile,disp){const p={conservador:[70,20,10],moderado:[50,35,15],agresivo:[30,45,25]}[profile]||[50,35,15];document.getElementById('profile-display').innerHTML=`<h4 style="font-size:0.88rem;color:var(--neutral-600);margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.4px;">Perfil ${profile||'moderado'} — Distribución sugerida del excedente</h4><div class="profile-distribution"><div class="profile-bar" style="background:#1a56db;flex:${p[0]}">Base ${p[0]}% (${fmtARS(disp*p[0]/100)})</div><div class="profile-bar" style="background:#057a55;flex:${p[1]}">Crec. ${p[1]}% (${fmtARS(disp*p[1]/100)})</div><div class="profile-bar" style="background:#c27803;flex:${p[2]}">Riesgo ${p[2]}% (${fmtARS(disp*p[2]/100)})</div></div>`;}
function refreshExpenseTypeDatalist(){document.getElementById('expense-type-list').innerHTML=state.expenseTypes.map((t)=>`<option value="${escHtml(t)}"></option>`).join('');}
function refreshInvTypeDatalist(){document.getElementById('inv-type-list').innerHTML=state.invTypes.map((t)=>`<option value="${escHtml(t)}"></option>`).join('');}
function saveTemplate(){const n=val('template-name').trim();if(!n)return;state.templates[n]=getCategoriesData();persist();refreshTemplateSelector();toast('Template guardado','success');}
function applyTemplate(){const n=val('template-selector');if(!n||!state.templates[n])return;rebuildCategoriesFromData(state.templates[n]);toast('Template aplicado','success');}
function deleteTemplate(){const n=val('template-selector');if(!n)return;delete state.templates[n];persist();refreshTemplateSelector();}
function refreshTemplateSelector(){const s=document.getElementById('template-selector');s.innerHTML='<option value="">— Seleccionar template —</option>'+Object.keys(state.templates).map((k)=>`<option value="${escHtml(k)}">${escHtml(k)}</option>`).join('');}
function saveManualRate(){const c=val('currency-selector');const r=parseFloat(val('currency-manual-rate'));if(!c||!r)return;state.currencies[c]=r;state.currencySources[c]='manual';persist();renderCurrencyRateGrid();recalculate();}
async function fetchRateFromAPI(){const url=val('api-url').trim()||DEFAULT_API_URL;try{const r=await fetch(url);const data=await r.json();['USD','EUR','BRL','UYU','CLP'].forEach((c)=>{if(data.rates?.[c]){state.currencies[c]=parseFloat((1/data.rates[c]).toFixed(4));state.currencySources[c]='api';}});persist();renderCurrencyRateGrid();recalculate();document.getElementById('api-status-msg').textContent='✅ Cotización actualizada desde API';}catch{document.getElementById('api-status-msg').textContent='❌ Error API';}}
function renderCurrencyRateGrid(){document.getElementById('currency-rate-grid').innerHTML=['USD','EUR','BRL','UYU','CLP'].map((c)=>`<div class="currency-rate-item"><div class="cur-label">${c}</div><div class="cur-value">$ ${(state.currencies[c]||0).toLocaleString('es-AR')}</div><div class="cur-source">${state.currencySources[c]==='api'?'🌐 API':'⚡ Manual'}</div></div>`).join('');}
function onImportJSON(e){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);state={...state,...x,auth:state.auth};persist();initUI();toast('Importado correctamente','success');}catch{toast('Error al importar','error');}};r.readAsText(f);e.target.value='';}
function switchView(view){document.querySelectorAll('.view').forEach((v)=>v.classList.remove('active'));document.querySelectorAll('.main-nav button').forEach((b)=>b.classList.remove('active'));document.getElementById('view-'+view).classList.add('active');document.getElementById('tab-'+(view==='dashboard'?'dash':'carga')).classList.add('active');if(view==='dashboard')renderDashGeneral();}
function switchDashTab(tab,btn){document.querySelectorAll('.dash-panel').forEach((p)=>p.classList.remove('active'));document.querySelectorAll('.dash-tab').forEach((b)=>b.classList.remove('active'));document.getElementById('dash-'+tab).classList.add('active');btn.classList.add('active');if(tab==='general')renderDashGeneral();if(tab==='inversion')renderDashInversion();if(tab==='gastos')renderDashGastos();}
function renderDashGeneral(){const months=Object.keys(state.months).sort();if(!months.length)return;const labels=months;const ingresos=months.map((m)=>((state.months[m].incomeP1||0)+(state.months[m].incomeP2||0)+(state.months[m].incomeOther||0));const gastos=months.map((m)=>calcTotalExpensesFromData(state.months[m]));destroyChart('evolucion');charts.evolucion=new Chart(document.getElementById('chart-evolucion'),{type:'line',data:{labels,datasets:[{label:'Ingresos',data:ingresos,borderColor:'#1a56db'},{label:'Gastos',data:gastos,borderColor:'#c81e1e'}]}});} 
function renderDashGastos(){document.getElementById('insights-gastos').innerHTML='<div class="suggestion-item info"><span class="s-icon">📊</span><span>Insights cargados desde histórico.</span></div>';document.getElementById('mejor-camino').innerHTML='<ul><li>Mantené control de gastos variables.</li></ul>';}
function renderDashInversion(){const months=Object.keys(state.months).sort();destroyChart('inversion');if(!months.length)return;charts.inversion=new Chart(document.getElementById('chart-inversion'),{type:'line',data:{labels:months,datasets:[{label:'Inv. Teórica',data:months.map((m)=>state.months[m].invGoal||0),borderColor:'#1a56db'},{label:'Inv. Real',data:months.map((m)=>state.months[m].invReal||0),borderColor:'#057a55'}]}});document.getElementById('inv-history-table').innerHTML=`<table class="data-table"><thead><tr><th>Mes</th><th>Monto Real</th></tr></thead><tbody>${months.map((m)=>`<tr><td>${m}</td><td>${fmtARS(state.months[m].invReal||0)}</td></tr>`).join('')}</tbody></table>`;}
function calcTotalExpensesFromData(d){return(d.categories||[]).reduce((sum,cat)=>sum+(cat.items||[]).reduce((s,i)=>s+((i.currency==='ARS'?1:(state.currencies[i.currency]||1))*(parseFloat(i.amount)||0)),0),0);} 
function destroyChart(id){if(charts[id]){charts[id].destroy();delete charts[id];}}
