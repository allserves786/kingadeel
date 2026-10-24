// plugins/url.js — Ghost-MD
const { cmd } = require('../command');
const axios = require('axios');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const newsletter = {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363404811118873@newsletter',
        newsletterName: "𝐆ʜᴏsᴛ-𝐌ᴅ",
        serverMessageId: 143
    }
};

async function uploadImage(buffer) {
    // Method 1: img402 (no key needed)
    try {
        const form = new FormData();
        form.append('file', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });

        const res = await axios.post('https://img402.dev/api/free', form, {
            headers: form.getHeaders(),
            timeout: 30000
        });

        if (res.data?.url) return res.data.url;
    } catch (e) {
        console.log('img402 failed:', e.message);
    }

    // Method 2: Catbox
    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, { filename: 'ghost.jpg' });

        const res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(),
            timeout: 30000
        });

        if (typeof res.data === 'string' && res.data.startsWith('https://')) {
            return res.data.trim();
        }
    } catch (e) {
        console.log('catbox failed:', e.message);
    }

    // Method 3: upload.satoru (Catbox compatible)
    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, { filename: 'ghost.jpg' });

        const res = await axios.post('https://upload.satoru.click/user/api.php', form, {
            headers: form.getHeaders(),
            timeout: 30000
        });

        if (typeof res.data === 'string' && res.data.startsWith('http')) {
            return res.data.trim();
        }
    } catch (e) {
        console.log('satoru failed:', e.message);
    }

    // Method 4: Telegraph
    try {
        const form = new FormData();
        form.append('file', buffer, { filename: 'image.jpg' });

        const res = await axios.post('https://telegra.ph/upload', form, {
            headers: form.getHeaders(),
            timeout: 30000
        });

        if (res.data?.[0]?.src) {
            return 'https://telegra.ph' + res.data[0].src;
        }
    } catch (e) {
        console.log('telegraph failed:', e.message);
    }

    return null;
}

cmd({
    pattern: "url",
    alias: ["imgtourl", "imgurl", "tourl", "geturl", "upload"],
    react: "🖇",
    desc: "Upload image and get URL",
    category: "utility",
    use: ".url (reply to image)",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted?.imageMessage) {
            return reply(`🖇 *URL*\n\nImage pe reply karke .url likho`);
        }

        await reply("⏳ *Uploading...*");

        const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        if (!buffer || buffer.length < 100) {
            return reply("❌ Image download nahi hui.");
        }

        const imageUrl = await uploadImage(buffer);

        if (!imageUrl) {
            return reply("❌ Saari upload services fail ho gayi.\nThodi der baad try karo.");
        }

        await conn.sendMessage(from, {
            text: `✅ *Uploaded Successfully*\n\n🔗 ${imageUrl}\n\n> 𝐆ʜᴏsᴛ-𝐌ᴅ`,
            contextInfo: newsletter
        }, { quoted: mek });

    } catch (e) {
        console.error("url error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});
