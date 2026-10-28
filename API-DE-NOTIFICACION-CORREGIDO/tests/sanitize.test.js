const test = require('node:test');
const assert = require('node:assert/strict');
const {parseNotification,isSensitive} = require('../lib/sanitize');
const sample = { deviceId:'android-abc',eventId:'a'.repeat(64),appPackage:'com.ejemplo.app',title:'Pago recibido',message:'Recibiste un pago de S/ 25',postedAt:Date.now()};
test('permite notificaciones de transacciones',()=>assert.equal(parseNotification(sample).title,'Pago recibido'));
test('excluye OTPs y recuperación de claves',()=>{
  assert.equal(isSensitive('Tu código de verificación','123456'),true);
  assert.equal(parseNotification({...sample,title:'OTP',message:'123456'}).skippedSensitive,true);
});
test('rechaza ids malformados',()=>assert.equal(parseNotification({...sample,deviceId:'$where'}),null));
test('caducidad en 30 días',()=>assert.ok(parseNotification(sample).expiresAt > new Date(Date.now()+29*86400000)));
