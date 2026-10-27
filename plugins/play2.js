// plugins/play2.js — GHOST-MD PLAY2 🎵
const axios = require('axios');
const yts = require('yt-search');
const { cmd } = require('../command');

cmd({
  pattern: 'play2',
  alias: ['song2', 'mp32'],
  react: '🎵',
  desc: 'Download YouTube audio (API 2)',
  category: 'download',
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q || !q.trim()) {
      return await reply(
        '*🎧 GHOST-MD MUSIC PLAYER 2*\n\n' +
        'Usage: .play2 <song name>\n' +
        'Example: .play2 Atif Aslam'
      );
    }

    await reply('🔍 *Searching YouTube...*');

    // 1. YouTube search
    const search = await yts(q.trim());
    if (!search.videos || !search.videos.length) {
      return await reply('❌ No songs found on YouTube!');
    }

    const video = search.videos[0];

    // 2. Song info bhejo
    await conn.sendMessage(
      from,
      {
        image: { url: video.thumbnail },
        caption:
          `🎵 *GHOST-MD MUSIC PLAYER 2*\n\n` +
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

    // 3. Naya API: api.makluxnxx.my.id
    const apiUrl =
      'https://api.makluxnxx.my.id/v1/download/yt-mp3?url=' +
      encodeURIComponent(video.url);

    const response = await axios.get(apiUrl, {
      timeout: 90000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json'
      }
    });

    const json = response.data;

    // 4. Flexible response parsing (format confirm nahi hai)
    let audioUrl = null;

    if (json?.result?.download) audioUrl = json.result.download;
    else if (json?.result?.url) audioUrl = json.result.url;
    else if (json?.result?.link) audioUrl = json.result.link;
    else if (json?.data?.download) audioUrl = json.data.download;
    else if (json?.data?.url) audioUrl = json.data.url;
    else if (json?.download) audioUrl = json.download;
    else if (json?.url) audioUrl = json.url;
    else if (typeof json === 'string' && json.startsWith('http')) audioUrl = json;

    if (!audioUrl || typeof audioUrl !== 'string' || !/^https?:\/\//i.test(audioUrl)) {
      console.error('PLAY2 API response:', JSON.stringify(json).slice(0, 500));
      return await reply(
        '❌ *Download API 2 failed!*\nResponse format unexpected.\nPlease try again later.'
      );
    }

    // 5. Audio bhejo
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

    // 6. Success reaction
    await conn.sendMessage(from, {
      react: { text: '✅', key: mek.key }
    });

  } catch (error) {
    console.error(
      'GHOST-MD PLAY2 ERROR:',
      error.response?.data || error.message || error
    );

    await conn.sendMessage(from, {
      react: { text: '❌', key: mek.key }
    }).catch(() => {});

    await reply(
      '❌ *Song download failed (API 2)!*\n\n' +
      'API unavailable, timeout, or invalid response.\n' +
      'Please try again in a few minutes.'
    );
  }
});
