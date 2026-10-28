const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const authPath = path.resolve(__dirname, '../lib/auth.js');
const dbPath = path.resolve(__dirname, '../lib/db.js');
const documents = new Map();
const db = { collection(name) {
  if (name === 'app_permissions') return {
    updateOne: async (filter, update) => {
      documents.set(filter._id, { _id: filter._id, ...documents.get(filter._id), ...update.$set });
    },
    find: () => ({ toArray: async () => [...documents.values()] })
  };
  if (name === 'app_catalog') return { find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => [] }) }) }) };
  throw new Error('Colección inesperada');
}};
require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: {
  isLoggedIn: () => true, getBody: r => r.body, respond: (res, code, body) => { res.statusCode = code; res.body = body; return body; }
}};
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { database: async () => db } };
const handler = require('../api/apps');
const response = () => ({ statusCode: 0, body: null });

test('agregar app manual crea permiso desactivado y conserva el nombre', async () => {
  const res = response();
  await handler({ method: 'POST', body: { appPackage: 'com.ejemplo.banco', appName: 'Mi banco', enabled: false } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(documents.get('com.ejemplo.banco').enabled, false);
  assert.equal(documents.get('com.ejemplo.banco').appName, 'Mi banco');
  const getRes = response();
  await handler({method:'GET'}, getRes);
  assert.equal(getRes.body.apps[0].appName, 'Mi banco');
  assert.equal(getRes.body.apps[0].enabled, false);
});

test('bloquea un paquete inválido', async () => {
  const res = response();
  await handler({ method: 'POST', body: { appPackage: '$where', appName: 'Malo', enabled: false } }, res);
  assert.equal(res.statusCode, 400);
});

test('cambiar permiso no borra el nombre personalizado', async () => {
  const res = response();
  await handler({ method: 'POST', body: { appPackage: 'com.ejemplo.banco', enabled: true } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(documents.get('com.ejemplo.banco').appName, 'Mi banco');
  assert.equal(documents.get('com.ejemplo.banco').enabled, true);
});
