const { canRead, isLoggedIn, respond } = require('../lib/auth');
const { collection } = require('../lib/db');
const { txt } = require('../lib/sanitize');
const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
module.exports = async (req, res) => {
  if (!canRead(req)) return respond(res, 401, { error: 'No autorizado: inicia sesión o usa READ_TOKEN' });
  if (!['GET', 'DELETE'].includes(req.method)) return respond(res, 405, { error: 'Método no permitido' });
  if (req.method === 'DELETE' && !isLoggedIn(req)) return respond(res, 403, { error: 'Solo el administrador puede borrar registros' });
  try {
    const c = await collection();
    if (req.method === 'DELETE') {
      const pkg = txt(req.query?.app || '', 180);
      if (pkg && !/^[a-zA-Z0-9_.-]{3,180}$/.test(pkg)) return respond(res, 400, { error: 'Paquete inválido' });
      const result = await c.deleteMany(pkg ? { appPackage: pkg } : {});
      return respond(res, 200, { ok: true, deleted: result.deletedCount });
    }
    const query = {};
    const device = txt(req.query?.device || '', 64);
    const app = txt(req.query?.app || '', 180);
    const search = txt(req.query?.search || '', 80);
    const type = txt(req.query?.type || '', 16);
    if (device) {
      if (!/^[a-zA-Z0-9_.-]{3,64}$/.test(device)) return respond(res, 400, { error: 'Dispositivo inválido' });
      query.deviceId = device;
    }
    if (app) {
      if (!/^[a-zA-Z0-9_.-]{3,180}$/.test(app)) return respond(res, 400, { error: 'Aplicación inválida' });
      query.appPackage = app;
    }
    if (type) {
      if (!['payment', 'general'].includes(type)) return respond(res, 400, { error: 'Tipo inválido' });
      query['payment.amount'] = type === 'payment' ? { $exists: true } : { $exists: false };
    }
    if (search) {
      // Escapar siempre los caracteres especiales para evitar regex costosas personalizadas.
      const safe = escapeRegex(search);
      query.$or = ['title', 'message', 'deviceName', 'appName'].map(k => ({ [k]: { $regex: safe, $options: 'i' } }));
    }
    const limit = Math.min(200, Math.max(1, Number.parseInt(req.query?.limit, 10) || 100));
    const page = Math.min(100, Math.max(1, Number.parseInt(req.query?.page, 10) || 1));
    const [total, docs] = await Promise.all([
      c.countDocuments(query),
      c.find(query, { projection: { eventId: 0, expiresAt: 0 } })
        .sort({ receivedAt: -1 }).skip((page - 1) * limit).limit(limit).toArray()
    ]);
    return respond(res, 200, {
      ok: true, total, page, limit, pages: Math.ceil(total / limit),
      notifications: docs.map(doc => ({ ...doc, _id: String(doc._id) }))
    });
  } catch (e) {
    console.error('MongoDB error', e.code || e.name);
    return respond(res, 503, { error: 'No se pudo consultar MongoDB' });
  }
};
