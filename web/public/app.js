const $ = id => document.getElementById(id);
const login = $('login'), panel = $('panel'), list = $('notifications');
let events = [], currentPage = 1, total = 0, totalPages = 1, devices = [], applications = [];
let updatingApps = false;
const pageSize = 50;
function showToast(s) { $('message').textContent = s; }
async function request(path, options = {}) {
  const res = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options });
  let data; try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) throw new Error(data.error || 'Error HTTP ' + res.status);
  return data;
}
async function refresh() {
  const q = new URLSearchParams({ page: String(currentPage), limit: String(pageSize) });
  const search = $('filter').value.trim();
  const device = $('deviceFilter').value;
  const type = $('typeFilter').value;
  if (search) q.set('search', search);
  if (device) q.set('device', device);
  if (type) q.set('type', type);
  try {
    const [data, stats] = await Promise.all([
      request('/api/notifications?' + q), request('/api/stats')
    ]);
    events = data.notifications || [];
    total = data.total || 0;
    totalPages = Math.max(1, data.pages || 1);
    if (currentPage > totalPages) { currentPage = totalPages; return refresh(); }
    devices = stats.devices || [];
    login.hidden = true; panel.hidden = false;
    $('count').textContent = String(stats.total || 0);
    $('today').textContent = String(stats.last24h || 0);
    $('devices').textContent = String(devices.length);
    $('payments').textContent = String(stats.paymentsDetected || 0);
    showToast('Sincronizado: ' + new Date().toLocaleTimeString('es-PE'));
    render();
    if (!applications.length) await refreshApps();
  } catch (err) {
    if (err.message.includes('Inicia sesión') || err.message.includes('No autorizado')) {
      login.hidden = false; panel.hidden = true;
    } else showToast(err.message);
  }
}
function render() {
  const selected = $('deviceFilter').value;
  $('deviceFilter').replaceChildren(new Option('Todos los celulares', ''));
  for (const d of devices) $('deviceFilter').add(new Option((d.name || d._id) + ' (' + d.count + ')', d._id));
  $('deviceFilter').value = selected;
  $('shown').textContent = `${total} resultado(s) · ${events.length} en esta página`;
  $('pageLabel').textContent = `Página ${currentPage} de ${totalPages}`;
  $('previous').disabled = currentPage <= 1;
  $('next').disabled = currentPage >= totalPages;
  list.replaceChildren();
  if (!events.length) {
    const empty = document.createElement('p'); empty.className = 'empty';
    empty.textContent = 'No hay notificaciones con estos filtros.';
    list.append(empty); return;
  }
  for (const n of events) {
    const item = document.createElement('article'); item.className = 'notification';
    const header = document.createElement('div'); header.className = 'line';
    const app = document.createElement('span'); app.className = 'app'; app.textContent = n.appName || n.appPackage;
    const time = document.createElement('time'); time.textContent = new Date(n.postedAt || n.receivedAt).toLocaleString('es-PE');
    header.append(app, time);
    const title = document.createElement('h3'); title.textContent = n.title || 'Notificación';
    const message = document.createElement('p'); message.textContent = n.message || '(Sin contenido visible)';
    item.append(header, title, message);
    if (n.payment && n.payment.amount) {
      const payment = document.createElement('div'); payment.className = 'payment';
      const who = n.payment.sender ? ' · Dice: ' + n.payment.sender : '';
      payment.textContent = `Posible pago: S/ ${Number(n.payment.amount).toLocaleString('es-PE',{minimumFractionDigits:2})}${who} · NO VERIFICADO`;
      item.append(payment);
    }
    const foot = document.createElement('div'); foot.className = 'meta';
    foot.textContent = '📱 ' + n.deviceName + ' · ' + n.appPackage;
    item.append(foot); list.append(item);
  }
}
let searchTimeout;
$('filter').addEventListener('input', () => {
  clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { currentPage = 1; refresh(); }, 500);
});
$('deviceFilter').addEventListener('change', () => { currentPage = 1; refresh(); });
$('typeFilter').addEventListener('change', () => { currentPage = 1; refresh(); });
$('previous').addEventListener('click', () => { if (currentPage > 1) { currentPage--; refresh(); } });
$('next').addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; refresh(); } });
$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await request('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('password').value }) });
    $('password').value = ''; await refresh();
  } catch (err) { showToast(err.message); }
});
$('refresh').addEventListener('click', refresh);
$('logout').addEventListener('click', async () => {
  try { await request('/api/logout', { method: 'POST' }); }
  catch (err) { showToast(err.message); }
  login.hidden = false; panel.hidden = true; events = [];
  showToast('Sesión cerrada');
});
$('clear').addEventListener('click', async () => {
  if (!confirm('¿Eliminar TODO el historial en MongoDB? No se puede deshacer.')) return;
  if (!confirm('¿Confirmas eliminar las notificaciones de todos tus celulares?')) return;
  try { await request('/api/notifications', { method: 'DELETE' }); currentPage = 1; await refresh(); }
  catch (err) { showToast(err.message); }
});
refresh();
setInterval(() => { if (!panel.hidden) refresh(); }, 20000);

