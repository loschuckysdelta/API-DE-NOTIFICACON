const { MongoClient } = require('mongodb');
let promise;
let indexesPromise;
async function database() {
  if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI');
  if (!promise) {
    const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8500, maxPoolSize: 5 });
    promise = client.connect().then(() => client.db(process.env.MONGODB_DB || 'notiweb'));
    promise.catch(() => { promise = undefined; });
  }
  return promise;
}
async function collection() {
  const db = await database();
  const c = db.collection('notificaciones');
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      c.createIndex({ deviceId: 1, eventId: 1 }, { unique: true }),
      c.createIndex({ receivedAt: -1 }),
      c.createIndex({ appPackage: 1, receivedAt: -1 }),
      c.createIndex({ 'payment.amount': 1 }, { sparse: true }),
      c.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    ]);
    indexesPromise.catch(() => { indexesPromise = undefined; });
  }
  await indexesPromise;
  return c;
}
module.exports = { collection, database };
