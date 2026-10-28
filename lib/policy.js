const { database } = require('./db');
const validPackage = p => typeof p === 'string' && /^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(p) && p.length <= 180;
async function allowedPackages() {
  const db = await database();
  const docs = await db.collection('app_permissions').find({ enabled: true }, { projection: { _id: 1 } }).toArray();
  return docs.map(x => x._id);
}
async function allowed(appPackage) {
  const db = await database();
  return Boolean(await db.collection('app_permissions').findOne({ _id: appPackage, enabled: true }));
}
module.exports = { validPackage, allowedPackages, allowed };
