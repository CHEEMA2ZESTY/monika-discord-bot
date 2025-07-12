const db = require('../firebase');
const grantXp = require('../utils/grantXp');

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

    const inviterId = usedInvite?.inviter?.id || null;
    const inviteCode = usedInvite?.code || 'unknown';

    // 🎁 XP + Credits reward to inviter (if found)
    if (inviterId) {
      const inviterRef = db.collection('users').doc(inviterId);
      const inviterSnap = await inviterRef.get();
      const inviterData = inviterSnap.exists ? inviterSnap.data() : {};

      const { xpGained, isDouble } = await grantXp(inviterId, 50);

      await inviterRef.set({
        credits: (inviterData.credits || 0) + 100
      }, { merge: true });

      const logChannel = member.guild.channels.cache.get(process.env.PILL_LOG_CHANNEL_ID);
      if (logChannel) {
        logChannel.send(
          `🎯 <@${inviterId}> invited <@${member.user.id}> — +${xpGained} XP & +100 credits!` +
          (isDouble ? ' 💊 (Blue Pill active)' : '')
        ).catch(console.error);
      }
    } else {
      console.log(`👤 ${member.user.tag} joined, but no inviter could be found.`);
    }

    // 🥷 Assign default "Warrior" role
    const warriorRole = member.guild.roles.cache.get(process.env.WARRIOR_ROLE_ID);
    if (warriorRole) {
      await member.roles.add(warriorRole).catch(console.error);
    }

    // 💬 Sassy welcome messages (Monika-mode)
    const welcomeChannel = member.guild.channels.cache.get(process.env.START_HERE_CHANNEL_ID);
    const registrationChannel = member.guild.channels.cache.get(process.env.ROLE_SELECTION_CHANNEL_ID);

    const sassyMessages = [
      `🎉 Look who finally joined — <@${member.user.id}>. Took you long enough.`,
      `👀 New face alert: <@${member.user.id}>. Impress me.`,
      `👑 <@${member.user.id}> just entered. Let’s hope they’re not basic.`,
      `🔥 Another soul joins the game: <@${member.user.id}>. Let’s see what you’ve got.`,
      `💅 Welcome <@${member.user.id}>. No pressure, but Monika is watching.`,
      `🚨 A wild <@${member.user.id}> appeared. Don’t embarrass yourself.`,
      `🎯 <@${member.user.id}> has landed. Ready to prove your worth or nah?`
    ];

    const randomWelcome = sassyMessages[Math.floor(Math.random() * sassyMessages.length)];

    if (welcomeChannel && registrationChannel) {
      welcomeChannel.send({
        content: `${randomWelcome}\n\n📌 To unlock more channels, head to ${registrationChannel} and use \`/register\`.\n\n` +
          `Choose your destiny:\n` +
          `🔹 **Verified Seller** – Get access to the **Marketplace**.\n` +
          `🎮 **Gamer** – Unlock the **Gaming Hub**.\n` +
          `👤 Or chill as an **Elite** in **Community Chat**.\n\n` +
          `🏆 Earn XP, level up, and collect perks as you go.\n\n` +
          `🧭 Invited by: ${inviterId ? `<@${inviterId}>` : 'Unknown'} (Invite Code: ${inviteCode})`
      }).catch(console.error);
    }

    console.log(`✅ Assigned Warrior role and welcomed ${member.user.tag}`);
  }
};
