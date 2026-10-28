
'use strict';

const axios = require('axios');
const yts = require('yt-search');
const { cmd } = require('../command');

const API_BASE = 'https://api-faa.my.id/faa/ytmp3';

function extractAudioUrl(data, depth = 0) {
  if (depth > 6 || data == null) return null;

  if (typeof data === 'string') {
    const value = data.trim();

    if (/^https?:\/\/\S+$/i.test(value)) {
      return value;
    }

    // JSON kabhi string ke andar bhi milta hai
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return extractAudioUrl(JSON.parse(value), depth + 1);
      } catch {}
    }

    return null;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = extractAudioUrl(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof data !== 'object') return null;

  // Common direct download field names
  const keys = [
    'downloadUrl',
    'download_url',
    'audioUrl',
    'audio_url',
    'download',
    'url',
    'link',
    'result',
    'data',
    'response'
  ];

  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null) {
      const found = extractAudioUrl(data[key], depth + 1);
      if (found) return found;
    }
  }

  return null;
}

cmd({
  pattern: 'play',
  alias: ['song', 'mp3', 'plays'],
  react: '🎵',
  desc: 'Search YouTube and get audio',
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

    await reply('🔍 *Searching...*');

    const search = await yts(q.trim());
    const video = search.videos?.[0];

    if (!video?.url) {
      return reply('❌ No matching video found.');
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
        `⏳ *Processing audio...*`
    }, { quoted: mek });

    const response = await axios.get(API_BASE, {
      params: { url: video.url },
      timeout: 120000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json, audio/*, */*'
      },
      maxRedirects: 5,
      validateStatus: status => status >= 200 && status < 300,
      responseType: 'arraybuffer'
    });

    const contentType = String(
      response.headers['content-type'] || ''
    ).toLowerCase();

    let audioBuffer = null;

    // API ne audio file direct return ki ho
    if (
      contentType.startsWith('audio/') ||
      contentType.includes('application/octet-stream')
    ) {
      audioBuffer = Buffer.from(response.data);
    } else {
      const raw = Buffer.from(response.data).toString('utf8');
      let json;

      try {
        json = JSON.parse(raw);
      } catch {
        console.error(
          '[PLAY] Invalid response:',
          contentType,
          raw.slice(0, 300)
        );
        return reply(
          '❌ API ne valid JSON ya audio file return nahi ki.'
        );
      }

      console.log(
        '[PLAY] API response:',
        JSON.stringify(json).slice(0, 1500)
      );

      const audioUrl = extractAudioUrl(json);

      if (!audioUrl) {
        return reply(
          '❌ Audio link response mein nahi mila.\n' +
          'Server logs mein [PLAY] API response check karo.'
        );
      }

      // Audio link ko follow karke actual file download karo
      const audioResponse = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 120000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'audio/*, application/octet-stream, */*'
        },
        validateStatus: status => status >= 200 && status < 300
      });

      const downloadType = String(
        audioResponse.headers['content-type'] || ''
      ).toLowerCase();

      if (
        downloadType.includes('text/html') ||
        downloadType.includes('application/json')
      ) {
        console.error(
          '[PLAY] Download returned non-audio:',
          downloadType
        );
        return reply(
          '❌ Download link ne audio ke bajaye webpage/JSON diya.'
        );
      }

      audioBuffer = Buffer.from(audioResponse.data);
    }

    if (!audioBuffer || audioBuffer.length < 1000) {
      return reply('❌ Audio file empty ya incomplete hai.');
    }

    const safeTitle = (video.title || 'song')
      .replace(/[\\/:*?"<>|]/g, '')
      .slice(0, 90);

    await conn.sendMessage(from, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName: `${safeTitle}.mp3`
    }, { quoted: mek });

    await conn.sendMessage(from, {
      react: { text: '✅', key: mek.key }
    });

  } catch (error) {
    console.error('[PLAY ERROR]', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      contentType: error.response?.headers?.['content-type'],
      response: error.response?.data
        ? Buffer.from(error.response.data)
            .toString('utf8')
            .slice(0, 500)
        : undefined
    });

    await conn.sendMessage(from, {
      react: { text: '❌', key: mek.key }
    }).catch(() => {});

    let message = '❌ *Song download failed!*';

    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT'
    ) {
      message += '\nRequest timeout ho gaya. Dobara try karo.';
    } else if (error.response?.status === 429) {
      message += '\nAPI rate limit hai. Kuch dair baad try karo.';
    } else if (error.response?.status) {
      message += `\nAPI HTTP status: ${error.response.status}`;
    } else {
      message += '\nNetwork ya audio processing error.';
    }

    await reply(message);
  }
});
