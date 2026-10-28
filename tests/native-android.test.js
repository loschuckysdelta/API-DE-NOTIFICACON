const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
test('lector Android usa NotificationListenerService y declara permiso especial', () => {
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  const service = read('android/app/src/main/java/com/loschuckys/notiweb/NotiListener.java');
  assert.match(manifest, /android\.permission\.BIND_NOTIFICATION_LISTENER_SERVICE/);
  assert.match(service, /extends NotificationListenerService/);
  assert.match(service, /onNotificationPosted\(StatusBarNotification sbn\)/);
});
test('no transmite si no hay permiso de apps en Vercel', () => {
  const listener = read('android/app/src/main/java/com/loschuckys/notiweb/NotiListener.java');
  const sync = read('android/app/src/main/java/com/loschuckys/notiweb/NotiSync.java');
  assert.match(listener, /if \(!AppPolicy\.isAllowed\(this, sbn\.getPackageName\(\)\)\) return;/);
  assert.match(sync, /if \(!AppPolicy\.isAllowed\(context, item\.optString\("appPackage"\)\)\)/);
});
test('configuración Android incluye prueba de conexión explícita', () => {
  assert.match(read('android/app/src/main/java/com/loschuckys/notiweb/MainActivity.java'), /COMPROBAR CONEXIÓ[Nn] Y SINCRONIZAR APPS/);
  assert.match(read('android/app/src/main/java/com/loschuckys/notiweb/NotiSync.java'), /\/api\/device-status/);
});
