'use strict';

const axios = require('axios');
const yts = require('yt-search');
const { cmd } = require('../command');

const ASWIN_API = 'https://api-aswin-sparky.koyeb.app/api/downloader/song';

// Audio magic bytes check — HTML/JSON page ko audio samajh kar nahi bhejte
function sniffAudio(buf) {
  if (!buf || buf.length < 20000) return null;
  const b = buf;
  // MP3: ID3 ya 0xFF 0xFB/0xF3/0xF2
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return 'audio/mpeg';
  if (b[0] === 0xFF && (b[1] & 0xE0) === 0xE0) return 'audio/mpeg';
  // M4A: ftyp
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return 'audio/mp4';
  // OGG: OggS
  if (b[0] === 0x4F && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53) return 'audio/ogg';
  // WebM/Matroska: 0x1A 0x45 0xDF 0xA3
  if (b[0] === 0x1A && b[1] === 0x45 && b[2] === 0xDF && b[3] === 0xA3) return 'audio/webm';
  // WAV: RIFF....WAVE
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) return 'audio/wav';
  return null;
}

cmd({
  pattern: 'play',
  desc: 'Play YouTube Audio as MP3',
  category: 'download',
  react: '🎵',
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q || !q.trim()) {
      return reply('🎵 Example:\n.play pasoori\n.play https://youtu.be/xxx');
    }

    let videoUrl;
    let title = '🎵 Audio';
    let artist = '🔥 Unknown Artist';
    let duration = '';
    let thumbnail = 'https://i.ytimg.com/vi/default/hqdefault.jpg';
    let views = '';

    const isUrl = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(q.trim());

    if (isUrl) {
      videoUrl = q.trim();
      try {
        const search = await yts(videoUrl);
        if (search?.videos?.length) {
          const vid = search.videos[0];
          title = vid.title;
          artist = vid.author?.name || '🔥 Unknown Artist';
          duration = vid.timestamp || '';
          thumbnail = vid.thumbnail;
          views = vid.views || '';
        }
      } catch (e) {
        console.log('[PLAY] yts info fail:', e.message);
      }
    } else {
      const search = await yts(q.trim());
      if (!search.videos?.length) {
        return reply('❌ No audio found. Please try another song!');
      }
      const vid = search.videos[0];
      videoUrl = vid.url;
      title = vid.title;
      artist = vid.author?.name || '🔥 Unknown Artist';
      duration = vid.timestamp || '';
      thumbnail = vid.thumbnail;
      views = vid.views || '';
    }

    const caption = `
*╭┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*
*│ ◉ 🎵 ${title.slice(0, 30)}${title.length > 30 ? '...' : ''}*
*│ ◉ 👩‍🎤 ${artist}*
*│ ◉ ⏱️ ${duration || 'Unknown'}*
*│ ◉ 👁️ ${views || 'N/A'} views*
*│ ◉ 📥 Processing...*
*╰┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*
> 🌪️ 𝗚𝗛𝗢𝗦𝗧-𝗠𝗗 🌪️
    `;

    await conn.sendMessage(from, {
      image: { url: thumbnail || 'https://files.catbox.moe/6a48t4.png' },
      caption
    }, { quoted: mek });

    let audioBuf = null;
    let audioMime = 'audio/mpeg';
    const apiUrls = [];

    // 1) Aswin API — search se seedha MP3 link
    try {
      const aswinQuery = isUrl && title !== '🎵 Audio' ? title : q.trim();
      const { data } = await axios.get(`${ASWIN_API}?search=${encodeURIComponent(aswinQuery)}`, {
        timeout: 90000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const u = data?.data?.url;
      if (u) {
        apiUrls.push(u);
        console.log('[PLAY] Aswin API OK:', data?.data?.title || u.slice(0, 60));
      } else {
        console.log('[PLAY] Aswin API: no url in response');
      }
    } catch (e) {
      console.log('[PLAY] Aswin API fail:', e.message);
    }

    // 2) Arslan API — last resort
    try {
      const { data } = await axios.get(
        `https://arslan-apis-v2.vercel.app/download/ytmp3?url=${encodeURIComponent(videoUrl)}`,
        { timeout: 60000, headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const u = data?.result?.download?.url;
      if (u) {
        apiUrls.push(u);
        console.log('[PLAY] Arslan API OK');
      }
    } catch (e) {
      console.log('[PLAY] Arslan API fail:', e.message);
    }

    // Har link try karo — sirf verified audio accept karo
    for (const u of apiUrls) {
      try {
        const resp = await axios.get(u, {
          responseType: 'arraybuffer',
          timeout: 90000,
          maxRedirects: 5,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'audio/mpeg, audio/*, */*',
            'Referer': 'https://www.youtube.com/'
          }
        });
        const buf = Buffer.from(resp.data);
        const mime = sniffAudio(buf);
        if (mime) {
          audioBuf = buf;
          audioMime = mime;
          console.log(`[PLAY] File OK: ${(buf.length / 1024).toFixed(0)} KB ${mime}`);
          break;
        }
        console.log('[PLAY] Link se audio nahi aya (HTML/JSON/empty response)');
      } catch (e) {
        console.log('[PLAY] File fetch fail:', e.response?.status || e.message);
      }
    }

    if (!audioBuf) {
      throw new Error('Could not retrieve audio. Please try again!');
    }

    await conn.sendMessage(from, {
      audio: audioBuf,
      mimetype: audioMime,
      ptt: false
    }, { quoted: mek });

    await conn.sendMessage(from, {
      react: { text: '✅', key: mek.key }
    });

  } catch (err) {
    console.error('[PLAY ERROR]', err.stack || err);
    await conn.sendMessage(from, {
      react: { text: '❌', key: mek.key }
    }).catch(() => {});

    if (err.code === 'ECONNABORTED' || String(err.message).includes('timeout')) {
      return reply('⏳ API timeout. Please try again later.');
    }
    reply(`❌ Audio download failed: ${err.message || 'Unknown error'}`);
  }
});
