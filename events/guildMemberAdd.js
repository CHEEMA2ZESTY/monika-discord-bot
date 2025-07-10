const db = require('../firebase');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const cachedInvites = client.inviteCache.get(member.guild.id);
    const newInvites = await member.guild.invites.fetch();

    let usedInvite = null;

    for (const [code, invite] of newInvites) {
      const oldUses = cachedInvites.get(code)?.uses || 0;
      if (invite.uses > oldUses) {
        usedInvite = invite;
        break;
      }
    }

    client.inviteCache.set(member.guild.id, newInvites);

    let inviterId = null;
    if (usedInvite && usedInvite.inviter) {
      inviterId = usedInvite.inviter.id;

      const inviterRef = db.collection('users').doc(inviterId);
      const inviterSnap = await inviterRef.get();
      const inviterData = inviterSnap.exists ? inviterSnap.data() : {
        xp: 0,
        credits: 0,
        lastDaily: null,
        spinsUsed: 0
      };

      await inviterRef.set({
        xp: (inviterData.xp || 0) + 50,
        credits: (inviterData.credits || 0) + 100
      }, { merge: true });

      const logChannel = member.guild.channels.cache.get(process.env.PILL_LOG_CHANNEL_ID);
      logChannel?.send(`🎯 <@${inviterId}> invited <@${member.user.id}> — +50 XP & +100 credits!`);
    } else {
      console.log(`👤 ${member.user.tag} joined, but no inviter could be found.`);
    }

    // Assign default "Warrior" role
    const warriorRole = member.guild.roles.cache.get(process.env.WARRIOR_ROLE_ID);
    if (warriorRole) {
      await member.roles.add(warriorRole).catch(console.error);
    }

    // Send welcome message in Start Here channel
    const welcomeChannel = member.guild.channels.cache.get(process.env.START_HERE_CHANNEL_ID);
    const registrationChannel = member.guild.channels.cache.get(process.env.ROLE_SELECTION_CHANNEL_ID);

    if (welcomeChannel && registrationChannel) {
      welcomeChannel.send({
        content: `👋 Welcome <@${member.user.id}> to **MLBB G&C Server**!\n\n` +
          `You're currently ranked **Warrior** ⚔️ by default.\n\n` +
          `📌 To unlock more channels, please register in ${registrationChannel} using the \`/register\` command.\n\n` +
          `Once registered, you’ll be asked to choose one of the following paths:\n` +
          `🔹 **Verified Seller** – Fill a short form to gain access to the **Marketplace** and **Community Chat**.\n` +
          `🎮 **Gamer** – Instantly unlock the **Gaming Hub**.\n` +
          `👤 Or continue as an **Elite** and vibe in the **Community Chat**.\n\n` +
          `💠 All registered users can earn XP, level up, and enjoy progression perks!\n\n` +
          `Let’s get started! 🫡`
      });
    }

    console.log(`✅ Assigned Warrior role and welcomed ${member.user.tag}`);
  }
};
