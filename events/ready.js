module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`🤖 Logged in as ${client.user.tag}`);

    client.inviteCache = new Map();

    // Cache invites for all guilds
    for (const [guildId, guild] of client.guilds.cache) {
      const invites = await guild.invites.fetch();
      client.inviteCache.set(guildId, invites);
    }

    console.log("📥 Invite cache initialized.");
  }
};
