const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();

const COOLDOWN_TIME = 24 * 60 * 60 * 1000; // 24 hours
const COOLDOWN_COLLECTION = 'pillCooldowns';

async function isOnCooldown(userId) {
  const doc = await db.collection(COOLDOWN_COLLECTION).doc(userId).get();
  if (!doc.exists) return false;

  const lastUsed = doc.data().lastUsed || 0;
  return Date.now() - lastUsed < COOLDOWN_TIME;
}

async function setCooldown(userId) {
  await db.collection(COOLDOWN_COLLECTION).doc(userId).set({
    lastUsed: Date.now()
  });
}

async function getCooldownRemaining(userId) {
  const doc = await db.collection(COOLDOWN_COLLECTION).doc(userId).get();
  if (!doc.exists) return COOLDOWN_TIME;

  const lastUsed = doc.data().lastUsed || 0;
  return Math.max(0, COOLDOWN_TIME - (Date.now() - lastUsed));
}

module.exports = {
  isOnCooldown,
  setCooldown,
  getCooldownRemaining
};
