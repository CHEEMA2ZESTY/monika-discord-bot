const cooldowns = {};
const COOLDOWN_TIME = 24 * 60 * 60 * 1000; // 24 hours

function isSpinOnCooldown(userId) {
  const last = cooldowns[userId];
  if (!last) return false;
  return Date.now() - last < COOLDOWN_TIME;
}

function getCooldownRemaining(lastTimestamp) {
  const remaining = COOLDOWN_TIME - (Date.now() - lastTimestamp);
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

function setSpinCooldown(userId) {
  cooldowns[userId] = Date.now();
}

module.exports = {
  isSpinOnCooldown,
  setSpinCooldown,
  getCooldownRemaining,
};
