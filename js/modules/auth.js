const AUTH_SESSION_KEY = 'finanzas_google_auth_session_v1';
const AUTH_USER_KEY = 'finanzas_google_user_v1';
const USER_WORKSPACES_PREFIX = 'finanzas_user_workspaces_v1::';
const WORKSPACE_ACCESS_PREFIX = 'finanzas_workspace_access_v1::';
const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const GOOGLE_DRIVE_APP_NAME = 'finanzas-familiares';
const GOOGLE_DRIVE_REGISTRY_FILE = `${GOOGLE_DRIVE_APP_NAME}-registry.json`;
const GOOGLE_DRIVE_WORKSPACE_FILE_PREFIX = `${GOOGLE_DRIVE_APP_NAME}-workspace-`;
const INVITE_VERSION = 1;
const GOOGLE_CLIENT_ID = window.GOOGLE_CLIENT_ID || 'REEMPLAZAR_CON_GOOGLE_CLIENT_ID';

let currentAuthUser = null;
let activeWorkspaceId = null;
let googleAccessToken = '';
let googleTokenClient = null;

function setAppLocked(locked) {
  document.body.classList.toggle('app-locked', locked);
}

function getUserStorageKey(sub) {
  return `${USER_WORKSPACES_PREFIX}${sub}`;
}

function getWorkspaceAccessKey(workspaceId) {
  return `${WORKSPACE_ACCESS_PREFIX}${workspaceId}`;
}

function getStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem(AUTH_USER_KEY) || localStorage.getItem(AUTH_USER_KEY) || 'null');
  } catch (e) {
    return null;
  }
}

function setStoredUser(user) {
  sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function getGoogleDriveEnabled() {
  return !!googleAccessToken;
}

function getGoogleAuthorizationHeader() {
  return googleAccessToken ? { Authorization: `Bearer ${googleAccessToken}` } : {};
}

function getGoogleDriveWorkspaceFileName(workspaceId) {
  return `${GOOGLE_DRIVE_WORKSPACE_FILE_PREFIX}${workspaceId}.json`;
}

function buildGoogleDriveFileQuery(name) {
  return [
    "appProperties has { key='app' and value='finanzas-familiares' }",
    `name='${name.replace(/'/g, "\\'")}'`,
    "trashed=false"
  ].join(' and ');
}

function ensureGoogleTokenClient() {
  if (googleTokenClient || !window.google?.accounts?.oauth2?.initTokenClient) {
    return googleTokenClient;
  }

  googleTokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_DRIVE_SCOPE,
    callback: tokenResponse => {
      if (tokenResponse?.access_token) {
        googleAccessToken = tokenResponse.access_token;
        sessionStorage.setItem('finanzas_google_drive_token_v1', googleAccessToken);
        sessionStorage.setItem('finanzas_google_drive_enabled_v1', 'ok');
        toast('Google Drive conectado. El guardado ya queda en tu cuenta.', 'success');
        if (currentAuthUser && activeWorkspaceId) {
          unlockAndInitApp();
        }
      } else if (tokenResponse?.error) {
        console.warn('No se pudo obtener token de Google Drive:', tokenResponse.error);
        toast('No se pudo conectar Google Drive. La app sigue en modo local.', 'error');
      }
    }
  });

  return googleTokenClient;
}

function requestGoogleDriveAccess() {
  if (GOOGLE_CLIENT_ID === 'REEMPLAZAR_CON_GOOGLE_CLIENT_ID') {
    toast('Falta configurar GOOGLE_CLIENT_ID.', 'error');
    return;
  }
  const client = ensureGoogleTokenClient();
  if (!client) {
    toast('No se pudo preparar Google Drive.', 'error');
    return;
  }
  client.requestAccessToken({ prompt: '' });
}

