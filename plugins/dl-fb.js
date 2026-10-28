const http = require('http');
const https = require('https');
const { cmd } = require('../command');
const axios = require('axios');


// Create keep-alive agents
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

const UA = "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36";

// ========== GLOBAL CONSTANTS ==========
const TIMEOUT = 20000;

// Create axios instance with global config
const api = axios.create({
    timeout: TIMEOUT,
    httpAgent: httpAgent,
    httpsAgent: httpsAgent
});

cmd({
    pattern: "fb",
    alias: ["facebook"],
    desc: "Download Facebook videos (HD only)",
    category: "download",
    react: "🎥",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, userConfig }) => {
    try {
        if (!q) return reply(
`❌ *Please provide a Facebook video link*
Example:
.fb https://www.facebook.com/xxx`);
        if (!q.includes("facebook.com")) return reply("❌ *Invalid Facebook link*");

        await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });

        await reply("⏳ *ꜱᴇᴀʀᴄʜɪɴɢ, ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...*");

        const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/fbdl?url=${encodeURIComponent(q)}`;
        const { data } = await api.get(apiUrl);

        if (!data.status || !data.data || !data.data.high) {
            return reply("❌ *Failed to fetch Facebook video. Try another link*");
        }

        const { title, thumbnail, high } = data.data;

        await reply("⬇️ *ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ, ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...*");

        const infoCaption =
`*╭┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*
*┇•* 🎥 *𝐆ʜᴏsᴛ - xᴅ ꜰʙ ᴅʟ*
*┇•* ℹ️ *ᴛɪᴛʟᴇ: ${title || 'N/A'}*
*┇•* 🎞️ *ǫᴜᴀʟɪᴛʏ: ʜᴅ*
*╰┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*`;

        // Thumbnail + info pehle
        try {
            if (thumbnail) {
                await conn.sendMessage(from, {
                    image: { url: thumbnail },
                    caption: infoCaption
                }, { quoted: mek });
            } else {
                await reply(infoCaption);
            }
        } catch (e) {
            console.error("Facebook thumbnail send failed:", e.message);
            try { await reply(infoCaption); } catch (e2) {}
        }

        const poweredCaption =
`
*╭┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*
*┇•* *_${userConfig?.CAPTION || "ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴛᴇᴀᴍ ᴢᴇᴇ"}_*
*╰┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*`;

        await conn.sendMessage(from, {
            video: { url: high },
            caption: poweredCaption,
            contextInfo: { mentionedJid: [m.sender] }
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
        console.error("Facebook HD Downloader Error:", e);
        reply(`❌ *An error occurred while downloading video*\n\n_${e.message}_`);
        await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
    }
});
