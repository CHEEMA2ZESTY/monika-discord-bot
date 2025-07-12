// utils/applyMutePermissions.js
module.exports = async function applyMutePermissions(guild, mutedRoleId) {
  const channels = guild.channels.cache.filter(c => c.isTextBased() || c.isVoiceBased());
  
  for (const [, channel] of channels) {
    try {
      const current = channel.permissionOverwrites.cache.get(mutedRoleId);
      if (!current || !current.deny.has('SendMessages')) {
        await channel.permissionOverwrites.edit(mutedRoleId, {
          SendMessages: false,
          AddReactions: false,
          Speak: false
        });
        console.log(`🔇 Muted role applied in #${channel.name}`);
      }
    } catch (err) {
      console.warn(`⚠️ Could not update #${channel.name}:`, err.message);
    }
  }
};
