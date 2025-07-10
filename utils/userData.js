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

// Add XP to user
async function addXP(userId, amount) {
  const userRef = db.collection('users').doc(userId);
  const doc = await userRef.get();

  let data = doc.exists ? doc.data() : { xp: 0, credits: 0, spinCount: 0, boostCredits: 0 };
  data.xp = (data.xp || 0) + amount;

  await userRef.set(data);
  return data;
}

// Add Credits to user
async function addCredits(userId, amount) {
  const userRef = db.collection('users').doc(userId);
  const doc = await userRef.get();

  let data = doc.exists ? doc.data() : { xp: 0, credits: 0, spinCount: 0, boostCredits: 0 };
  data.credits = (data.credits || 0) + amount;

  await userRef.set(data);
  return data;
}

module.exports = {
  getUser,
  addXP,
  addCredits
};
