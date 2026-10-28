
'use strict';

const axios = require('axios');
const yts = require('yt-search');
const { cmd } = require('../command');

const API_URL = 'https://api-faa.my.id/faa/ytmp3';

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

    // STEP 1: Request API
    let apiResponse;

    try {
      apiResponse = await axios.get(API_URL, {
        params: { url: video.url },
        timeout: 120000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        },
        validateStatus: status => status >= 200 && status < 300
      });
    } catch (error) {
      console.error('[PLAY API ERROR]', {
        status: error.response?.status,
        message: error.message,
        body: error.response?.data
      });

      return reply(
        `❌ API request failed: HTTP ${
          error.response?.status || error.code || error.message
        }`
      );
    }

    const json = apiResponse.data;

    console.log('[PLAY API RESPONSE]', JSON.stringify(json).slice(0, 1500));

    if (json?.status === false) {
      return reply('❌ API ne song process nahi kiya.');
    }

    // STEP 2: Extract the exact field from your API response
    const audioUrl =
      json?.result?.mp3 ||
      json?.result?.download ||
      json?.result?.url ||
      json?.result?.link ||
      json?.data?.mp3 ||
      json?.data?.download ||
      json?.data?.url ||
      json?.mp3 ||
      json?.download ||
      json?.url;

    if (
      typeof audioUrl !== 'string' ||
      !/^https?:\/\//i.test(audioUrl)
    ) {
      console.error('[PLAY] Audio URL missing:', json);

      return reply(
        '❌ API response mein audio link nahi mila. Logs check karo.'
      );
    }

    // STEP 3: Download audio from CDN
    let audioBuffer;

    try {
      const audioResponse = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 120000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'audio/mpeg, audio/*, */*'
        },
        validateStatus: status => status >= 200 && status < 300
      });

      const contentType = String(
        audioResponse.headers['content-type'] || ''
      ).toLowerCase();

      if (
        contentType.includes('text/html') ||
        contentType.includes('application/json')
      ) {
        console.error('[PLAY CDN ERROR]', {
          contentType,
          body: Buffer.from(audioResponse.data)
            .toString('utf8')
            .slice(0, 500)
        });

        return reply(
          '❌ CDN ne audio ke bajaye HTML/JSON return kiya.'
        );
      }

      audioBuffer = Buffer.from(audioResponse.data);

    } catch (error) {
      console.error('[PLAY AUDIO DOWNLOAD ERROR]', {
        status: error.response?.status,
        message: error.message,
        url: error.config?.url,
        body: error.response?.data
          ? Buffer.from(error.response.data)
              .toString('utf8')
              .slice(0, 500)
          : undefined
      });

      if (error.response?.status === 403) {
        return reply(
          '❌ *CDN ACCESS DENIED (403)*\n\n' +
          'API ne link diya hai, lekin audio server ne request reject ki.\n' +
          'Valid CDN access/link ya provider support ki zaroorat hai.'
        );
      }

      return reply(
        `❌ Audio download failed: HTTP ${
          error.response?.status || error.code || error.message
        }`
      );
    }

    // STEP 4: Validate audio
    if (!audioBuffer || audioBuffer.length < 1000) {
      return reply('❌ Audio file empty ya incomplete hai.');
    }

    console.log(
      `[PLAY] Downloaded ${audioBuffer.length} bytes`
    );

    // STEP 5: Send audio to WhatsApp
    const safeTitle = (
      json?.result?.title ||
      video.title ||
      'song'
    ).replace(/[\\/:*?"<>|]/g, '').slice(0, 90);

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

    await reply(
      '❌ *Song processing failed!*\n\n' +
      'Hosting logs mein PLAY GENERAL ERROR check karo.'
    );
  }
});