async function googleDriveFetch(path, options = {}) {
  if (!googleAccessToken) {
    throw new Error('Google Drive no está autorizado.');
  }
  const response = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...getGoogleAuthorizationHeader()
    }
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Google Drive API ${response.status}: ${text || response.statusText}`);
  }
  return response;
}

async function findGoogleDriveFile(name) {
  const query = encodeURIComponent(buildGoogleDriveFileQuery(name));
  const response = await googleDriveFetch(`/files?q=${query}&spaces=appDataFolder&fields=files(id,name,modifiedTime)`);
  const payload = await response.json();
  return payload.files?.[0] || null;
}

async function readGoogleDriveFile(name) {
  const file = await findGoogleDriveFile(name);
  if (!file?.id) return null;
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
    headers: getGoogleAuthorizationHeader()
  });
  if (!response.ok) {
    throw new Error(`No se pudo leer ${name}`);
  }
  return response.text();
}

async function writeGoogleDriveFile(name, content) {
  const existing = await findGoogleDriveFile(name);
  const headers = {
    ...getGoogleAuthorizationHeader(),
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (existing?.id) {
    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`, {
      method: 'PATCH',
      headers,
      body: content
    }).then(async response => {
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`No se pudo actualizar ${name}: ${text || response.statusText}`);
      }
    });
    return existing.id;
  }

  const metadata = {
    name,
    parents: ['appDataFolder'],
    appProperties: { app: 'finanzas-familiares' }
  };
  const multipart = [
    '--finanzas-boundary',
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    '--finanzas-boundary',
    'Content-Type: application/json; charset=UTF-8',
    '',
    content,
    '--finanzas-boundary--'
  ].join('\r\n');

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: {
      ...getGoogleAuthorizationHeader(),
      'Content-Type': 'multipart/related; boundary=finanzas-boundary'
    },
    body: multipart
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`No se pudo crear ${name}: ${text || response.statusText}`);
  }
  const payload = await response.json();
  return payload.id;
}

async function loadGoogleDriveRegistry() {
  if (!googleAccessToken) return null;
  try {
    const raw = await readGoogleDriveFile(GOOGLE_DRIVE_REGISTRY_FILE);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Registro Google Drive no disponible:', e);
    return null;
  }
}

async function saveGoogleDriveRegistry(registry) {
  if (!googleAccessToken) return false;
  const payload = JSON.stringify(registry, null, 2);
  await writeGoogleDriveFile(GOOGLE_DRIVE_REGISTRY_FILE, payload);
  return true;
}

async function loadGoogleDriveWorkspaceState(workspaceId) {
  if (!googleAccessToken || !workspaceId) return null;
  try {
    const raw = await readGoogleDriveFile(getGoogleDriveWorkspaceFileName(workspaceId));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('No se pudo leer el workspace desde Google Drive:', e);
    return null;
  }
}

async function saveGoogleDriveWorkspaceState(workspaceId, snapshot) {
  if (!googleAccessToken || !workspaceId) return false;
  await writeGoogleDriveFile(getGoogleDriveWorkspaceFileName(workspaceId), JSON.stringify(snapshot, null, 2));
  return true;
}

function getUserWorkspaces(sub) {
  try {
    return JSON.parse(localStorage.getItem(getUserStorageKey(sub)) || '[]');
  } catch (e) {
    return [];
  }
}

function setUserWorkspaces(sub, workspaces) {
  localStorage.setItem(getUserStorageKey(sub), JSON.stringify(workspaces));
}

function getWorkspaceAccess(workspaceId) {
  try {
    return JSON.parse(localStorage.getItem(getWorkspaceAccessKey(workspaceId)) || 'null');
  } catch (e) {
    return null;
  }
}

function setWorkspaceAccess(workspaceId, access) {
  localStorage.setItem(getWorkspaceAccessKey(workspaceId), JSON.stringify(access));
}

function parseJwtCredential(credential) {
  try {
    const payload = credential.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(normalized));
  } catch (e) {
    return null;
  }
}

function getOrCreatePersonalWorkspace(user) {
  const personalWorkspaceId = `personal_${user.sub}`;
  let workspaces = getUserWorkspaces(user.sub);
  if (!workspaces.some(w => w.id === personalWorkspaceId)) {
    workspaces.unshift({
      id: personalWorkspaceId,
      label: `Mis finanzas (${user.name || user.email})`,
      ownerSub: user.sub,
      ownerEmail: user.email
    });
    setUserWorkspaces(user.sub, workspaces);
  }

  const access = getWorkspaceAccess(personalWorkspaceId);
  if (!access) {
    setWorkspaceAccess(personalWorkspaceId, {
      workspaceId: personalWorkspaceId,
      ownerSub: user.sub,
      ownerEmail: user.email,
      ownerName: user.name || user.email,
      invited: [],
      createdAt: new Date().toISOString()
    });
  }

  return personalWorkspaceId;
}

async function hydrateGoogleDriveState(user) {
  if (!googleAccessToken) return;
  const registry = await loadGoogleDriveRegistry();
  if (!registry || typeof registry !== 'object') return;

  if (isArrayLike(registry.workspaces)) {
    setUserWorkspaces(user.sub, registry.workspaces);
  } else if (registry.userWorkspaces && registry.userWorkspaces[user.sub]) {
    setUserWorkspaces(user.sub, registry.userWorkspaces[user.sub]);
  }

  if (registry.workspaceAccess && typeof registry.workspaceAccess === 'object') {
    Object.entries(registry.workspaceAccess).forEach(([workspaceId, access]) => {
      setWorkspaceAccess(workspaceId, access);
    });
  }
}

