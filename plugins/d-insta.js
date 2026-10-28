const path = require('path');
const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "instagram",
    alias: ["ig", "instadl", "insta"],
    desc: "Download Instagram videos and send them on WhatsApp",
    category: "downloader",
    react: "🎥",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, react }) => {
    try {

        // Check URL
        if (!q) {
            return reply(
`❌ *Please provide an Instagram Reel/Post URL*
Example:
.instagram https://www.instagram.com/reel/xxxxx/`
            );
        }

        // React loading
        await conn.sendMessage(from, { react: { text: '⬇️', key: m.key } });

        await reply("⏳ *ꜱᴇᴀʀᴄʜɪɴɢ, ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...*");

        // API URL
        const apiUrl = `https://jerrycoder.oggyapi.workers.dev/down/insta?url=${encodeURIComponent(q)}`;

        // Fetch API Data
        const { data } = await axios.get(apiUrl);

        // Validate response
        if (!data || data.status !== "success" || !data.data || !data.data.url) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply("❌ *Failed to fetch Instagram media. Try another link*");
        }

        // Get media data
        const media = data.data;

        await reply("⬇️ *ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ, ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...*");

        const infoCaption =
`*╭┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*
*┇•* 🎥 *𝐆ʜᴏsᴛ - xᴅ ɪɴsᴛᴀ ᴅʟ*
*┇•* 📦 *ᴛʏᴘᴇ: ${media.type || 'Unknown'}*
*┇•* ⚡ *ᴘɪɴɢ: ${data.ping || 'Fast'}*
*┇•* 👤 *ᴄʀᴇᴀᴛᴏʀ: ${data.creator || 'Unknown'}*
*┇•* 🖥️ *sᴇʀᴠᴇʀ: ${data.server || 'Unknown'}*
*┇•* 📥 *ꜱᴛᴀᴛᴜꜱ: ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ...*
*╰┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*`;

        // Thumbnail + info pehle
        try {
            if (media.thumbnail) {
                await conn.sendMessage(from, {
                    image: { url: media.thumbnail },
                    caption: infoCaption
                }, { quoted: mek });
            } else {
                await reply(infoCaption);
            }
        } catch (e) {
            console.error("Instagram thumbnail send failed:", e.message);
            try { await reply(infoCaption); } catch (e2) {}
        }

        const poweredCaption =
`
*╭┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*
*┇•* *_ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴛᴇᴀᴍ ᴢᴇᴇ_*
*╰┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*`;

        // Send the video - stream directly from URL
        if (media.type === "video") {

            await conn.sendMessage(from, {
                video: { url: media.url },
                caption: poweredCaption
            }, { quoted: mek });

        } else {

            // Send image if image type
            await conn.sendMessage(from, {
                image: { url: media.url },
                caption: poweredCaption
            }, { quoted: mek });
        }

        // Success reaction
        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {

        console.error("Instagram Downloader Error:", e.message || e);

        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });

        reply(`❌ *An error occurred while downloading Instagram media*\n\n_${e.message || 'Please try again later'}_`);
    }
});
