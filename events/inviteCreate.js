// events/inviteCreate.js
module.exports = {
  name: "inviteCreate",

  async execute(invite, client) {
    try {
      const guildInvites = await invite.guild.invites.fetch();
      client.inviteCache.set(invite.guild.id, guildInvites);
      console.log(`🔗 Invite created in ${invite.guild.name}: ${invite.code}`);
    } catch (err) {
      console.error(`❌ Failed to update invite cache on inviteCreate:`, err);
    }
  }
};
