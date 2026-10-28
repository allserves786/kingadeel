
const axios = require('axios');
const yts = require('yt-search');
const { cmd } = require('../command');

const ASWIN_API = 'https://api-aswin-sparky.koyeb.app/api/downloader/song';

cmd({
    pattern: 'audio',
    aliases: ['mp3', 'song', 'gana', 'play', 'ytmp3', 'ytaudio', 'playaudio', 'music', 'melody'],
    desc: 'Download YouTube Audio as MP3',
    category: 'download',
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const text = String(q || '').trim();

        if (!text) {
            return reply('🎵 Example:\n.audio pasoori\n.audio https://youtu.be/xxx');
        }

        let videoUrl;
        let title = '🎵 Audio';
        let artist = 'Unknown Artist';
        let duration = '';
        let thumbnail = 'https://i.ytimg.com/vi/default/hqdefault.jpg';
        let views = '';

        const isUrl = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/i.test(text);

        if (isUrl) {
            videoUrl = text;

            try {
                const search = await yts(text);
                if (search?.videos?.length) {
                    const vid = search.videos[0];
                    title = vid.title || title;
                    artist = vid.author?.name || artist;
                    duration = vid.timestamp || '';
                    thumbnail = vid.thumbnail || thumbnail;
                    views = vid.views || '';
                }
            } catch (e) {
                console.log('[AUDIO] YouTube info error:', e.message);
            }
        } else {
            const search = await yts(text);

            if (!search?.videos?.length) {
                return reply('❌ Koi song nahi mila. Doosra naam try karo.');
            }

            const vid = search.videos[0];
            videoUrl = vid.url;
            title = vid.title || title;
            artist = vid.author?.name || artist;
            duration = vid.timestamp || '';
            thumbnail = vid.thumbnail || thumbnail;
            views = vid.views || '';
        }

        const caption = `
╭────────────────────◇
│ 🔱 𝗤𝗔𝗗𝗘𝗘𝗥-𝘅𝗗 🔱
│ ✿━━━━━━━━━━━━━━━✿
│ 🎵 ${title.slice(0, 40)}
│ 👤 ${artist}
│ ⏱️ ${duration || 'Unknown'}
│ 👁️ ${views || 'N/A'} views
│ 📥 Processing...
╰────────────────────○
> 𝗤𝗔𝗗𝗘𝗘𝗥-𝘅𝗗
        `;

        // Thumbnail send — fakevCard ki zaroorat nahi
        try {
            await conn.sendMessage(from, {
                image: { url: thumbnail },
                caption
            }, { quoted: mek });
        } catch (e) {
            console.log('[AUDIO] Thumbnail send failed:', e.message);
        }

        let audioBuf = null;
        let audioMime = 'audio/mpeg';

        // Try local download engine if available
        try {
            const { sniffAudio, downloadAudioBuffer } = require('../lib/ytDownload');
            const r = await downloadAudioBuffer(videoUrl);

            if (r?.buffer?.length) {
                audioBuf = r.buffer;
                audioMime = r.mimetype || sniffAudio(r.buffer) || 'audio/mpeg';
                console.log('[AUDIO] Local engine OK:', audioBuf.length);
            }
        } catch (e) {
            console.log('[AUDIO] Local engine unavailable/failed:', e.message);
        }

        // API fallback
        if (!audioBuf) {
            const apiUrls = [];

            try {
                const { data } = await axios.get(ASWIN_API, {
                    params: {
                        search: isUrl && title !== '🎵 Audio' ? title : text
                    },
                    timeout: 90000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Accept': 'application/json'
                    }
                });

                const u = data?.data?.url;

                if (u) {
                    apiUrls.push(u);
                } else {
                    console.log('[AUDIO] Aswin API returned no URL');
                }
            } catch (e) {
                console.log('[AUDIO] Aswin API failed:', e.message);
            }

            try {
                const { data } = await axios.get(
                    'https://arslan-apis-v2.vercel.app/download/ytmp3',
                    {
                        params: { url: videoUrl },
                        timeout: 60000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0',
                            'Accept': 'application/json'
                        }
                    }
                );

                const u = data?.result?.download?.url;
                if (u) apiUrls.push(u);
            } catch (e) {
                console.log('[AUDIO] Arslan API failed:', e.message);
            }

            for (const u of apiUrls) {
                try {
                    const resp = await axios.get(u, {
                        responseType: 'arraybuffer',
                        timeout: 90000,
                        maxRedirects: 5,
                        headers: {
                            'User-Agent': 'Mozilla/5.0',
                            'Accept': 'audio/*, application/octet-stream, */*'
                        },
                        validateStatus: () => true
                    });

                    if (resp.status < 200 || resp.status >= 300) {
                        console.log('[AUDIO] File server HTTP:', resp.status);
                        continue;
                    }

                    const buf = Buffer.from(resp.data);

                    let mime = null;
                    try {
                        const { sniffAudio } = require('../lib/ytDownload');
                        mime = sniffAudio(buf);
                    } catch (_) {
                        // Basic MP3 signature check if helper file is absent
                        if (
                            buf.length > 20000 &&
                            (buf.subarray(0, 3).toString() === 'ID3' ||
                            (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0))
                        ) {
                            mime = 'audio/mpeg';
                        }
                    }

                    if (mime && buf.length > 20000) {
                        audioBuf = buf;
                        audioMime = mime;
                        console.log('[AUDIO] API audio verified:', buf.length);
                        break;
                    }

                    console.log('[AUDIO] Response was not a valid audio file');
                } catch (e) {
                    console.log('[AUDIO] Audio URL failed:', e.message);
                }
            }
        }

        if (!audioBuf) {
            return reply(
                '❌ Audio download nahi ho saka.\n' +
                'API unavailable ho sakti hai ya hosting se access blocked hai. Console logs check karo.'
            );
        }

        await conn.sendMessage(from, {
            audio: audioBuf,
            mimetype: audioMime,
            fileName: `${title.replace(/[\\/:*?"<>|]/g, '').slice(0, 80) || 'Qadeer-xD-Song'}.mp3`,
            ptt: false
        }, { quoted: mek });

        console.log(`[AUDIO] Sent successfully: ${title}`);

    } catch (err) {
        console.error('[AUDIO] Error:', err.stack || err.message);

        if (err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '')) {
            return reply('⏳ API timeout. Baad mein dobara try karo.');
        }

        return reply(`❌ Audio download failed: ${err.message || 'Unknown error'}`);
    }
});
