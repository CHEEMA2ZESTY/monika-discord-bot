const cron = require('node-cron');
const db = require('../firebase');

// ⏰ Runs every month on the 1st at 12:00 AM
cron.schedule('0 0 1 * *', async () => {
  console.log('🔄 Resetting monthly priority listing usage for all sellers...');

  try {
    const snapshot = await db.collection('sellers').get();
    const batch = db.batch();

    snapshot.forEach(doc => {
      const sellerRef = db.collection('sellers').doc(doc.id);
      batch.update(sellerRef, { priorityListingsUsed: 0 });
    });

    await batch.commit();
    console.log('✅ Monthly priority listing usage has been reset.');
  } catch (error) {
    console.error('❌ Failed to reset monthly priority listings:', error);
  }
});
