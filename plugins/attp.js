// plugins/attp.js — Ghost-MD
const { cmd } = require('../command');
const axios = require('axios');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

const newsletter = {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363404811118873@newsletter',
        newsletterName: "𝐆ʜᴏsᴛ-𝐌ᴅ",
        serverMessageId: 143
    }
};

cmd({
    pattern: "attp",
    alias: ["ttp", "textsticker"],
    desc: "Text to Sticker",
    category: "convert",
    react: "✨",
    use: ".attp Hello",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply(`✨ *ATTP*\n\nExample:\n.attp Ghost MD\n.attp Hello`);

        if (q.length > 30) return reply(`❌ Text chhota likho (max 30)`);

        await reply("✨ *Sticker ban raha hai...*");

        const apis = [
            `https://api.siputzx.my.id/api/canvas/attp?text=${encodeURIComponent(q)}`,
            `https://api.giftedtech.co.ke/api/canvas/attp?apikey=gifted&text=${encodeURIComponent(q)}`,
            `https://placehold.co/512x512/1a0033/ff69b4/png?text=${encodeURIComponent(q)}&font=roboto`
        ];

        let imageBuffer = null;

        for (const api of apis) {
            try {
                const res = await axios.get(api, {
                    responseType: 'arraybuffer',
                    timeout: 20000
                });
                if (res.data && res.data.byteLength > 1500) {
                    imageBuffer = Buffer.from(res.data);
                    break;
                }
            } catch {}
        }

        if (!imageBuffer) {
            return reply("❌ Sticker nahi bana. Thodi der baad try karo.");
        }

        const sticker = new Sticker(imageBuffer, {
            pack: "Ghost-MD",
            author: "Ghost-MD",
            type: StickerTypes.FULL,
            quality: 85
        });

        const stickerBuffer = await sticker.toBuffer();

        await conn.sendMessage(from, {
            sticker: stickerBuffer,
            contextInfo: newsletter
        }, { quoted: mek });

    } catch (e) {
        console.error("attp error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});
