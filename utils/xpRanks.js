// utils/xpusers.js
const db = require('../firebase');

const rankThresholds = [
  { xp: 100000, roleId: process.env.MYTHICAL_IMMORTAL_ROLE_ID },
  { xp: 75000, roleId: process.env.MYTHICAL_GLORY_ROLE_ID },
  { xp: 50000, roleId: process.env.MYTHICAL_HONOR_ROLE_ID },
  { xp: 25000, roleId: process.env.MYTHIC_ROLE_ID },
  { xp: 15000, roleId: process.env.LEGEND_ROLE_ID },
  { xp: 10000, roleId: process.env.EPIC_ROLE_ID },
  { xp: 5000, roleId: process.env.GRANDMASTER_ROLE_ID },
  { xp: 2500, roleId: process.env.MASTER_ROLE_ID },
  { xp: 1000, roleId: process.env.ELITE_ROLE_ID },
  { xp: 0, roleId: process.env.WARRIOR_ROLE_ID },
];

// Determine rank based on XP
function getRankRole(xp) {
  return rankThresholds.find(rank => xp >= rank.xp);
}

async function checkAndUpdateRank(member) {
  const userId = member.id;
  const userRef = db.collection('users').doc(userId);
  const doc = await userRef.get();

  if (!doc.exists) {
    console.warn(`⚠️ No Firebase record found for user ${userId}`);
    return;
  }

  const userData = doc.data();
  const currentXP = userData.xp || 0;

  const newRank = getRankRole(currentXP);
  if (!newRank || !newRank.roleId) return;

  const currentRoles = member.roles.cache;
  if (currentRoles.has(newRank.roleId)) return; // Already has correct rank

  const allRankRoleIds = rankThresholds.map(r => r.roleId).filter(Boolean);
  const rolesToRemove = currentRoles.filter(role => allRankRoleIds.includes(role.id));

  try {
    if (rolesToRemove.size > 0) await member.roles.remove(rolesToRemove);
    await member.roles.add(newRank.roleId);
    console.log(`🎖️ ${member.user.tag} promoted to rank with role ID ${newRank.roleId}`);
  } catch (err) {
    console.error(`❌ Failed to update rank for ${member.user.tag}:`, err);
  }
}

module.exports = { checkAndUpdateRank, getRankRole };
