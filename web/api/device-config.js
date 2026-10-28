const { isDevice, respond } = require('./_lib/auth');
const { allowedPackages } = require('./_lib/policy');
module.exports = async (req, res) => {
  if (req.method !== 'GET') return respond(res, 405, { error: 'Método no permitido' });
  if (!isDevice(req)) return respond(res, 401, { error: 'Token no autorizado' });
  try { return respond(res, 200, { ok: true, allowedApps: await allowedPackages() }); }
  catch (e) { console.error('config error', e.code || e.name); return respond(res, 503, { error: 'Configuración no disponible' }); }
};
