const db = require('../firebase');

const boostRoles = [
  { min: 5, roleId: process.env.BOOST_ROLE_TIER4_ID, xp: 50000, credits: 5 },
  { min: 3, roleId: process.env.BOOST_ROLE_TIER3_ID, xp: 20000, credits: 3 },
  { min: 2, roleId: process.env.BOOST_ROLE_TIER2_ID, xp: 10000, credits: 1 },
  { min: 1, roleId: process.env.BOOST_ROLE_TIER1_ID, xp: 5000, credits: 0 },
];

const BOOST_CLAIM_MONTH = new Date().toISOString().slice(0, 7); // e.g. "2025-07"

async function handleBoostSync(guild) {
  const logChannel = guild.channels.cache.get(process.env.BOOST_LOG_CHANNEL_ID);

  for (const member of guild.members.cache.values()) {
    if (!member.premiumSince) continue;

    const userId = member.id;
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();
    const userData = doc.exists ? doc.data() : {
      xp: 0,
      credits: 0,
      boostCredits: 0,
      boostHistory: {}
    };

    // Prevent re-claiming boost rewards this month
    if (userData.boostHistory?.[BOOST_CLAIM_MONTH]) continue;

    // Default to Tier 1 if no way to count boost quantity
    let rewardTier = boostRoles.find(t => t.min === 1); // Adjust if you track exact counts

    if (!rewardTier) continue;

    // Apply reward
    const updates = {
      xp: (userData.xp || 0) + rewardTier.xp,
      boostCredits: (userData.boostCredits || 0) + rewardTier.credits,
      boostHistory: {
        ...(userData.boostHistory || {}),
        [BOOST_CLAIM_MONTH]: {
          timestamp: Date.now(),
          tier: rewardTier.min
        }
      }
    };

    // Remove old boost roles and assign current
    const allBoostRoleIds = boostRoles.map(t => t.roleId);
    const rolesToRemove = allBoostRoleIds.filter(
      id => member.roles.cache.has(id) && id !== rewardTier.roleId
    );
    await member.roles.remove(rolesToRemove).catch(() => {});
    await member.roles.add(rewardTier.roleId).catch(() => {});

    // Save user progress
    await userRef.set(updates, { merge: true });

    // Log
    logChannel?.send(
      `🚀 <@${userId}> synced as booster — +${rewardTier.xp} XP, +${rewardTier.credits} boost credit(s)`
    ).catch(() => {});
  }
}

module.exports = { handleBoostSync };
