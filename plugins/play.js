// plugins/play.js — GHOST-MD STRONG PLAY 🎵
const axios = require('axios');
const yts = require('yt-search');
const { cmd } = require('../command');

const lipx = {
  key: {
    remoteJid: 'status@broadcast',
    fromMe: false,
    id: 'GHOST_PLAY_001',
    participant: '13135550002@s.whatsapp.net'
  },
  message: {
    contactMessage: {
      displayName: '💢 SILENT WORLD 💢',
      vcard: `BEGIN:VCARD
VERSION:3.0
N:Alip;;;;
FN:Alip
TEL;waid=13135550002:+1 313 555 0002
END:VCARD`
    }
  }
};

cmd({
  pattern: 'play',
  alias: ['song', 'mp3', 'plays'],
  react: '🎵',
  desc: 'Download YouTube audio',
  category: 'download',
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q || !q.trim()) {
      return await reply(
        '*🎧 GHOST-MD MUSIC PLAYER*\n\n' +
        'Usage: .play <song name>\n' +
        'Example: .play Atif Aslam songs'
      );
    }

    await reply('🔍 *Searching YouTube...*');

    // 1. Search YouTube
    const search = await yts(q.trim());
    if (!search.videos || !search.videos.length) {
      return await reply('❌ No songs found on YouTube!');
    }

    const video = search.videos[0];

    // 2. Send song information
    await conn.sendMessage(
      from,
      {
        image: { url: video.thumbnail },
        caption:
          `🎵 *GHOST-MD MUSIC PLAYER*\n\n` +
          `╭━━❐━⪼\n` +
          `┇ 🎶 *TITLE:* ${video.title}\n` +
          `┇ ⏱️ *DURATION:* ${video.timestamp}\n` +
          `┇ 👁️ *VIEWS:* ${(video.views || 0).toLocaleString()}\n` +
          `┇ 👤 *AUTHOR:* ${video.author.name}\n` +
          `╰━━❑━⪼\n\n` +
          `⬇️ *Downloading audio...*\n\n` +
          `> POWERED BY MAFIA ADEEL ❤️`,
        contextInfo: {
          mentionedJid: m.sender ? [m.sender] : []
        }
      },
      { quoted: mek }
    );

    // 3. Azbry YouTube MP3 API
    const apiUrl =
      'https://api.azbry.com/api/download/ytmp3?url=' +
      encodeURIComponent(video.url);

    const response = await axios.get(apiUrl, {
      timeout: 90000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json'
      }
    });

    const json = response.data;

    // Expected API response:
    // { status: true, result: { download: "https://..." } }
    const audioUrl = json?.result?.download;

    if (!json?.status || !audioUrl ||
        typeof audioUrl !== 'string' ||
        !/^https?:\/\//i.test(audioUrl)) {
      console.error('PLAY API response:', json);
      return await reply(
        '❌ *Download API failed!*\nPlease try again later.'
      );
    }

    // 4. Send audio using the Baileys-compatible message format
    const safeTitle = (video.title || 'song')
      .replace(/[\\/:*?"<>|]/g, '')
      .slice(0, 90);

    await conn.sendMessage(
      from,
      {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg',
        fileName: `${safeTitle}.mp3`,
        contextInfo: {
          mentionedJid: m.sender ? [m.sender] : []
        }
      },
      { quoted: mek }
    );

    // 5. Success reaction
    await conn.sendMessage(from, {
      react: { text: '✅', key: mek.key }
    });

  } catch (error) {
    console.error(
      'GHOST-MD PLAY ERROR:',
      error.response?.data || error.message || error
    );

    await conn.sendMessage(from, {
      react: { text: '❌', key: mek.key }
    }).catch(() => {});

    await reply(
      '❌ *Song download failed!*\n\n' +
      'API unavailable, timeout, or invalid response.\n' +
      'Please try again in a few minutes.'
    );
  }
});
