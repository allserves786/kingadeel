// plugins/tts.js — Ghost-MD Text to Voice (Girl Voice)
const axios = require('axios');
const { cmd } = require('../command');

const VOICES = {
  girl: 'Joanna',
  girl2: 'Salli',
  girl3: 'Kimberly',
  girl4: 'Ivy',
  girl5: 'Emma',
  soft: 'Amy',
  boy: 'Brian',
  man: 'Matthew'
};

async function getVoiceBuffer(text, voice = 'Joanna') {
  // 1) StreamElements
  try {
    const url = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(text)}`;
    const { data, status } = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'audio/mpeg,*/*'
      }
    });

    if (status === 200 && data && data.byteLength > 500) {
      const buf = Buffer.from(data);
      const isMp3 =
        (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) || // "ID3"
        buf[0] === 0xff;                                          // MP3 frame
      if (isMp3) return buf;
    }
    throw new Error('SE bad response');
  } catch (e) {
    console.log('SE TTS fail:', e.message);
  }

  // 2) Google TTS fallback
  try {
    const googleTTS = require('google-tts-api');
    const parts = googleTTS.getAllAudioUrls(text, {
      lang: 'en',
      slow: false,
      host: 'https://translate.google.com',
      splitPunct: ',.?'
    });

    const chunks = [];
    for (const p of parts) {
      const { data } = await axios.get(p.url, {
        responseType: 'arraybuffer',
        timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      chunks.push(Buffer.from(data));
    }
    if (chunks.length) return Buffer.concat(chunks);
  } catch (e) {
    console.log('Google TTS fail:', e.message);
  }

  throw new Error('Voice API failed. Try again later.');
}

cmd({
  pattern: 'tts',
  alias: ['say', 'voice', 'speak', 'girlvoice'],
  react: '🎙️',
  desc: 'Convert text to girl voice audio',
  category: 'fun',
  use: '.tts <text>',
  filename: __filename
}, async (conn, mek, m, { from, q, reply, args }) => {
  try {
    if (!q) {
      return reply(
        `🎙️ *Text to Voice*\n\n` +
        `*Usage:*\n` +
        `• .tts Hello how are you\n` +
        `• .tts girl2 I miss you\n\n` +
        `*Girl voices:* girl, girl2, girl3, girl4, girl5, soft\n` +
        `*Other:* boy, man`
      );
    }

    let voiceKey = 'girl';
    let text = q.trim();

    const first = args[0]?.toLowerCase();
    if (first && VOICES[first]) {
      voiceKey = first;
      text = args.slice(1).join(' ').trim();
    }

    if (!text) return reply('❌ Please write some text after the command.');
    if (text.length > 250) return reply('❌ Max 250 characters allowed.');

    await reply('🎙️ *Generating girl voice...*');

    const voiceName = VOICES[voiceKey] || VOICES.girl;
    const audio = await getVoiceBuffer(text, voiceName);

    await conn.sendMessage(
      from,
      {
        audio,                      // ✅ Buffer bhejo, URL nahi
        mimetype: 'audio/mpeg',
        ptt: false,
        fileName: 'ghost-tts.mp3'
      },
      { quoted: mek }
    );
  } catch (e) {
    console.error('TTS ERROR:', e);
    reply('❌ *Failed:* ' + (e.message || e));
  }
});
