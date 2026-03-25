const AUTH_KEY = 'finanzas_auth_v2';
const AUTH_SESSION_KEY = 'finanzas_auth_session_v2';
const PBKDF2_ITERATIONS = 310000;

let authMode = 'login';
let activeCryptoKey = null;

function getStoredAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
  } catch (e) {
    return null;
  }
}

function setAppLocked(locked) {
  document.body.classList.toggle('app-locked', locked);
}

function clearAuthFields() {
  const pass = document.getElementById('auth-password');
  const confirm = document.getElementById('auth-confirm');
  const err = document.getElementById('auth-error');
  if (pass) pass.value = '';
  if (confirm) confirm.value = '';
  if (err) err.textContent = '';
}

function setupAuthScreen() {
  const hasPassword = !!getStoredAuth();
  authMode = hasPassword ? 'login' : 'setup';

  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');
  const confirmGroup = document.getElementById('auth-confirm-group');
  const submitBtn = document.getElementById('auth-submit-btn');
  const help = document.getElementById('auth-help-text');

  if (authMode === 'setup') {
    title.textContent = '🛡️ Configurá cifrado fuerte';
    subtitle.textContent = 'Definí una contraseña. Tus datos se guardarán cifrados (AES-GCM + PBKDF2).';
    confirmGroup.style.display = 'block';
    submitBtn.textContent = 'Activar cifrado';
    help.textContent = 'Sin esta contraseña no se pueden leer los datos guardados en el navegador.';
  } else {
    title.textContent = '🔐 Desbloquear datos cifrados';
    subtitle.textContent = 'Ingresá tu contraseña para descifrar y abrir tu panel.';
    confirmGroup.style.display = 'none';
    submitBtn.textContent = 'Desbloquear';
    help.textContent = 'Esta sesión solo se mantiene en esta pestaña. Al bloquear o cerrar, vuelve a pedir contraseña.';
  }

  clearAuthFields();
}

function b64FromBytes(bytes) {
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function bytesFromB64(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function randomBytes(length) {
  const out = new Uint8Array(length);
  crypto.getRandomValues(out);
  return out;
}

async function deriveKey(password, saltB64, iterations = PBKDF2_ITERATIONS) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: bytesFromB64(saltB64),
      iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptText(plainText, key) {
  const iv = randomBytes(12);
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plainText)
  );
  return {
    iv: b64FromBytes(iv),
    data: b64FromBytes(new Uint8Array(cipher))
  };
}

async function decryptText(payload, key) {
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytesFromB64(payload.iv) },
    key,
    bytesFromB64(payload.data)
  );
  return new TextDecoder().decode(plainBuffer);
}

async function encryptAndStoreAppState(dataObj) {
  if (!activeCryptoKey) return;
  const payload = await encryptText(JSON.stringify(dataObj), activeCryptoKey);
  localStorage.setItem(APP_KEY_ENCRYPTED, JSON.stringify(payload));
}

async function decryptAppState() {
  if (!activeCryptoKey) return null;
  const raw = localStorage.getItem(APP_KEY_ENCRYPTED);
  if (!raw) return null;
  const payload = JSON.parse(raw);
  const plain = await decryptText(payload, activeCryptoKey);
  return JSON.parse(plain);
}

async function migrateLegacyStateIfNeeded() {
  const encryptedExists = !!localStorage.getItem(APP_KEY_ENCRYPTED);
  const legacyRaw = localStorage.getItem(APP_KEY_LEGACY);
  if (encryptedExists || !legacyRaw) return;

  try {
    const legacyState = JSON.parse(legacyRaw);
    await encryptAndStoreAppState(legacyState);
    localStorage.removeItem(APP_KEY_LEGACY);
  } catch (e) {
    console.warn('No se pudo migrar estado legacy:', e);
  }
}

async function submitAuth() {
  const password = (document.getElementById('auth-password').value || '').trim();
  const confirm = (document.getElementById('auth-confirm').value || '').trim();
  const error = document.getElementById('auth-error');

  if (password.length < 10) {
    error.textContent = 'Usá al menos 10 caracteres para mayor seguridad.';
    return;
  }

  if (authMode === 'setup') {
    if (password !== confirm) {
      error.textContent = 'Las contraseñas no coinciden.';
      return;
    }

    const salt = b64FromBytes(randomBytes(16));
    const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
    const verifier = await encryptText('finanzas-unlock-ok', key);

    localStorage.setItem(AUTH_KEY, JSON.stringify({
      salt,
      iterations: PBKDF2_ITERATIONS,
      verifier
    }));

    activeCryptoKey = key;
    sessionStorage.setItem(AUTH_SESSION_KEY, 'ok');
    await migrateLegacyStateIfNeeded();
    await unlockAndInitApp();
    toast('Cifrado fuerte activado', 'success');
    return;
  }

  const stored = getStoredAuth();
  if (!stored?.salt || !stored?.verifier) {
    setupAuthScreen();
    return;
  }

  try {
    const key = await deriveKey(password, stored.salt, stored.iterations || PBKDF2_ITERATIONS);
    const plainVerifier = await decryptText(stored.verifier, key);
    if (plainVerifier !== 'finanzas-unlock-ok') {
      error.textContent = 'Contraseña incorrecta.';
      return;
    }

    activeCryptoKey = key;
    sessionStorage.setItem(AUTH_SESSION_KEY, 'ok');
    await unlockAndInitApp();
  } catch (e) {
    error.textContent = 'Contraseña incorrecta.';
  }
}

function lockApp() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  activeCryptoKey = null;
  appReady = false;
  setAppLocked(true);
  setupAuthScreen();
}

async function unlockAndInitApp() {
  setAppLocked(false);
  if (!appReady) {
    await loadState();
    appReady = true;
    initApp();
  }
}
