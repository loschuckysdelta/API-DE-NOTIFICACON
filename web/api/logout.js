const { respond } = require('./_lib/auth');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return respond(res, 405, { error: 'Método no permitido' });
  res.setHeader('Set-Cookie', 'notiweb_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict');
  return respond(res, 200, { ok: true });
};