function isArrayLike(value) {
  return Array.isArray(value);
}

function renderAuthHeader(user) {
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');
  const error = document.getElementById('auth-error');
  const help = document.getElementById('auth-help-text');

  if (!user) {
    title.textContent = '🔐 Ingresá con Google';
    subtitle.textContent = 'Para usar la app necesitás iniciar sesión con Google.';
    if (GOOGLE_CLIENT_ID === 'REEMPLAZAR_CON_GOOGLE_CLIENT_ID') {
      error.textContent = 'Falta configurar GOOGLE_CLIENT_ID en index.html.';
    } else {
      error.textContent = '';
    }
    help.textContent = 'Cada cuenta accede a su propio espacio. Además podés sumarte a espacios colaborativos por invitación.';
    return;
  }

  title.textContent = `✅ Sesión activa: ${user.name || user.email}`;
  subtitle.textContent = 'Podés continuar al panel o cambiar de cuenta.';
  error.textContent = '';
  help.textContent = 'Cerrá sesión cuando uses una computadora compartida.';
}

function renderGoogleButton() {
  const host = document.getElementById('google-login-btn');
  if (!host) return;
  host.innerHTML = '';

  if (!window.google?.accounts?.id) {
    document.getElementById('auth-error').textContent = 'No se pudo cargar Google Identity Services.';
    return;
  }
  if (GOOGLE_CLIENT_ID === 'REEMPLAZAR_CON_GOOGLE_CLIENT_ID') {
    return;
  }

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: onGoogleCredential
  });

  window.google.accounts.id.renderButton(host, {
    theme: 'outline',
    size: 'large',
    width: 320,
    text: 'signin_with'
  });
}

function onGoogleCredential(response) {
  const claims = parseJwtCredential(response.credential);
  if (!claims?.sub || !claims?.email) {
    document.getElementById('auth-error').textContent = 'No se pudo validar el usuario de Google.';
    return;
  }

  currentAuthUser = {
    sub: claims.sub,
    email: claims.email,
    name: claims.name || claims.email
  };
  setStoredUser(currentAuthUser);
  sessionStorage.setItem(AUTH_SESSION_KEY, 'ok');

  const personalWorkspace = getOrCreatePersonalWorkspace(currentAuthUser);
  const rememberedWorkspace = sessionStorage.getItem('finanzas_active_workspace_v1');
  activeWorkspaceId = rememberedWorkspace || personalWorkspace;
  sessionStorage.setItem('finanzas_active_workspace_v1', activeWorkspaceId);

  renderAuthHeader(currentAuthUser);
  unlockAndInitApp();
  requestGoogleDriveAccess();
}

function getActiveDataStorageKey() {
  if (!activeWorkspaceId) return 'finanzasFamiliares_v6::public';
  return `finanzasFamiliares_v6::${activeWorkspaceId}`;
}

function isWorkspaceOwner() {
  const access = getWorkspaceAccess(activeWorkspaceId);
  return !!(currentAuthUser && access && access.ownerSub === currentAuthUser.sub);
}

function updateWorkspaceSelector() {
  const selector = document.getElementById('workspace-selector');
  if (!selector || !currentAuthUser) return;
  const workspaces = getUserWorkspaces(currentAuthUser.sub);
  selector.innerHTML = '';
  workspaces.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.id;
    opt.textContent = w.label;
    selector.appendChild(opt);
  });
  if (activeWorkspaceId) selector.value = activeWorkspaceId;
}

async function switchWorkspace(workspaceId) {
  if (!workspaceId || workspaceId === activeWorkspaceId) return;
  activeWorkspaceId = workspaceId;
  sessionStorage.setItem('finanzas_active_workspace_v1', workspaceId);
  await loadState();
  initApp();
  renderCollaborationInfo();
  toast('Espacio colaborativo actualizado', 'success');
}

