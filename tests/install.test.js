const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pub = path.join(__dirname, '..', 'public');
const read = name => fs.readFileSync(path.join(pub, name), 'utf8');
test('manifiesto PWA válido y con iconos existentes', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.equal(m.display, 'standalone');
  assert.equal(m.start_url, '/');
  for(const icon of m.icons) assert.ok(fs.existsSync(path.join(pub, icon.src.replace(/^\//,''))));
});
test('botones de instalar web y descargar APK presentes', () => {
  const html = read('index.html');
  assert.match(html, /id="installPwa"/);
  assert.match(html, /id="downloadApk"/);
  assert.match(html, /install.js/);
});
test('la descarga solo ofrece un APK si existe', () => {
  const js = read('install.js');
  assert.match(js, /method: 'HEAD'/);
  assert.match(js, /if \(!result.ok\) throw/);
  assert.match(js, /public\/downloads\/NotiWeb.apk/);
});
test('el trabajador no guarda datos bancarios ni rutas API', () => {
  const sw = read('sw.js');
  assert.match(sw, /ICONS.includes\(url.pathname\)/);
  assert.doesNotMatch(sw, /cache.addAll\(\['\/api/);
});
