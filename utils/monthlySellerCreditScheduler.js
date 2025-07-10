const cron = require('node-cron');
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();

// 📅 Schedule: 1st of each month at 12:00 AM
cron.schedule('0 0 1 * *', async () => {
  console.log('📦 Running monthly seller credit distributor...');

  try {
    const sellersSnap = await db.collection('sellers').get();
    const vipCredits = [0, 5000, 10000, 15000];

    const updates = sellersSnap.docs.map(async doc => {
      const data = doc.data();
      const tier = data.vipTier || 0;
      const monthlyCredits = vipCredits[tier];

      if (monthlyCredits > 0) {
        await doc.ref.update({
          sellerCredits: (data.sellerCredits || 0) + monthlyCredits
        });
        console.log(`✅ ${doc.id} received +${monthlyCredits} orbs`);
      }
    });

    await Promise.all(updates);
    console.log('🎉 Monthly seller credits distributed successfully.');

  } catch (err) {
    console.error('❌ Error distributing seller credits:', err);
  }
});
