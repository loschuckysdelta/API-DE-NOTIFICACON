const { equalSecret, getBody, respond } = require('./_lib/auth');
const { collection } = require('./_lib/db');
const { parseNotification } = require('./_lib/sanitize');
const { allowed } = require('./_lib/policy');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return respond(res, 405, { error: 'Método no permitido' });
  const configuredToken = process.env.INGEST_TOKEN;
  if (!configuredToken || configuredToken.length < 32) return respond(res, 503, { error: 'Configura INGEST_TOKEN' });
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ') || !equalSecret(header.slice(7), configuredToken)) return respond(res, 401, { error: 'No autorizado' });
  const raw = req.body;
  if (JSON.stringify(raw || {}).length > 18000) return respond(res, 413, { error: 'Contenido muy grande' });
  const item = parseNotification(getBody(req));
  if (!item) return respond(res, 400, { error: 'Notificación inválida' });
  if (item.skippedSensitive) return respond(res, 200, { ok: true, skippedSensitive: true });
  try {
    if (!await allowed(item.appPackage)) return respond(res, 200, { ok: true, ignored: true });
    await (await collection()).updateOne({ deviceId: item.deviceId, eventId: item.eventId }, { $setOnInsert: item }, { upsert: true });
    return respond(res, 200, { ok: true });
  } catch (e) {
    console.error('MongoDB error', e.code || e.name);
    return respond(res, 503, { error: 'No se pudo guardar en MongoDB' });
  }
};