function buildInviteCode(workspaceId) {
  const access = getWorkspaceAccess(workspaceId);
  if (!access) return '';
  const payload = {
    v: INVITE_VERSION,
    workspaceId,
    ownerEmail: access.ownerEmail,
    ownerName: access.ownerName,
    createdAt: new Date().toISOString()
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

function parseInviteCode(code) {
  try {
    const decoded = decodeURIComponent(escape(atob(code.trim())));
    const payload = JSON.parse(decoded);
    if (!payload?.workspaceId || payload?.v !== INVITE_VERSION) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function renderCollaborationInfo() {
  const userEmail = document.getElementById('collab-current-user');
  const workspaceMeta = document.getElementById('collab-workspace-meta');
  const inviteBtn = document.getElementById('btn-generate-invite');

  if (userEmail) userEmail.textContent = currentAuthUser?.email || '-';
  if (!workspaceMeta) return;

  const access = getWorkspaceAccess(activeWorkspaceId);
  if (!access) {
    workspaceMeta.textContent = 'Sin información de espacio.';
    if (inviteBtn) inviteBtn.disabled = true;
    return;
  }

  const invitedCount = Array.isArray(access.invited) ? access.invited.length : 0;
  workspaceMeta.textContent = `Owner: ${access.ownerEmail} · colaboradores: ${invitedCount}`;
  if (inviteBtn) inviteBtn.disabled = !isWorkspaceOwner();
}

function generateInviteCode() {
  if (!isWorkspaceOwner()) {
    toast('Solo el owner puede generar invitaciones.', 'error');
    return;
  }
  const targetInput = document.getElementById('collab-invite-code');
  const code = buildInviteCode(activeWorkspaceId);
  targetInput.value = code;
  targetInput.select();
  toast('Código de invitación generado.', 'success');
}

function joinWorkspaceByInvite() {
  if (!currentAuthUser) return;
  const rawCode = (document.getElementById('collab-join-code').value || '').trim();
  const payload = parseInviteCode(rawCode);
  if (!payload) {
    toast('Código inválido.', 'error');
    return;
  }

  const workspaces = getUserWorkspaces(currentAuthUser.sub);
  if (!workspaces.some(w => w.id === payload.workspaceId)) {
    workspaces.push({
      id: payload.workspaceId,
      label: `Colaboración con ${payload.ownerName || payload.ownerEmail}`,
      ownerEmail: payload.ownerEmail
    });
    setUserWorkspaces(currentAuthUser.sub, workspaces);
  }

  const access = getWorkspaceAccess(payload.workspaceId) || {
    workspaceId: payload.workspaceId,
    ownerEmail: payload.ownerEmail || 'desconocido',
    ownerName: payload.ownerName || payload.ownerEmail || 'desconocido',
    invited: []
  };
  access.invited = Array.isArray(access.invited) ? access.invited : [];
  if (!access.invited.includes(currentAuthUser.email)) {
    access.invited.push(currentAuthUser.email);
    setWorkspaceAccess(payload.workspaceId, access);
  }

  updateWorkspaceSelector();
  switchWorkspace(payload.workspaceId);
}

function lockApp() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
  currentAuthUser = null;
  activeWorkspaceId = null;
  googleAccessToken = '';
  appReady = false;
  setAppLocked(true);
  renderAuthHeader(null);
  renderGoogleButton();
}

function logoutGoogle() {
  const email = currentAuthUser?.email;
  if (window.google?.accounts?.id) {
    window.google.accounts.id.disableAutoSelect();
    if (email && typeof window.google.accounts.id.revoke === 'function') {
      window.google.accounts.id.revoke(email, () => {});
    }
  }
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  currentAuthUser = null;
  activeWorkspaceId = null;
  googleAccessToken = '';
  lockApp();
  toast('Sesión cerrada. Volvé a iniciar con Google.', 'info');
}

async function unlockAndInitApp() {
  setAppLocked(false);
  updateWorkspaceSelector();
  renderCollaborationInfo();
  if (!appReady) {
    await loadState();
    await hydrateGoogleDriveState(currentAuthUser);
    appReady = true;
    initApp();
    return;
  }
  await loadState();
  await hydrateGoogleDriveState(currentAuthUser);
  initApp();
}

function setupAuthScreen() {
  const stored = getStoredUser();
  if (stored?.sub && stored?.email) {
    currentAuthUser = stored;
    const savedToken = sessionStorage.getItem('finanzas_google_drive_token_v1');
    if (savedToken) googleAccessToken = savedToken;
    const personalWorkspace = getOrCreatePersonalWorkspace(currentAuthUser);
    activeWorkspaceId = sessionStorage.getItem('finanzas_active_workspace_v1') || personalWorkspace;
    sessionStorage.setItem('finanzas_active_workspace_v1', activeWorkspaceId);
    renderAuthHeader(currentAuthUser);
    unlockAndInitApp();
    return;
  }
  lockApp();
  renderAuthHeader(currentAuthUser);
  renderGoogleButton();
}

window.addEventListener('google-identity-loaded', renderGoogleButton);
