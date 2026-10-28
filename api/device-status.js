/** Estado de los celulares: no almacena textos, contactos ni contraseñas. */
const { isDevice, isLoggedIn, getBody, respond } = require('../lib/auth');
const { database } = require('../lib/db');
const { txt } = require('../lib/sanitize');
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    if (!isDevice(req)) return respond(res, 401, { error: 'Token del celular inválido' });
    const data = getBody(req) || {};
    const deviceId = txt(data.deviceId, 64);
    if (!/^[a-zA-Z0-9_.-]{3,64}$/.test(deviceId) || typeof data.enabled !== 'boolean' || typeof data.listenerConnected !== 'boolean')
      return respond(res, 400, { error: 'Datos de dispositivo inválidos' });
    try {
      const db = await database();
      await db.collection('devices').updateOne({ _id: deviceId }, {
        $set: {
          name: txt(data.deviceName, 80) || 'Mi Android',
          enabled: data.enabled, listenerConnected: data.listenerConnected,
          lastSeenAt: new Date(), expiresAt: new Date(Date.now() + 30 * 86400000)
        }
      }, { upsert: true });
      return respond(res, 200, { ok: true });
    } catch (e) {
      console.error('device-status POST', e.code || e.name);
      return respond(res, 503, { error: 'No se pudo registrar el celular en MongoDB' });
    }
  }
  if (req.method === 'GET') {
    if (!isLoggedIn(req)) return respond(res, 401, { error: 'No autorizado' });
    try {
      const db = await database();
      const devices = await db.collection('devices').find({}, { projection: { name: 1, enabled: 1, listenerConnected: 1, lastSeenAt: 1 } }).sort({ lastSeenAt: -1 }).limit(50).toArray();
      return respond(res, 200, { ok: true, devices });
    } catch (e) {
      console.error('device-status GET', e.code || e.name);
      return respond(res, 503, { error: 'No se pudieron consultar celulares' });
    }
  }
  return respond(res, 405, { error: 'Método no permitido' });
};
