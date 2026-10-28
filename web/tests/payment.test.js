const test = require('node:test');
const assert = require('node:assert/strict');
const { parseAmount, classifyPayment } = require('../api/_lib/payment');
const { parseNotification } = require('../api/_lib/sanitize');
const sample = { deviceId:'android-demo', eventId:'c'.repeat(64), appPackage:'pe.ejemplo.pagos', title:'Pago recibido', postedAt:Date.now() };
test('identifica monto y remitente en ejemplo narrativo', () => {
  const got = parseNotification({...sample, message:'Juan envió S/ 200 soles'});
  assert.equal(got.payment.amount, 200);
  assert.equal(got.payment.sender, 'Juan');
  assert.equal(got.payment.verification, 'no_verificado');
});
test('formatea diferentes cantidades', () => {
  assert.equal(parseAmount('1,234.56'), 1234.56);
  assert.equal(parseAmount('1.234,56'), 1234.56);
  assert.equal(parseAmount('200'), 200);
});
test('no inventa pagos cuando no hay texto de pago', () => {
  assert.equal(classifyPayment('Descuento', 'Tus puntos: S/ 200'), null);
});
test('almacena notificaciones generales sin pago', () => {
  const got = parseNotification({...sample, title:'Recordatorio', message:'Reunión a las 10'});
  assert.equal(got.payment, null);
});
