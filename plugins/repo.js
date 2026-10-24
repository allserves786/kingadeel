// plugins/repo.js — Ghost-MD
const { cmd } = require('../command');

cmd({
  pattern: 'repo',
  alias: ['repository', 'botlink'],
  react: '🌐',
  desc: 'Bot website / repo link',
  category: 'main',
  filename: __filename
}, async (conn, mek, m, { from, sender }) => {
  const link = 'https://ghost-md-bot.vercel.app/';

  const text =
`╭─────────────╮
│  𝐆ʜᴏsᴛ-𝐌ᴅ💀🚩
╰─────────────╯

🌐 *Bot Link:*
${link}

👤 *Owner:* 𝐌ᴀғɪᴀ 𝐀ᴅᴇᴇʟ

> Tap the link to open`;

  await conn.sendMessage(
    from,
    {
      text,
      contextInfo: {
        mentionedJid: [sender],
        externalAdReply: {
          title: 'Ghost-MD Bot',
          body: 'Open official page',
          mediaType: 1,
          sourceUrl: link,
          renderLargerThumbnail: false
        }
      }
    },
    { quoted: mek }
  );
});
