const db = require('../firebase');

const rankThresholds = [
  { xp: 0, roleId: process.env.WARRIOR_ROLE_ID },
  { xp: 1000, roleId: process.env.ELITE_ROLE_ID },
  { xp: 2500, roleId: process.env.MASTER_ROLE_ID },
  { xp: 5000, roleId: process.env.GRANDMASTER_ROLE_ID },
  { xp: 10000, roleId: process.env.EPIC_ROLE_ID },
  { xp: 15000, roleId: process.env.LEGEND_ROLE_ID },
  { xp: 25000, roleId: process.env.MYTHIC_ROLE_ID },
  { xp: 50000, roleId: process.env.MYTHICAL_HONOR_ROLE_ID },
  { xp: 75000, roleId: process.env.MYTHICAL_GLORY_ROLE_ID },
  { xp: 100000, roleId: process.env.MYTHICAL_IMMORTAL_ROLE_ID },
];

// 🧮 Get best matching rank based on XP
function getRankRole(xp) {
  return rankThresholds.reduce((acc, curr) => (xp >= curr.xp ? curr : acc));
}

// 🏅 Check rank and update if needed
async function checkRankUp(userId, member) {
  if (!member) return;

  const userRef = db.collection('users').doc(userId);
  const doc = await userRef.get();
  if (!doc.exists) return;

  const currentXP = doc.data().xp || 0;
  const newRank = getRankRole(currentXP);
  const allRankRoleIds = rankThresholds.map(r => r.roleId);

  // Already has correct rank
  if (!newRank || member.roles.cache.has(newRank.roleId)) return;

  // 🧹 Remove outdated ranks
  const rolesToRemove = member.roles.cache.filter(role =>
    allRankRoleIds.includes(role.id) && role.id !== newRank.roleId
  );

  try {
    if (rolesToRemove.size > 0) await member.roles.remove(rolesToRemove);
    await member.roles.add(newRank.roleId);
  } catch (err) {
    console.error(`❌ Failed to assign rank to ${member.user.tag}:`, err);
    return;
  }

  // 📢 Log in channel
  const logChannel = member.guild.channels.cache.get(process.env.MLBB_LOG_CHANNEL_ID);
  if (logChannel) {
    logChannel.send(`🏅 <@${userId}> ranked up to <@&${newRank.roleId}> with **${currentXP} XP**!`);
  }

  // 💬 DM the user
  try {
    await member.send(`🎉 You’ve ranked up to **<@&${newRank.roleId}>**! Keep grinding!`);
  } catch {
    // DMs are probably disabled
  }

  console.log(`📈 ${member.user.tag} promoted to <@&${newRank.roleId}>`);
}

module.exports = { checkRankUp, getRankRole };
