const test = require('node:test');
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const dbPath = resolve(__dirname, '../lib/db.js');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { database: async () => ({ command: async () => ({ ok: 1 }) }) } };
const health = require('../api/health');
function res() {
  return { code: 0, body: null, setHeader() {}, status(n) { this.code=n; return this; }, json(v) { this.body=v; return v; } };
}
test('health pública responde sin datos internos', async () => {
  const out=res(); await health({ method:'GET', query:{}, headers:{} }, out);
  assert.equal(out.code, 200); assert.equal(out.body.ok,true);
  assert.equal(out.body.mongodb, undefined);
});
test('verificación MongoDB requiere sesión del administrador', async () => {
  const out=res(); await health({ method:'GET', query:{db:'1'}, headers:{} }, out);
  assert.equal(out.code, 401);
});
