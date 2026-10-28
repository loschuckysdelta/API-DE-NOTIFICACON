const crypto = require('crypto');

function equalSecret(input, expected) {
  if (typeof input !== 'string' || typeof expected !== 'string' || !expected) return false;
  const one = crypto.createHash('sha256').update(input).digest();
  const two = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(one, two);
}
function makeSession() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET no configurado');
  const body = Buffer.from(JSON.stringify({ exp: Date.now() + 24 * 3600 * 1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return body + '.' + sig;
}
function isLoggedIn(req) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return false;
  const cookie = String(req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('notiweb_session='));
  const value = cookie && cookie.slice('notiweb_session='.length);
  if (!value || value.length > 500) return false;
  const [body, sig, extra] = value.split('.');
  if (!body || !sig || extra) return false;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (!equalSecret(sig, expected)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return Number.isFinite(parsed.exp) && parsed.exp > Date.now();
  } catch { return false; }
}
function isDevice(req) {
  const token = process.env.INGEST_TOKEN;
  const h = String(req.headers.authorization || '');
  return Boolean(token && token.length >= 32 && h.startsWith('Bearer ') && equalSecret(h.slice(7), token));
}
function canRead(req) {
  if (isLoggedIn(req)) return true;
  const configured = process.env.READ_TOKEN;
  if (!configured || configured.length < 32) return false;
  const h = String(req.headers.authorization || '');
  return h.startsWith('Bearer ') && equalSecret(h.slice(7), configured);
}
function getBody(req) {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return null; }
}
function respond(res, status, data) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(data);
}
module.exports = { equalSecret, makeSession, isLoggedIn, isDevice, canRead, getBody, respond };
