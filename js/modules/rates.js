/* =================================================
   COTIZACIONES
================================================= */
function saveManualRate() {
  const cur = document.getElementById('currency-selector').value;
  const rate = parseFloat(document.getElementById('currency-manual-rate').value);
  if (!cur || isNaN(rate) || rate <= 0) { toast('Ingresá una cotización válida', 'error'); return; }
  state.currencies[cur] = rate;
  state.currencySources[cur] = 'manual';
  saveState();
  renderCurrencyRateGrid();
  updateCategoryTotals();
  recalculate();
  toast(`Cotización ${cur} guardada: ${rate} ARS`, 'success');
}

async function fetchRateFromAPI() {
  const targetUrl = (document.getElementById('api-url').value.trim()) || DEFAULT_API_URL;
  state.apiUrl = targetUrl;
  saveState();

  const statusMsg = document.getElementById('api-status-msg');
  const badge    = document.getElementById('currency-status-badge');
  statusMsg.textContent = '⏳ Consultando...';

  /* -----------------------------------------------
     Intenta obtener JSON desde una URL usando
     distintas estrategias para evitar CORS:
     1. Fetch directo (funciona si hay servidor HTTP)
     2. Proxy allorigins
     3. Proxy corsproxy.io
  ----------------------------------------------- */
  async function fetchJSON(url) {
    // Intento 1: directo
    try {
      const r = await Promise.race([
        fetch(url, { mode: 'cors' }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000))
      ]);
      if (r.ok) return await r.json();
    } catch(_) {}

    // Intento 2: proxy allorigins
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const r = await Promise.race([
        fetch(proxyUrl),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
      ]);
      if (r.ok) {
        const wrapper = await r.json();
        return JSON.parse(wrapper.contents);
      }
    } catch(_) {}

    // Intento 3: proxy corsproxy.io
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const r = await Promise.race([
        fetch(proxyUrl),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
      ]);
      if (r.ok) return await r.json();
    } catch(_) {}

    throw new Error('No se pudo obtener la cotización por ninguna vía');
  }

  try {
    const data = await fetchJSON(targetUrl);

    /*
      exchangerate-api v4 con base ARS:
      { base: "ARS", rates: { USD: 0.000952, ... } }
      1 ARS = 0.000952 USD  →  1 USD = 1/0.000952 ≈ 1050 ARS
    */
    let found = false;
    const currencies = ['USD', 'EUR', 'BRL', 'UYU', 'CLP'];

    if (data && data.rates) {
      if (data.base === 'ARS' || data.base_code === 'ARS') {
        currencies.forEach(c => {
          if (data.rates[c] && data.rates[c] > 0) {
            state.currencies[c] = parseFloat((1 / data.rates[c]).toFixed(4));
            state.currencySources[c] = 'api';
            found = true;
          }
        });
      } else if (data.base === 'USD' || data.base_code === 'USD') {
        const arsRate = data.rates['ARS'];
        if (arsRate) {
          currencies.forEach(c => {
            if (c === 'USD') {
              state.currencies['USD'] = parseFloat(arsRate.toFixed(2));
              state.currencySources['USD'] = 'api';
              found = true;
            } else if (data.rates[c]) {
              state.currencies[c] = parseFloat((arsRate / data.rates[c]).toFixed(4));
              state.currencySources[c] = 'api';
              found = true;
            }
          });
        }
      }
    }

    if (found) {
      saveState();
      renderCurrencyRateGrid();
      updateCategoryTotals();
      recalculate();
      statusMsg.textContent = '✅ Cotización actualizada desde API';
      badge.className = 'currency-status ok';
      badge.textContent = '✅ API';
      toast('Cotizaciones actualizadas desde API', 'success');
    } else {
      statusMsg.textContent = '⚠️ Respuesta recibida pero no interpretable. Cotización manual activa.';
      badge.className = 'currency-status manual';
      badge.textContent = '⚡ Manual';
      toast('Formato de API no reconocido. Cotización manual activa.', 'error');
    }

  } catch(e) {
    statusMsg.textContent = `❌ ${e.message}. Cotización manual activa.`;
    badge.className = 'currency-status error';
    badge.textContent = '❌ Error API';
    toast('No se pudo obtener cotización. Manual activa.', 'error');
  }
}

function renderCurrencyRateGrid() {
  const grid = document.getElementById('currency-rate-grid');
  if (!grid) return;
  const currencies = ['USD','EUR','BRL','UYU','CLP'];
  grid.innerHTML = currencies.map(c => {
    const rate = state.currencies[c] || '—';
    const src = state.currencySources[c] || 'manual';
    return `
      <div class="currency-rate-item">
        <div class="cur-label">${c}</div>
        <div class="cur-value">$ ${typeof rate === 'number' ? rate.toLocaleString('es-AR') : rate}</div>
        <div class="cur-source">${src === 'api' ? '🌐 API' : '⚡ Manual'}</div>
      </div>`;
  }).join('');
}