async function refreshApps() {
  try {
    const data = await request('/api/apps');
    applications = data.apps || [];
    renderApps();
  } catch (err) { showToast(err.message); }
}
function renderApps() {
  const filter = $('appSearch').value.trim().toLowerCase();
  const list = $('appList'); list.replaceChildren();
  const matches = applications.filter(a => (a.appName + ' ' + a.appPackage).toLowerCase().includes(filter));
  if (!matches.length) {
    const e = document.createElement('p'); e.className = 'appEmpty';
    e.textContent = 'Sin aplicaciones detectadas. Activa NotiWeb en tu Android y espera la sincronización, o agrega un paquete manualmente.';
    list.append(e); return;
  }
  for (const app of matches) {
    const row = document.createElement('div'); row.className = 'appItem' + (app.enabled ? ' isActive' : '');
    const left = document.createElement('div'); left.style.minWidth = '0';
    const name = document.createElement('div'); name.className = 'appName'; name.textContent = app.appName;
    const detail = document.createElement('small'); detail.className = 'appDetail'; detail.textContent = app.appPackage;
    const info = document.createElement('small'); info.className = 'appDetail';
    info.textContent = app.devices.length ? ('Detectada en ' + app.devices.length + ' celular(es)') : 'Regla añadida manualmente';
    left.append(name,detail,info);
    const right = document.createElement('div'); right.className = 'appRight';
    const toggle = document.createElement('button'); toggle.className = 'appToggle' + (app.enabled ? ' active' : '');
    toggle.type='button'; toggle.textContent = app.enabled ? '✓ Permitir' : '✕ Ignorar';
    toggle.setAttribute('aria-label', (app.enabled ? 'Desactivar ' : 'Activar ') + app.appName);
    toggle.setAttribute('aria-pressed', String(app.enabled)); toggle.disabled = updatingApps;
    toggle.addEventListener('click', () => setApp(app.appPackage, !app.enabled));
    const del = document.createElement('button'); del.type = 'button'; del.className = 'appDelete'; del.textContent = 'Borrar datos';
    del.title = 'Elimina todas las notificaciones antiguas de esta app en MongoDB'; del.disabled = updatingApps;
    del.addEventListener('click', () => deleteAppHistory(app));
    right.append(toggle,del);row.append(left,right);list.append(row);
  }
}
async function setApp(appPackage, enabled) {
  updatingApps = true;renderApps();
  try {
    await request('/api/apps', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ appPackage,enabled }) });
    showToast(enabled ? 'Aplicación permitida: ' + appPackage : 'Aplicación ignorada: ' + appPackage + '. Los registros anteriores siguen guardados hasta que los borres.');
    await refreshApps();
  } catch (err) { showToast(err.message); }
  finally {updatingApps=false;renderApps();}
}
async function deleteAppHistory(app) {
  if (!confirm('¿Borrar todas las notificaciones antiguas de ' + app.appName + ' guardadas en MongoDB?')) return;
  try {
    const data = await request('/api/notifications?app=' + encodeURIComponent(app.appPackage), {method:'DELETE'});
    showToast('Eliminadas ' + data.deleted + ' notificaciones antiguas de ' + app.appName);
    await refresh();
  } catch (err) { showToast(err.message); }
}
$('reloadApps').addEventListener('click', refreshApps);
$('appSearch').addEventListener('input', renderApps);
$('addApp').addEventListener('click', async () => {
  const appPackage = $('manualPackage').value.trim();
  if (!/^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(appPackage)) {
    showToast('Paquete inválido. Ejemplo: com.ejemplo.app'); return;
  }
  // Agregar manualmente no concede permiso automáticamente.
  await setApp(appPackage, false); $('manualPackage').value = '';
});
