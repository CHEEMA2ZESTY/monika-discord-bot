const db = require('../firebase');

// Get or initialize a user
async function getUser(userId) {
  const userRef = db.collection('users').doc(userId);
  const doc = await userRef.get();

  if (!doc.exists) {
    const defaultData = { xp: 0, credits: 0, spinCount: 0, boostCredits: 0 };
    await userRef.set(defaultData);
    return defaultData;
  }

  return doc.data();
}

// Add XP to user using atomic increment
async function addXP(userId, amount) {
  const userRef = db.collection('users').doc(userId);
  await userRef.set(
    { xp: db.FieldValue.increment(amount) },
    { merge: true }
  );

  const doc = await userRef.get();
  return doc.data();
}

// Add Credits to user using atomic increment
async function addCredits(userId, amount) {
  const userRef = db.collection('users').doc(userId);
  await userRef.set(
    { credits: db.FieldValue.increment(amount) },
    { merge: true }
  );

  const doc = await userRef.get();
  return doc.data();
}

module.exports = {
  getUser,
  addXP,
  addCredits,
};
