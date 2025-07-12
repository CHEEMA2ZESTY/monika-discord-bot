// 📁 utils/grantXp.js
const { FieldValue } = require('firebase-admin/firestore');
const db = require('../firebase');

async function grantXp(userId, baseXp, reason = '') {
  const userRef = db.collection('users').doc(userId);
  const snap = await userRef.get();

  const now = new Date();
  const data = snap.exists ? snap.data() : {};
  const bluePillExpiresAt = data.bluePillExpiresAt?.toDate?.() || null;

  const multiplier = bluePillExpiresAt && bluePillExpiresAt > now ? 2 : 1;
  const totalXp = baseXp * multiplier;

  await userRef.set({ xp: FieldValue.increment(totalXp) }, { merge: true });

  return {
    appliedXp: totalXp,
    doubled: multiplier === 2,
    reason
  };
}

module.exports = grantXp;
