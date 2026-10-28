const { respond, isLoggedIn } = require('../lib/auth');
const { database } = require('../lib/db');
module.exports = async (req, res) => {
  if (req.method !== 'GET') return respond(res, 405, { error: 'Método no permitido' });
  // Comprobación simple pública: no expone el estado de las credenciales.
  if (req.query?.db !== '1') return respond(res, 200, { ok: true, service: 'NotiWeb API' });
  // La comprobación privada sólo responde a una sesión de administrador.
  if (!isLoggedIn(req)) return respond(res, 401, { error: 'Inicia sesión para comprobar MongoDB' });
  try {
    await (await database()).command({ ping: 1 });
    return respond(res, 200, { ok: true, mongodb: 'connected' });
  } catch (error) {
    console.error('Health MongoDB', error.code || error.name);
    return respond(res, 503, { ok: false, mongodb: 'unavailable' });
  }
};
