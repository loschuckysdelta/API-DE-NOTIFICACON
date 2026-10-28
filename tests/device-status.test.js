const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const dbPath = path.resolve(__dirname, '../lib/db.js');
let recorded;
const fake = {
  collection(name) {
    assert.equal(name, 'devices');
    return {
      updateOne: async (filter, changes, options) => { recorded = { filter, changes, options }; },
      find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => [] }) }) })
    };
  }
};
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { database: async () => fake } };
const endpoint = require('../api/device-status');
process.env.INGEST_TOKEN = 'v'.repeat(64);
function response() {
  return { statusCode: 0, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.statusCode = code; return this; }, json(obj) { this.body = obj; return obj; } };
}
test('registra celular con token correcto, sin subir texto de notificaciones', async () => {
  const res = response();
  await endpoint({ method: 'POST', headers: { authorization: 'Bearer ' + process.env.INGEST_TOKEN },
    body: { deviceId: 'android-demo-1', deviceName: 'Mi Android', enabled: true, listenerConnected: true, title: 'no almacenar' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(recorded.filter._id, 'android-demo-1');
  assert.equal(recorded.changes.$set.name, 'Mi Android');
  assert.equal(recorded.changes.$set.title, undefined);
});
test('rechaza token inválido', async () => {
  const res = response();
  await endpoint({ method: 'POST', headers: { authorization: 'Bearer wrong' }, body: {} }, res);
  assert.equal(res.statusCode, 401);
});
test('deniega listas de celulares a visitantes anónimos', async () => {
  const res = response();
  await endpoint({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 401);
});
