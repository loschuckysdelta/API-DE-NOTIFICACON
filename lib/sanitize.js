const { classifyPayment } = require('./payment');
function txt(value, length = 500) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, length).trim();
}
// No se almacenan códigos de inicio de sesión ni de recuperación de cuentas.
function isSensitive(title, body) {
  const s = (title + ' ' + body).toLowerCase();
  return /\b(otp|2fa|passcode|password|verification code|one.time password|authentication code)\b/.test(s)
    || /c[oó]digo\s+(?:de\s+)?(?:verificaci[oó]n|seguridad|acceso|inicio|confirmaci[oó]n)/.test(s)
    || /contrase[nñ]a|restablecer (?:tu )?clave|pin de acceso/.test(s);
}
function parseNotification(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const deviceId = txt(body.deviceId, 64);
  const eventId = txt(body.eventId, 128);
  const appPackage = txt(body.appPackage, 180);
  if (!/^[a-zA-Z0-9_.-]{3,64}$/.test(deviceId) ||
      !/^[a-fA-F0-9]{64}$/.test(eventId) ||
      !/^[a-zA-Z0-9_.-]{3,180}$/.test(appPackage)) return null;
  const title = txt(body.title, 350);
  const message = txt(body.message, 1800);
  if (isSensitive(title, message)) return { skippedSensitive: true };
  const rawTime = Number(body.postedAt);
  const postedAt = Number.isFinite(rawTime) && rawTime > Date.now() - 365 * 86400000 && rawTime < Date.now() + 86400000
    ? new Date(rawTime) : new Date();
  return {
    deviceId, eventId, appPackage, postedAt,
    deviceName: txt(body.deviceName, 80) || 'Mi Android',
    appName: txt(body.appName, 120) || appPackage,
    title, message,
    payment: classifyPayment(title, message),
    receivedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  };
}
module.exports = { txt, isSensitive, parseNotification };
