module.exports = {
  name: "inviteCreate",
  async execute(invite, client) {
    const guildInvites = await invite.guild.invites.fetch();
    client.inviteCache.set(invite.guild.id, guildInvites);
  }
};
