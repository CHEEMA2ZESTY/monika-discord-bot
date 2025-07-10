const cron = require('node-cron');
const { Timestamp } = require('firebase-admin/firestore');
const db = require('../firebase');

// Milestone thresholds and rewards
const milestones = [
  { spend: 100000, xp: 3000, tokens: 4, spins: 5 },
  { spend: 50000, xp: 1500, tokens: 2, spins: 2 },
  { spend: 10000, xp: 500, tokens: 1, spins: 1 }
];

// 🕛 Run on the 31st of every month at 12:00 AM
cron.schedule('0 0 31 * *', async () => {
  console.log('📆 Running Monthly Buyer Reward Reset Job...');

  const statsSnap = await db.collection('buyerStats').get();

  for (const doc of statsSnap.docs) {
    const userId = doc.id;
    const data = doc.data();
    const spend = data.monthSpend || 0;
    const xp = data.monthXP || 0;

    let reward = null;

    for (const m of milestones) {
      if (spend >= m.spend) {
        reward = m;
        break;
      }
    }

    if (reward) {
      const userRef = db.collection('users').doc(userId);

      await userRef.set({
        xp: reward.xp,
        buyerXP: reward.xp,
        discountTokens: reward.tokens,
        wheelOfLegendsSpins: reward.spins
      }, { merge: true });

      console.log(`✅ ${userId} rewarded: ₦${spend}, +${reward.xp} XP, +${reward.tokens} tokens, +${reward.spins} spins`);
    }

    // Reset buyerStats for the new month
    await doc.ref.set({
      monthSpend: 0,
      monthXP: 0,
      lastReset: Timestamp.now()
    }, { merge: true });
  }

  console.log('✅ Monthly buyer milestone reset completed.');
});
