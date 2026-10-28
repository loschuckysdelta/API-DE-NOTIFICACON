const { respond } = require('./_lib/auth');
module.exports = (req, res) => {
  if (req.method !== 'GET') return respond(res, 405, { error: 'Método no permitido' });
  return respond(res, 200, { ok: true, service: 'NotiWeb API' });
};
