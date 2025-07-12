const applyMutePermissions = require('../utils/applyMutePermissions');
const { ChannelType, PermissionsBitField } = require('discord.js');

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`🤖 Logged in as ${client.user.tag}`);

    client.inviteCache = new Map();

    // 📥 Cache invites for all guilds
    for (const [guildId, guild] of client.guilds.cache) {
      const invites = await guild.invites.fetch();
      client.inviteCache.set(guildId, invites);
    }
    console.log("📥 Invite cache initialized.");

    // 🔒 Reapply muted role restrictions
    try {
      const guild = client.guilds.cache.get(process.env.GUILD_ID);
      if (guild) {
        await applyMutePermissions(guild, process.env.MUTED_ROLE_ID);
        console.log('🔇 Mute permissions re-applied to all channels.');
      }
    } catch (err) {
      console.error('❌ Failed to re-apply mute restrictions:', err);
    }

    // 🔐 Re-apply lockdown restrictions
    try {
      const guild = client.guilds.cache.get(process.env.GUILD_ID);
      if (!guild) return;

      const channels = guild.channels.cache.filter(ch =>
        ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement
      );

      for (const channel of channels.values()) {
        const overwrite = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
        if (overwrite && overwrite.deny.has(PermissionsBitField.Flags.SendMessages)) {
          // Already locked down – reapply just in case
          await channel.permissionOverwrites.edit(guild.roles.everyone, {
            SendMessages: false
          });
        }
      }

      console.log('🔐 Lockdown restrictions re-applied where needed.');
    } catch (err) {
      console.error('❌ Failed to re-apply lockdown restrictions:', err);
    }
  }
};
