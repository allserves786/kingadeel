'use strict';

const axios = require('axios');
const yts = require('yt-search');
const { cmd } = require('../command');

const API_URL = 'https://api.makluxnxx.my.id/v1/download/yt-mp3';

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
      return reply('*🎧 GHOST-MD MUSIC PLAYER*\n\nUsage: .play song name\nExample: .play Atif Aslam');
    }

    await reply('🔍 *Searching YouTube...*');

    const search = await yts(q.trim());
    const video = search.videos?.[0];

    if (!video?.url) {
      return reply('❌ YouTube par koi song nahi mila.');
    }

    await conn.sendMessage(from, {
      image: { url: video.thumbnail },
      caption:
        `🎵 *GHOST-MD MUSIC PLAYER*\n\n` +
        `╭━━❐━⪼\n` +
        `┇ 🎶 *TITLE:* ${video.title}\n` +
        `┇ ⏱️ *DURATION:* ${video.timestamp || 'Unknown'}\n` +
        `┇ 👁️ *VIEWS:* ${(video.views || 0).toLocaleString()}\n` +
        `┇ 👤 *AUTHOR:* ${video.author?.name || 'Unknown'}\n` +
        `╰━━❑━⪼\n\n` +
        `⬇️ *Downloading audio...*`
    }, { quoted: mek });

    let audioUrl = null;

    try {
      const res = await axios.get(API_URL, {
        params: { url: video.url },
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      });

      const json = res.data;
      console.log('[PLAY API RESPONSE]', JSON.stringify(json).slice(0, 500));

      audioUrl =
        json?.result?.audio?.url ||
        json?.result?.mp3 ||
        json?.result?.download ||
        json?.result?.url ||
        json?.result?.link ||
        json?.data?.audio?.url ||
        json?.data?.mp3 ||
        json?.data?.url ||
        json?.url ||
        null;

    } catch (err) {
      console.error('[PLAY API ERROR]', err.response?.status || err.message);
      return reply(`❌ API request failed: ${err.response?.status || err.message}`);
    }

    if (!audioUrl || !/^https?:\/\//i.test(audioUrl)) {
      return reply('❌ API se audio link nahi mila.');
    }

    let audioBuffer;
    try {
      const audioResponse = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 120000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'audio/mpeg, audio/*, */*'
        }
      });

      const ct = String(audioResponse.headers['content-type'] || '').toLowerCase();
      if (ct.includes('text/html') || ct.includes('application/json')) {
        return reply('❌ CDN ne audio ke bajaye HTML/JSON return kiya.');
      }

      audioBuffer = Buffer.from(audioResponse.data);
    } catch (error) {
      console.error('[PLAY AUDIO DOWNLOAD ERROR]', error.response?.status || error.message);
      return reply(`❌ Audio download failed: ${error.response?.status || error.message}`);
    }

    if (!audioBuffer || audioBuffer.length < 1000) {
      return reply('❌ Audio file empty ya incomplete hai.');
    }

    console.log(`[PLAY] Downloaded ${audioBuffer.length} bytes`);

    const safeTitle = video.title.replace(/[\\/:*?"<>|]/g, '').slice(0, 90);

    await conn.sendMessage(from, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName: `${safeTitle}.mp3`,
      ptt: false
    }, { quoted: mek });

    await conn.sendMessage(from, {
      react: { text: '✅', key: mek.key }
    });

  } catch (error) {
    console.error('[PLAY GENERAL ERROR]', error.stack || error);
    await conn.sendMessage(from, {
      react: { text: '❌', key: mek.key }
    }).catch(() => {});
    await reply('❌ *Song processing failed!* Logs check karein.');
  }
});
