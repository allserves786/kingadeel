
// 𝐆ʜᴏsᴛ-𝐌ᴅ💀🚩
const path = require('path');
const { cmd } = require('../command');

cmd({
  pattern: "del",
  alias: ["delete", "dlt"],
  desc: "Delete any message",
  react: "🗑️",
  category: "admin",
  filename: __filename
}, async (conn, mek, m, { from, reply, quoted, isCreator, isOwner, isAdmins, isBotAdmins, isGroup }) => {
  const chatJid = from || m.chat || mek.key?.remoteJid;
  let targetKey = null;

  if (quoted && quoted.key) {
    targetKey = { ...quoted.key, remoteJid: chatJid };
  } else if (m.quoted && m.quoted.key) {
    targetKey = { ...m.quoted.key, remoteJid: chatJid };
  } else {
    const context = mek.message?.extendedTextMessage?.contextInfo || m.message?.extendedTextMessage?.contextInfo;
    if (context && context.stanzaId) {
      const botNum = conn.user?.id ? conn.user.id.split(':')[0].split('@')[0] : '';
      const partNum = context.participant ? String(context.participant).split('@')[0].split(':')[0] : '';
      targetKey = {
        remoteJid: chatJid,
        id: context.stanzaId,
        participant: context.participant,
        fromMe: Boolean(context.fromMe) || (botNum && partNum === botNum)
      };
    }
  }

  if (!targetKey || !targetKey.id) {
    return reply("❌ Reply to a message!");
  }

  if (!isCreator && !isOwner && !isAdmins && !targetKey.fromMe) {
    return reply("*📛 Only group admins or bot owner can delete messages.*");
  }

  if (isGroup && !targetKey.fromMe && !isBotAdmins) {
    return reply("*❌ I need admin privileges to delete other members' messages.*");
  }

  try {
    await conn.sendMessage(chatJid, { delete: targetKey });
    if ((isGroup && isBotAdmins) || mek.key?.fromMe) {
      await conn.sendMessage(chatJid, { delete: mek.key }).catch(() => {});
    }
  } catch (e) {
    reply("❌ Failed to delete the message.");
  }
});

