// plugins/sticker.js — Ghost-MD
const { cmd } = require('../command');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
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
    pattern: "sticker",
    alias: ["s", "stiker", "stick"],
    desc: "Image to Sticker",
    category: "sticker",
    react: "🖼️",
    use: "Reply to image → .sticker",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted?.imageMessage && !quoted?.videoMessage) {
            return reply(`🖼️ *STICKER*\n\nImage ya short video pe reply karke .sticker likho`);
        }

        await reply("🖼️ *Sticker ban raha hai...*");

        const type = quoted.imageMessage ? 'image' : 'video';
        const mediaMessage = quoted.imageMessage || quoted.videoMessage;

        // Download media
        const stream = await downloadContentFromMessage(mediaMessage, type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        // Make sticker
        const sticker = new Sticker(buffer, {
            pack: "Ghost-MD",
            author: "Ghost-MD",
            type: StickerTypes.FULL,
            quality: 80
        });

        const stickerBuffer = await sticker.toBuffer();

        await conn.sendMessage(from, {
            sticker: stickerBuffer,
            contextInfo: newsletter
        }, { quoted: mek });

    } catch (e) {
        console.error("sticker error:", e);
        reply(`❌ Sticker fail\n\n${e.message}`);
    }
});
