const AUTH_SESSION_KEY = 'finanzas_google_auth_session_v1';
const AUTH_USER_KEY = 'finanzas_google_user_v1';
const USER_WORKSPACES_PREFIX = 'finanzas_user_workspaces_v1::';
const WORKSPACE_ACCESS_PREFIX = 'finanzas_workspace_access_v1::';
const INVITE_VERSION = 1;
const GOOGLE_CLIENT_ID = window.GOOGLE_CLIENT_ID || 'REEMPLAZAR_CON_GOOGLE_CLIENT_ID';

let currentAuthUser = null;
let activeWorkspaceId = null;

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
  appReady = false;
  setAppLocked(true);
  renderAuthHeader(null);
  renderGoogleButton();
}

function logoutGoogle() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  currentAuthUser = null;
  activeWorkspaceId = null;
  unlockAndInitApp();
  toast('Acceso libre activo (login deshabilitado).', 'info');
}

async function unlockAndInitApp() {
  setAppLocked(false);
  updateWorkspaceSelector();
  renderCollaborationInfo();
  if (!appReady) {
    await loadState();
    appReady = true;
    initApp();
    return;
  }
  await loadState();
  initApp();
}

function setupAuthScreen() {
  const stored = getStoredUser();
  if (stored?.sub && stored?.email) {
    currentAuthUser = stored;
  }
  renderAuthHeader(currentAuthUser);
  renderGoogleButton();
}
