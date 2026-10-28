const { isLoggedIn, getBody, respond } = require('./_lib/auth');
const { database } = require('./_lib/db');
const { validPackage } = require('./_lib/policy');
module.exports = async (req, res) => {
  if (!isLoggedIn(req)) return respond(res, 401, { error: 'No autorizado' });
  if (!['GET','POST'].includes(req.method)) return respond(res, 405, { error: 'Método no permitido' });
  try {
    const db = await database();
    if (req.method === 'POST') {
      const body = getBody(req) || {};
      if (!validPackage(body.appPackage) || typeof body.enabled !== 'boolean') return respond(res, 400, { error: 'Paquete o estado inválido' });
      await db.collection('app_permissions').updateOne({ _id: body.appPackage }, {
        $set: { enabled: body.enabled, updatedAt: new Date() }
      }, { upsert: true });
      return respond(res, 200, { ok: true, appPackage: body.appPackage, enabled: body.enabled });
    }
    const [catalog, rules] = await Promise.all([
      db.collection('app_catalog').find({}, { projection: { _id: 1, name: 1, devices: 1 } }).sort({ name: 1 }).limit(750).toArray(),
      db.collection('app_permissions').find({}).toArray()
    ]);
    const byPackage = new Map();
    for (const c of catalog) byPackage.set(c._id, { appPackage: c._id, appName: c.name || c._id, devices: c.devices || [], enabled: false });
    for (const r of rules) {
      const item = byPackage.get(r._id) || { appPackage: r._id, appName: r._id, devices: [], enabled: false };
      item.enabled = r.enabled === true;
      byPackage.set(r._id, item);
    }
    return respond(res, 200, { ok: true, apps: [...byPackage.values()].sort((a,b) => a.appName.localeCompare(b.appName)) });
  } catch (e) { console.error('apps error', e.code || e.name); return respond(res, 503, { error: 'No se pudieron consultar los permisos' }); }
};
