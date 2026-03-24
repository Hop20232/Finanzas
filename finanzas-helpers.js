export const APP_KEY = 'finanzasFamiliares_v5';
export const DEFAULT_API_URL = 'https://api.exchangerate-api.com/v4/latest/ARS';
export const APP_BUILD_VERSION = '2026.03.24-2';
export const APP_LAST_UPDATE_LABEL = '24 Mar 2026';

export const DEFAULT_STATE = {
  names: { p1: 'Persona 1', p2: 'Persona 2' },
  currentMonth: '',
  months: {},
  currencies: { USD: 1050, EUR: 1150, BRL: 200, UYU: 26, CLP: 1.1 },
  currencySources: {},
  apiUrl: DEFAULT_API_URL,
  expenseTypes: [],
  invTypes: [],
  templates: {},
  auth: {
    admin: { user: 'rcordoba', pass: 'Hop202420' },
    currentUser: null,
    users: {},
  },
};

export const DEFAULT_CATEGORIES = [
  { id: 'vivienda', name: 'Vivienda', items: [
    { id: uid(), name: 'Alquiler', type: 'Fijo', amount: 0, currency: 'ARS' },
    { id: uid(), name: 'Expensas', type: 'Fijo', amount: 0, currency: 'ARS' },
    { id: uid(), name: 'ABL', type: 'Fijo', amount: 0, currency: 'ARS' },
    { id: uid(), name: 'Garage', type: 'Fijo', amount: 0, currency: 'ARS' },
  ] },
  { id: 'servicios', name: 'Servicios', items: [
    { id: uid(), name: 'Luz', type: 'Variable', amount: 0, currency: 'ARS' },
    { id: uid(), name: 'Gas', type: 'Variable', amount: 0, currency: 'ARS' },
    { id: uid(), name: 'Internet', type: 'Fijo', amount: 0, currency: 'ARS' },
    { id: uid(), name: 'Streaming / Netflix', type: 'Fijo', amount: 0, currency: 'ARS' },
    { id: uid(), name: 'Agua / otros servicios', type: 'Variable', amount: 0, currency: 'ARS' },
  ] },
  { id: 'familia', name: 'Familia y Educación', items: [
    { id: uid(), name: 'Jardín / colonia', type: 'Fijo', amount: 0, currency: 'ARS' },
    { id: uid(), name: 'Gimnasia / fútbol', type: 'Fijo', amount: 0, currency: 'ARS' },
    { id: uid(), name: 'Prepaga / salud familiar', type: 'Fijo', amount: 0, currency: 'ARS' },
    { id: uid(), name: 'Otros gastos del niño', type: 'Variable', amount: 0, currency: 'ARS' },
  ] },
  { id: 'movilidad', name: 'Movilidad', items: [
    { id: uid(), name: 'Seguro auto', type: 'Fijo', amount: 0, currency: 'ARS' },
    { id: uid(), name: 'Patente', type: 'Fijo', amount: 0, currency: 'ARS' },
    { id: uid(), name: 'Service', type: 'Eventual', amount: 0, currency: 'ARS' },
    { id: uid(), name: 'VTV', type: 'Eventual', amount: 0, currency: 'ARS' },
    { id: uid(), name: 'Combustible / peajes', type: 'Variable', amount: 0, currency: 'ARS' },
  ] },
  { id: 'alimentos', name: 'Alimentos', items: [
    { id: uid(), name: 'Supermercado', type: 'Variable', amount: 0, currency: 'ARS' },
    { id: uid(), name: 'Verdulería', type: 'Variable', amount: 0, currency: 'ARS' },
    { id: uid(), name: 'Carnicería / pollo / pescado', type: 'Variable', amount: 0, currency: 'ARS' },
    { id: uid(), name: 'Lácteos y panadería', type: 'Variable', amount: 0, currency: 'ARS' },
    { id: uid(), name: 'Limpieza e higiene', type: 'Variable', amount: 0, currency: 'ARS' },
  ] },
  { id: 'ocio', name: 'Ocio', items: [
    { id: uid(), name: 'Salidas a comer', type: 'Variable', amount: 0, currency: 'ARS' },
    { id: uid(), name: 'Ocio extra / cine / café / planes', type: 'Variable', amount: 0, currency: 'ARS' },
  ] },
];

export function uid() {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

export function fmtARS(n) {
  if (Number.isNaN(n)) return '$ 0';
  return '$ ' + Math.round(Number(n) || 0).toLocaleString('es-AR');
}

export function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normKey(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}
