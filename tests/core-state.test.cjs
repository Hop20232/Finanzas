const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadStateModule(initialValues = {}, failingKeys = new Set()) {
  const values = new Map(Object.entries(initialValues));
  const notifications = [];
  const context = {
    console,
    JSON,
    localStorage: {
      getItem(key) { return values.has(key) ? values.get(key) : null; },
      setItem(key, value) {
        if (failingKeys.has(key)) throw new Error('quota exceeded');
        values.set(key, value);
      },
    },
    getActiveDataStorageKey() { return context.activeKey; },
    toast(message, type) { notifications.push({ message, type }); },
    activeKey: 'finanzasFamiliares_v6::workspace-a',
  };

  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'core', 'state.js'), 'utf8');
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.__state = () => state; globalThis.__save = saveState; globalThis.__load = loadState;`, context);
  return { context, notifications };
}

test('cambiar de espacio empieza desde un estado limpio y no arrastra meses', async () => {
  const a = JSON.stringify({
    names: { p1: 'Ana', p2: 'Bruno' },
    months: { '2026-09': { incomeP1: 100 } },
    currencies: { USD: 1200 },
  });
  const b = JSON.stringify({
    names: { p1: 'Carla', p2: 'Diego' },
    months: {},
    currencies: { EUR: 1300 },
  });
  const app = loadStateModule({
    'finanzasFamiliares_v6::workspace-a': a,
    'finanzasFamiliares_v6::workspace-b': b,
  });

  await app.context.__load();
  assert.deepEqual(Object.keys(app.context.__state().months), ['2026-09']);
  assert.equal(app.context.__state().names.p1, 'Ana');

  app.context.activeKey = 'finanzasFamiliares_v6::workspace-b';
  await app.context.__load();

  assert.deepEqual(Object.keys(app.context.__state().months), []);
  assert.equal(app.context.__state().names.p1, 'Carla');
  assert.equal(app.context.__state().currencies.USD, 1050);
  assert.equal(app.context.__state().currencies.EUR, 1300);
});

test('saveState devuelve false y comunica el fallo cuando localStorage rechaza la escritura', () => {
  const key = 'finanzasFamiliares_v6::workspace-a';
  const app = loadStateModule({}, new Set([key]));

  assert.equal(app.context.__save(), false);
  assert.deepEqual(app.notifications, [{
    message: 'No se pudieron guardar los cambios. Verificá el almacenamiento del navegador.',
    type: 'error',
  }]);
});
