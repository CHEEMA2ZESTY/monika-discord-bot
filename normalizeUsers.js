const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Firebase init
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = admin.firestore();

const usersPath = path.join(__dirname, 'data', 'users.json');
const users = require(usersPath);

async function migrateUsers() {
  for (const userId in users) {
    const user = users[userId];
    const normalized = {
      xp: user.xp ?? 0,
      credits: user.credits ?? 0,
      spinCount: user.spinCount ?? 0,
      lastDaily: user.lastDaily ?? null,
      lastSpin: user.lastSpin ?? null,
      items: Array.isArray(user.items) ? user.items : [],
      boostCredits: user.boostCredits ?? 0
    };

    try {
      await db.collection('users').doc(userId).set(normalized, { merge: true });
      console.log(`✅ Migrated: ${userId}`);
    } catch (err) {
      console.error(`❌ Failed: ${userId}`, err.message);
    }
  }

  console.log('🎉 All users attempted.');
}

migrateUsers();
