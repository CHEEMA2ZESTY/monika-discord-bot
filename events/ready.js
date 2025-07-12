const applyMutePermissions = require('../utils/applyMutePermissions');
const db = require('../firebase');
const { ChannelType, PermissionsBitField, Collection } = require('discord.js');

module.exports = {
  name: "ready",
  once: true,

  async execute(client) {
    console.log(`🤖 Logged in as ${client.user.tag}`);
    client.inviteCache = new Map();

    // 📥 Cache invites for all guilds
    for (const [guildId, guild] of client.guilds.cache) {
      try {
        const invites = await guild.invites.fetch();
        client.inviteCache.set(guildId, invites);
        console.log(`📨 Invite cache initialized for ${guild.name}`);
      } catch (err) {
        console.warn(`⚠️ Could not fetch invites for ${guild.name}:`, err.message);
      }
    }

    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) return;

    // 🔇 Reapply muted role restrictions
    try {
      await applyMutePermissions(guild, process.env.MUTED_ROLE_ID);
      console.log('🔇 Mute permissions re-applied to all channels.');
    } catch (err) {
      console.error('❌ Failed to re-apply mute restrictions:', err);
    }

    // 🔐 Re-apply lockdown restrictions
    try {
      const channels = guild.channels.cache.filter(ch =>
        ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement
      );

      for (const channel of channels.values()) {
        const overwrite = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
        if (overwrite && overwrite.deny.has(PermissionsBitField.Flags.SendMessages)) {
          await channel.permissionOverwrites.edit(guild.roles.everyone, {
            SendMessages: false
          });
        }
      }

      console.log('🔐 Lockdown restrictions re-applied where needed.');
    } catch (err) {
      console.error('❌ Failed to re-apply lockdown restrictions:', err);
    }

    // ⏱ Re-apply timeout restrictions
    try {
      const snapshot = await db.collection('timeouts').get();
      const now = Date.now();

      for (const doc of snapshot.docs) {
        const { userId, expiresAt } = doc.data();
        const member = await guild.members.fetch(userId).catch(() => null);

        if (member && expiresAt > now) {
          const remainingMs = expiresAt - now;
          await member.timeout(remainingMs, 'Reapplying timeout after bot restart');
          console.log(`⏱ Re-applied timeout for ${member.user.tag}`);
        }
      }
    } catch (err) {
      console.error('❌ Failed to re-apply timeouts:', err);
    }

    console.log('✅ All restrictions restored successfully after startup.');
  }
};
