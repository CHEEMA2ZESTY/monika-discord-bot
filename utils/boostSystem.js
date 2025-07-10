const db = require('../firebase');

const boostRoles = [
  { min: 5, roleId: process.env.BOOST_ROLE_TIER4_ID, xp: 50000, credits: 5 },
  { min: 3, roleId: process.env.BOOST_ROLE_TIER3_ID, xp: 20000, credits: 3 },
  { min: 2, roleId: process.env.BOOST_ROLE_TIER2_ID, xp: 10000, credits: 1 },
  { min: 1, roleId: process.env.BOOST_ROLE_TIER1_ID, xp: 5000, credits: 0 },
];

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
      spinCount: 0,
      boostCredits: 0
    };

    // Match boost tier
    let rewardTier = boostRoles.find(t => guild.premiumTier >= t.min);
    if (!rewardTier) continue;

    // Update XP and Boost Credits
    userData.xp += rewardTier.xp;
    userData.boostCredits = (userData.boostCredits || 0) + rewardTier.credits;

    // 🔁 Remove other boost roles and assign correct tier
    const allBoostRoleIds = boostRoles.map(t => t.roleId);
    const rolesToRemove = allBoostRoleIds.filter(
      id => member.roles.cache.has(id) && id !== rewardTier.roleId
    );
    await member.roles.remove(rolesToRemove).catch(() => {});
    await member.roles.add(rewardTier.roleId).catch(() => {});

    // Save to Firestore
    await userRef.set(userData, { merge: true });

    // Log the boost sync
    if (logChannel) {
      logChannel.send(
        `🚀 <@${userId}> synced as booster — +${rewardTier.xp} XP, +${rewardTier.credits} boost credit(s)`
      ).catch(() => {});
    }
  }
}

module.exports = { handleBoostSync };
