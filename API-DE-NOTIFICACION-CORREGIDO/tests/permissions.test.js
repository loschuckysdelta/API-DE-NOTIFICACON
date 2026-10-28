const test = require('node:test');
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const dbPath = resolve(__dirname, '../lib/db.js');
let stored = false;
const rules = new Map();
const notices = { updateOne: async () => { stored = true; } };
const db = {
  collection: name => {
    if (name === 'app_permissions') return {
      findOne: async ({ _id, enabled }) => rules.get(_id) === enabled ? { _id, enabled } : null,
      find: () => ({ toArray: async () => [...rules].filter(x => x[1]).map(x => ({ _id: x[0] })) })
    };
    throw Error('Colección inesperada: ' + name);
  }
};
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { database: async () => db, collection: async () => notices } };
const policy = require('../lib/policy');
const ingest = require('../api/ingest');
const config = require('../api/device-config');
function response() {
  return { statusCode: 0, body: undefined, headers:{}, setHeader(k,v){this.headers[k]=v;}, status(code) {this.statusCode=code; return this;}, json(obj){this.body=obj;return obj;} };
}
const token = 'a'.repeat(64);
process.env.INGEST_TOKEN = token;
const valid = {
  deviceId: 'android-demo-1', deviceName: 'Mi Android', appPackage: 'com.whatsapp', appName: 'WhatsApp',
  eventId: 'c'.repeat(64), title:'Nuevo mensaje',message:'Hola',postedAt: Date.now()
};

test('deniega cualquier paquete no autorizado', async () => {
  stored = false;
  const res = response();
  await ingest({method:'POST',headers:{authorization:'Bearer '+token},body: valid},res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.ignored,true);
  assert.equal(stored,false);
});
test('guarda solo un paquete explícitamente autorizado', async () => {
  rules.set('com.whatsapp',true);
  stored = false;
  const res = response();
  await ingest({method:'POST',headers:{authorization:'Bearer '+token},body: valid},res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.ok,true);
  assert.equal(stored,true);
  rules.set('com.whatsapp',false);
});
test('config lista exclusivamente los paquetes permitidos', async () => {
  rules.set('com.app.lemon',true);
  rules.set('com.whatsapp',false);
  const res=response();
  await config({method:'GET',headers:{authorization:'Bearer '+token}},res);
  assert.equal(res.statusCode,200);
  assert.deepEqual(res.body.allowedApps,['com.app.lemon']);
});
test('rechaza paquetes inválidos y credenciales inválidas', async () => {
  assert.equal(policy.validPackage('com.whatsapp'),true);
  assert.equal(policy.validPackage('com.example.app'),true);
  assert.equal(policy.validPackage('$where'),false);
  const res=response();
  await config({method:'GET',headers:{}},res);
  assert.equal(res.statusCode,401);
});
