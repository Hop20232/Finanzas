export const DB_VERSION = 2;

export const DEFAULT_DB = {
  db_version: DB_VERSION,
  config: {
    personas: ["Persona A", "Persona B"],
    moneda: "EUR",
  },
  gastos: [],
};

export function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function formatMoney(value, currency = "EUR") {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export function normalizeGasto(raw = {}, personas = DEFAULT_DB.config.personas) {
  const pagador = raw.pagador || raw.persona || personas[0];
  const tipo = raw.tipo === "personal" ? "personal" : "compartido";
  const beneficiarios = Array.isArray(raw.beneficiarios)
    ? raw.beneficiarios
    : tipo === "personal"
      ? [raw.para || pagador]
      : [...personas];

  return {
    id: raw.id || uid(),
    fecha: raw.fecha || new Date().toISOString().slice(0, 10),
    categoria: raw.categoria || "General",
    descripcion: raw.descripcion || "",
    monto: Number(raw.monto || raw.importe || 0),
    tipo,
    pagador,
    beneficiarios,
    created_at: raw.created_at || new Date().toISOString(),
  };
}

export function migrateDb(data) {
  const base = data && typeof data === "object" ? data : {};
  let db = {
    ...DEFAULT_DB,
    ...base,
    config: { ...DEFAULT_DB.config, ...(base.config || {}) },
    gastos: Array.isArray(base.gastos) ? base.gastos : [],
  };

  const fromVersion = Number(db.db_version || 0);

  if (fromVersion < 1) {
    db.gastos = db.gastos.map((g) => ({
      ...g,
      id: g.id || uid(),
      descripcion: g.descripcion || "",
      categoria: g.categoria || "General",
    }));
    db.db_version = 1;
  }

  if (fromVersion < 2 || db.db_version < 2) {
    db.gastos = db.gastos.map((g) => normalizeGasto(g, db.config.personas));
    db.db_version = 2;
  }

  db.gastos = db.gastos.map((g) => normalizeGasto(g, db.config.personas));
  return db;
}

export function monthKey(dateStr) {
  return (dateStr || "").slice(0, 7);
}

export function getMonthlySummary(db, month) {
  const personas = db.config.personas;
  const summary = {
    total: 0,
    compartido: 0,
    personal: 0,
    porPersona: Object.fromEntries(personas.map((p) => [p, 0])),
    pagadoPor: Object.fromEntries(personas.map((p) => [p, 0])),
  };

  db.gastos
    .filter((g) => monthKey(g.fecha) === month)
    .forEach((g) => {
      summary.total += g.monto;
      if (g.tipo === "compartido") summary.compartido += g.monto;
      else summary.personal += g.monto;

      summary.pagadoPor[g.pagador] = (summary.pagadoPor[g.pagador] || 0) + g.monto;
      const split = g.monto / Math.max(g.beneficiarios.length, 1);
      g.beneficiarios.forEach((b) => {
        summary.porPersona[b] = (summary.porPersona[b] || 0) + split;
      });
    });

  return summary;
}

export function calculateBalances(db, month) {
  const { porPersona, pagadoPor } = getMonthlySummary(db, month);
  const personas = db.config.personas;
  const neto = Object.fromEntries(
    personas.map((p) => [p, (pagadoPor[p] || 0) - (porPersona[p] || 0)]),
  );

  const deudores = personas
    .filter((p) => neto[p] < 0)
    .map((p) => ({ persona: p, monto: -neto[p] }))
    .sort((a, b) => b.monto - a.monto);
  const acreedores = personas
    .filter((p) => neto[p] > 0)
    .map((p) => ({ persona: p, monto: neto[p] }))
    .sort((a, b) => b.monto - a.monto);

  const movimientos = [];
  let i = 0;
  let j = 0;
  while (i < deudores.length && j < acreedores.length) {
    const amount = Math.min(deudores[i].monto, acreedores[j].monto);
    movimientos.push({
      de: deudores[i].persona,
      para: acreedores[j].persona,
      monto: Number(amount.toFixed(2)),
    });
    deudores[i].monto -= amount;
    acreedores[j].monto -= amount;
    if (deudores[i].monto < 0.01) i += 1;
    if (acreedores[j].monto < 0.01) j += 1;
  }

  return { neto, movimientos };
}

export function inferBeneficiarios(tipo, owner, personas) {
  return tipo === "personal" ? [owner] : [...personas];
}
