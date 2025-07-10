const db = require('../firebase');

const COOLDOWN_TIME = 24 * 60 * 60 * 1000; // 24 hours

async function ensureUser(userId) {
  const userRef = db.collection('users').doc(userId);
  const doc = await userRef.get();

  if (!doc.exists) {
    const defaultData = {
      xp: 0,
      credits: 0,
      spinCount: 0,
      boostCredits: 0,
      lastSpin: 0
    };
    await userRef.set(defaultData);
    return defaultData;
  }

  return doc.data();
}

async function isSpinOnCooldown(userId) {
  const userRef = db.collection('users').doc(userId);
  const doc = await userRef.get();

  if (!doc.exists) return false;

  const data = doc.data();
  if (!data.lastSpin) return false;

  return Date.now() - data.lastSpin < COOLDOWN_TIME;
}

async function setSpinCooldown(userId) {
  const userRef = db.collection('users').doc(userId);
  await userRef.update({ lastSpin: Date.now() });
}

async function getCooldownRemaining(userId) {
  const userRef = db.collection('users').doc(userId);
  const doc = await userRef.get();

  if (!doc.exists) return '0h 0m';
  const data = doc.data();
  if (!data.lastSpin) return '0h 0m';

  const remaining = COOLDOWN_TIME - (Date.now() - data.lastSpin);
  if (remaining <= 0) return '0h 0m';

  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

module.exports = {
  ensureUser,
  isSpinOnCooldown,
  setSpinCooldown,
  getCooldownRemaining
};
