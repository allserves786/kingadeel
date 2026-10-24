// plugins/boydp.js — Ghost-MD VIP Boy DP
const { cmd } = require('../command');

const boyDpUrls = [
  'https://files.catbox.moe/y1l7ed.jpg',
  'https://files.catbox.moe/4kujce.jpg',
  'https://files.catbox.moe/vrrn72.jpg',
  'https://files.catbox.moe/7w87wk.jpg',
  'https://files.catbox.moe/jf7cwz.jpg',
  'https://files.catbox.moe/gc3c1g.jpg',
  'https://files.catbox.moe/nufhim.jpg',
  'https://files.catbox.moe/yfce44.jpg',
  'https://files.catbox.moe/gdhv0h.jpg',
  'https://files.catbox.moe/ptwcm0.jpg',
  'https://files.catbox.moe/3upyka.jpg',
  'https://files.catbox.moe/erj2f8.jpg',
  'https://files.catbox.moe/g50vs5.jpg',
  'https://files.catbox.moe/1jta5y.jpg',
  'https://files.catbox.moe/siph10.jpg',
  'https://files.catbox.moe/mxlbfq.jpg',
  'https://files.catbox.moe/3aqy6x.jpg',
  'https://files.catbox.moe/0qvy21.jpg',
  'https://files.catbox.moe/szdoa0.jpg',
  'https://files.catbox.moe/jadoal.jpg',
  'https://files.catbox.moe/yfce44.jpg',
  'https://files.catbox.moe/3upyka.jpg'
];

const captions = [
  '> *🔥 Attitude On | 𝐆ʜᴏsᴛ-𝐌ᴅ💀🚩*',
  '> *🖤 VIP Boy DP | 𝐆ʜᴏsᴛ-𝐌ᴅ*',
  '> *⚡ No Cap Just Swag | Ghost-MD*',
  '> *👑 King Mode Active | 𝐆ʜᴏsᴛ-𝐌ᴅ💀🚩*',
  '> *🕶️ Stay Cold | Powered by Ghost-MD*'
];

function pickCaption() {
  return captions[Math.floor(Math.random() * captions.length)];
}

async function sendDp(conn, from, mek, reply, url, extra = '') {
  try {
    await conn.sendMessage(
      from,
      {
        image: { url },
        mimetype: 'image/jpeg',
        caption: `مــــؔــــافـــــؔــیــــا عــؔــدیــؔـــــل`
      },
      { quoted: mek }
    );
  } catch (e) {
    console.error('BoyDP Error:', e);
    await reply('❌ DP send nahi hui. Try again.');
  }
}

// Random Boy DP
cmd({
  pattern: 'boydp',
  alias: ['bdp', 'maledp', 'boydp'],
  react: '👦',
  desc: 'Random VIP attitude boy DP',
  category: 'fun',
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
  const url = boyDpUrls[Math.floor(Math.random() * boyDpUrls.length)];
  await sendDp(conn, from, mek, reply, url, '👦 *Random Boy DP*\n');
});

// Numbered Boy DP 1-22
for (let i = 0; i < boyDpUrls.length; i++) {
  const n = i + 1;
  cmd({
    pattern: `boydp${n}`,
    react: '👦',
    desc: `Boy DP ${n}`,
    category: 'fun',
    filename: __filename
  }, async (conn, mek, m, { from, reply }) => {
    await sendDp(conn, from, mek, reply, boyDpUrls[i], `👦 *Boy DP ${n}*\n`);
  });
}

// Send multiple random DPs
cmd({
  pattern: 'boydp',
  alias: ['boydpall', 'bdps'],
  react: '🔥',
  desc: 'Send 5 random boy DPs',
  category: 'fun',
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
  try {
    await reply('🔥 *Sending 5 VIP Boy DPs...*');
    const shuffled = [...boyDpUrls].sort(() => 0.5 - Math.random()).slice(0, 5);
    for (const url of shuffled) {
      await sendDp(conn, from, mek, reply, url);
    }
  } catch (e) {
    reply('❌ Failed: ' + e.message);
  }
});
