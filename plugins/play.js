'use strict';

const axios = require('axios');
const yts = require('yt-search');
const { cmd } = require('../command');

// دو APIs، ترتیب سے آزمائیں گے
const API_LIST = [
  { name: 'faa', url: 'https://api-faa.my.id/faa/ytmp3' },
  { name: 'makluxnxx', url: 'https://api.makluxnxx.my.id/v1/download/yt-mp3' }
];

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
      return reply(
        '*🎧 GHOST-MD MUSIC PLAYER*\n\n' +
        'Usage: .play song name\n' +
        'Example: .play Atif Aslam'
      );
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
    let usedApi = null;
    let lastError = null;

    // ترتیب سے دونوں APIs آزمائیں
    for (const api of API_LIST) {
      try {
        console.log(`[PLAY] Trying API: ${api.name}`);
        const res = await axios.get(api.url, {
          params: { url: video.url },
          timeout: 60000,
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json'
          }
        });

        const json = res.data;
        console.log(`[PLAY] ${api.name} response:`, JSON.stringify(json).slice(0, 800));

        // مختلف ممکنہ field paths کو cover کریں
        const candidates = [
          json?.result?.mp3,
          json?.result?.download,
          json?.result?.url,
          json?.result?.link,
          json?.result?.audio,
          json?.data?.mp3,
          json?.data?.download,
          json?.data?.url,
          json?.data?.link,
          json?.data?.audio,
          json?.mp3,
          json?.download,
          json?.url,
          json?.link,
          json?.audio
        ];

        for (const candidate of candidates) {
          if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate)) {
            audioUrl = candidate;
            usedApi = api.name;
            break;
          }
        }

        if (audioUrl) {
          console.log(`[PLAY] Audio URL found via ${api.name}`);
          break;
        }

        lastError = `API ${api.name}: audio link field not found`;
      } catch (e) {
        lastError = `API ${api.name}: ${e.response?.status || e.message}`;
        console.error(`[PLAY] ${api.name} failed:`, lastError);
      }
    }

    if (!audioUrl) {
      console.error('[PLAY] All APIs failed:', lastError);
      return reply(
        `❌ *Dono API fail ho gayi.*\n\nLast error: ${lastError || 'Unknown'}\n\n` +
        'Mumkin hai dono APIs ab available na hon. Logs check karein.'
      );
    }

    // Audio download
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

      const contentType = String(audioResponse.headers['content-type'] || '').toLowerCase();
      if (contentType.includes('text/html') || contentType.includes('application/json')) {
        return reply('❌ CDN ne audio ke bajaye HTML/JSON return kiya.');
      }

      audioBuffer = Buffer.from(audioResponse.data);
    } catch (error) {
      console.error('[PLAY AUDIO DOWNLOAD ERROR]', error.message);
      return reply(`❌ Audio download failed: ${error.response?.status || error.message}`);
    }

    if (!audioBuffer || audioBuffer.length < 1000) {
      return reply('❌ Audio file empty ya incomplete hai.');
    }

    console.log(`[PLAY] Downloaded ${audioBuffer.length} bytes (via ${usedApi})`);

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
