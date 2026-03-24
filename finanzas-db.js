import { APP_KEY, DEFAULT_STATE } from './finanzas-helpers.js?v=2026.03.24-1';

export function loadState() {
  try {
    const raw = localStorage.getItem(APP_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const saved = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_STATE),
      ...saved,
      names: { ...DEFAULT_STATE.names, ...(saved.names || {}) },
      currencies: { ...DEFAULT_STATE.currencies, ...(saved.currencies || {}) },
      auth: {
        ...DEFAULT_STATE.auth,
        ...(saved.auth || {}),
        admin: { ...DEFAULT_STATE.auth.admin, ...(saved.auth?.admin || {}) },
        users: saved.auth?.users || {},
      },
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

export function saveState(state) {
  localStorage.setItem(APP_KEY, JSON.stringify(state));
}

export function exportJSON(state) {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finanzas_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 1000);
}
