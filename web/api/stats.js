const { canRead, respond } = require('./_lib/auth');
const { collection } = require('./_lib/db');
module.exports = async (req, res) => {
  if (req.method !== 'GET') return respond(res, 405, { error: 'Método no permitido' });
  if (!canRead(req)) return respond(res, 401, { error: 'No autorizado' });
  try {
    const c = await collection();
    const day = new Date(Date.now() - 24 * 3600 * 1000);
    const [total, last24h, paymentsDetected, devices, applications] = await Promise.all([
      c.countDocuments({}),
      c.countDocuments({ receivedAt: { $gte: day } }),
      c.countDocuments({ 'payment.amount': { $exists: true } }),
      c.aggregate([{ $group: { _id: '$deviceId', name: { $last: '$deviceName' }, count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 50 }]).toArray(),
      c.aggregate([{ $group: { _id: '$appPackage', name: { $last: '$appName' }, count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 15 }]).toArray()
    ]);
    return respond(res, 200, { ok: true, total, last24h, paymentsDetected, devices, applications,
      note: 'Los pagos son textos detectados en notificaciones; no son transferencias verificadas.' });
  } catch (e) {
    console.error('MongoDB error', e.code || e.name);
    return respond(res, 503, { error: 'No se pudo consultar las estadísticas' });
  }
};
