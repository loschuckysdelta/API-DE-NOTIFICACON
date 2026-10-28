// Sólo interpreta texto visible de una notificación. NO confirma una transferencia.
function parseAmount(value) {
  let s = String(value).replace(/\s/g, '').replace(/[^0-9,.]/g, '');
  if (!s) return null;
  // 1.234,56 o 1,234.56
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (s.includes(',')) {
    const pos = s.lastIndexOf(',');
    s = (s.length - pos - 1 === 3) ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) && n > 0 && n <= 100000000 ? Math.round(n * 100) / 100 : null;
}

function classifyPayment(title, message) {
  const text = `${title || ''} ${message || ''}`;
  // Busca expresiones de recepción/transferencia, pero no números sueltos de otras alertas.
  const simplified = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cue = /(?:^|[^a-z])(pago|recibiste|recibido|envio|enviado|transferencia|deposito|abono)(?=$|[^a-z])/i;
  if (!cue.test(simplified)) return null;
  const match = text.match(/(?:S\/|PEN\s*|soles?\s*)(\s*[\d][\d,.]*)/i);
  if (!match) return null;
  const amount = parseAmount(match[1]);
  if (!amount) return null;
  let sender = '';
  const p1 = String(message || '').match(/^\s*([\p{L}][\p{L} .'-]{1,74}?)\s+(?:te\s+)?envi[oó]\s+(?:un\s+pago\s+de\s+)?(?:S\/|PEN|\d)/iu);
  const p2 = text.match(/(?:recibiste|recibido|recibiste un pago de)[^.!?]{0,80}?\s+de\s+([\p{L}][\p{L} .'-]{1,74})(?=[.!?]|$)/iu);
  if (p1) sender = p1[1].trim();
  else if (p2) sender = p2[1].trim();
  // El remitente y monto son interpretaciones de texto, no datos verificados de Yape/banco.
  return { amount, currency: 'PEN', sender, verification: 'no_verificado' };
}
module.exports = { parseAmount, classifyPayment };
