const { equalSecret, makeSession, getBody, respond } = require('../lib/auth');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return respond(res, 405, { error: 'Método no permitido' });
  const { password } = getBody(req) || {};
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12 || !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    return respond(res, 503, { error: 'Configuración del servidor incompleta' });
  }
  if (!equalSecret(password, process.env.ADMIN_PASSWORD)) return respond(res, 401, { error: 'Contraseña incorrecta' });
  res.setHeader('Set-Cookie', 'notiweb_session=' + makeSession() + '; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Strict');
  return respond(res, 200, { ok: true });
};
