// 𝐆ʜᴏsᴛ-𝐌ᴅ💀🚩
const path = require('path');
const axios = require('axios');
const fetch = require('node-fetch');
const { sleep } = require('../lib/functions');
const { cmd, commands } = require('../command');
const config = require('../config');

cmd({
  pattern: "ship",
  alias: ["match", "love"],
  desc: "Randomly pairs the command user with another group member.",
  react: "❤️",
  category: "fun",
  filename: __filename
}, async (conn, mek, store, { isGroup, reply, sender }) => {
  try {
    if (!isGroup) return reply("❌ This command can only be used in groups.");

    // Fetch group metadata properly
    const groupMetadata = await conn.groupMetadata(mek.chat);
    const participants = groupMetadata.participants.map(user => user.id);

    const specialNumber = config.DEV ? `${config.DEV}@s.whatsapp.net` : null;
    let randomPair;

    if (specialNumber && participants.includes(specialNumber) && sender !== specialNumber) {
      randomPair = specialNumber;
    } else {
      do {
        randomPair = participants[Math.floor(Math.random() * participants.length)];
      } while (randomPair === sender);
    }

    const message = `💘 *Match Found!* 💘\n❤️ @${sender.split("@")[0]} + @${randomPair.split("@")[0]}\n💖 Congratulations! 🎉`;

    await conn.sendMessage(mek.chat, {
      text: message,
      contextInfo: {
        mentionedJid: [sender, randomPair],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363404811118873@newsletter",
          newsletterName: "𝐆ʜᴏsᴛ-𝐌ᴅ",
          serverMessageId: 143
        }
      }
    });

  } catch (error) {
    console.error("❌ Error in ship command:", error);
    reply("⚠️ An error occurred while processing the command. Please try again.");
  }
});
