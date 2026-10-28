const { isDevice, getBody, respond } = require('../lib/auth');
const { database } = require('../lib/db');
const { validPackage } = require('../lib/policy');
const { txt } = require('../lib/sanitize');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return respond(res, 405, { error: 'Método no permitido' });
  if (!isDevice(req)) return respond(res, 401, { error: 'Token no autorizado' });
  const body = getBody(req);
  const deviceId = txt(body?.deviceId, 64);
  if (!/^[a-zA-Z0-9_.-]{3,64}$/.test(deviceId) || !Array.isArray(body?.apps) || body.apps.length > 250)
    return respond(res, 400, { error: 'Catálogo inválido' });
  const unique = new Map();
  for (const app of body.apps) {
    if (validPackage(app?.appPackage)) unique.set(app.appPackage, { name: txt(app.appName, 120) || app.appPackage });
  }
  if (unique.size < 1) return respond(res, 200, { ok: true, apps: 0 });
  try {
    const db = await database();
    const now = new Date();
    await db.collection('app_catalog').bulkWrite([...unique].map(([pkg, info]) => ({
      updateOne: { filter: { _id: pkg }, update: { $set: { name: info.name, seenAt: now }, $addToSet: { devices: deviceId } }, upsert: true }
    })), { ordered: false });
    return respond(res, 200, { ok: true, apps: unique.size });
  } catch (e) { console.error('catalog error', e.code || e.name); return respond(res, 503, { error: 'No se pudo registrar el catálogo' }); }
};
