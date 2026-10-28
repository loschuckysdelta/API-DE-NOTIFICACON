const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/compilar-apk.yml'), 'utf8');
test('GitHub Actions crea y publica el APK en la ubicación de Vercel', () => {
  assert.match(workflow, /assembleDebug/);
  assert.match(workflow, /contents: write/);
  assert.match(workflow, /public\/downloads\/NotiWeb\.apk/);
  assert.match(workflow, /git push origin/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
});
test('PowerShell sube la carpeta del workflow', () => {
  const script = fs.readFileSync(path.join(root, 'SUBIR-A-GITHUB.ps1'), 'utf8');
  assert.match(script, /'.github'/);
});
test('El panel explica la compilación automática y descarga el APK sólo si existe', () => {
  const install = fs.readFileSync(path.join(root,'public/install.js'),'utf8');
  assert.match(install, /Compilar y publicar APK Android NotiWeb/);
  assert.match(install, /method: 'HEAD'/);
});
