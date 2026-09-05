const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const requiredFiles = [
  'index.html',
  'netlify.toml',
  'manifest.webmanifest',
  'sw.js',
  'icons/icon.svg',
  'js/core/state.js',
  'js/core/ui.js',
];

const missing = requiredFiles.filter(file => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error(`Faltan archivos requeridos para el despliegue: ${missing.join(', ')}`);
  process.exit(1);
}

const scriptFiles = [];
function collectJavaScript(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectJavaScript(entryPath);
    else if (entry.name.endsWith('.js')) scriptFiles.push(entryPath);
  }
}
collectJavaScript(path.join(root, 'js'));
for (const file of scriptFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.trim()) {
    console.error(`Archivo JavaScript vacio: ${path.relative(root, file)}`);
    process.exit(1);
  }
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!html.includes('manifest.webmanifest') || !html.includes('serviceWorker.register')) {
  console.error('index.html no referencia el manifest y el service worker requeridos.');
  process.exit(1);
}

fs.writeFileSync(
  path.join(root, 'google-config.js'),
  `window.GOOGLE_CLIENT_ID = ${JSON.stringify(googleClientId)};\n`,
  'utf8'
);

if (!googleClientId) {
  console.warn('GOOGLE_CLIENT_ID no definido: el deploy quedara sin boton de inicio de sesion.');
}

console.log('Build estatico verificado: Netlify puede publicar la raiz del repositorio.');
