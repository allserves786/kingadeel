// plugins/convert.js — Ghost-MD
const { cmd } = require('../command');
const axios = require('axios');
const FormData = require('form-data');

const newsletter = {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363404811118873@newsletter',
        newsletterName: "𝐆ʜᴏsᴛ-𝐌ᴅ",
        serverMessageId: 143
    }
};

// ============================================
// 1. CURRENCY (Double API - Frankfurter + Fallback)
// ============================================
cmd({
    pattern: "currency",
    alias: ["curr", "exchange", "rate"],
    desc: "Currency converter (with backup)",
    category: "convert",
    react: "💱",
    use: ".currency 100 USD PKR",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply(`💱 *CURRENCY*\n\nExample:\n.currency 100 USD PKR\n.currency 50 EUR INR`);

        const args = q.trim().split(/\s+/);
        if (args.length < 3) return reply(`❌ Format: .currency <amount> <from> <to>`);

        const amount = parseFloat(args[0]);
        const fromCur = args[1].toUpperCase();
        const toCur = args[2].toUpperCase();

        if (isNaN(amount)) return reply(`❌ Amount number hona chahiye.`);

        let rate = null;

        // Primary API
        try {
            const res1 = await axios.get(`https://api.frankfurter.dev/v1/latest?base=\( {fromCur}&symbols= \){toCur}`, { timeout: 8000 });
            rate = res1.data.rates[toCur];
        } catch {}

        // Backup API
        if (!rate) {
            try {
                const res2 = await axios.get(`https://open.er-api.com/v6/latest/${fromCur}`, { timeout: 8000 });
                rate = res2.data.rates[toCur];
            } catch {}
        }

        if (!rate) return reply(`❌ Dono APIs se rate nahi mila. Thodi der baad try karo.`);

        const result = (amount * rate).toFixed(2);

        const text = `💱 *CURRENCY CONVERTER*\n\n` +
                     `💰 Amount : *${amount} ${fromCur}*\n` +
                     `🔄 To     : *${toCur}*\n` +
                     `📊 Rate   : *1 ${fromCur} = ${rate} ${toCur}*\n\n` +
                     `✅ Result : *${result} ${toCur}*\n\n` +
                     `> 𝐆ʜᴏsᴛ-𝐌ᴅ`;

        await conn.sendMessage(from, { text, contextInfo: newsletter }, { quoted: mek });

    } catch (e) {
        console.error("currency error:", e);
        reply(`❌ Currency conversion failed.`);
    }
});

// ============================================
// 2. STICKER TO IMAGE (Working)
// ============================================
cmd({
    pattern: "sticker2img",
    alias: ["stoimg", "s2img", "toimg"],
    desc: "Convert sticker to image",
    category: "convert",
    react: "🖼️",
    use: "Reply to sticker → .sticker2img",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted?.stickerMessage) {
            return reply(`🖼️ *STICKER → IMAGE*\n\nSticker pe reply karke .sticker2img likho`);
        }

        await reply("🖼️ *Converting...*");

        const stream = await require('@whiskeysockets/baileys').downloadContentFromMessage(quoted.stickerMessage, 'sticker');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        await conn.sendMessage(from, {
            image: buffer,
            caption: `🖼️ *Sticker → Image*\n\n> 𝐆ʜᴏsᴛ-𝐌ᴅ`,
            contextInfo: newsletter
        }, { quoted: mek });

    } catch (e) {
        console.error("sticker2img error:", e);
        reply(`❌ Sticker convert nahi hua.`);
    }
});

// ============================================
// 3. UPLOAD FILE (Double - Litterbox + Catbox)
// ============================================
cmd({
    pattern: "uploadfile",
    alias: ["upload", "cloud", "cloudup"],
    desc: "Upload any media & get link (with backup)",
    category: "convert",
    react: "☁️",
    use: "Reply to any media → .uploadfile",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) {
            return reply(`☁️ *UPLOAD FILE*\n\nImage / Video / Audio / Document pe reply karke .uploadfile likho`);
        }

        await reply("☁️ *Uploading...*");

        let mediaType = '';
        let msgKey = null;

        if (quoted.imageMessage) { mediaType = 'image'; msgKey = quoted.imageMessage; }
        else if (quoted.videoMessage) { mediaType = 'video'; msgKey = quoted.videoMessage; }
        else if (quoted.audioMessage) { mediaType = 'audio'; msgKey = quoted.audioMessage; }
        else if (quoted.documentMessage) { mediaType = 'document'; msgKey = quoted.documentMessage; }
        else if (quoted.stickerMessage) { mediaType = 'sticker'; msgKey = quoted.stickerMessage; }
        else return reply(`❌ Supported media nahi hai.`);

        const stream = await require('@whiskeysockets/baileys').downloadContentFromMessage(msgKey, mediaType === 'sticker' ? 'sticker' : mediaType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        let link = null;

        // Primary: Litterbox (24h)
        try {
            const form1 = new FormData();
            form1.append('reqtype', 'fileupload');
            form1.append('time', '24h');
            form1.append('fileToUpload', buffer, { filename: `file.bin` });

            const up1 = await axios.post('https://litterbox.catbox.moe/resources/internals/api.php', form1, {
                headers: form1.getHeaders(),
                timeout: 30000
            });
            if (up1.data && up1.data.startsWith('http')) link = up1.data;
        } catch {}

        // Backup: Catbox
        if (!link) {
            try {
                const form2 = new FormData();
                form2.append('reqtype', 'fileupload');
                form2.append('fileToUpload', buffer, { filename: `file.bin` });

                const up2 = await axios.post('https://catbox.moe/user/api.php', form2, {
                    headers: form2.getHeaders(),
                    timeout: 30000
                });
                if (up2.data && up2.data.startsWith('http')) link = up2.data;
            } catch {}
        }

        if (!link) return reply(`❌ Dono servers se upload fail ho gaya.`);

        const text = `☁️ *FILE UPLOADED*\n\n` +
                     `🔗 *Link:* ${link}\n\n` +
                     `> 𝐆ʜᴏsᴛ-𝐌ᴅ`;

        await conn.sendMessage(from, { text, contextInfo: newsletter }, { quoted: mek });

    } catch (e) {
        console.error("uploadfile error:", e);
        reply(`❌ Upload failed.`);
    }
});

// ============================================
// 4. TTS (English)
// ============================================
cmd({
    pattern: "tts",
    alias: ["say", "speak"],
    desc: "Text to speech (English)",
    category: "convert",
    react: "🗣️",
    use: ".tts <text>",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply(`🗣️ *TTS*\n\nExample: .tts Hello Ghost MD`);

        await reply("🗣️ *Generating voice...*");

        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(q)}&tl=en&client=tw-ob`;
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000
        });

        await conn.sendMessage(from, {
            audio: Buffer.from(res.data),
            mimetype: 'audio/mpeg',
            ptt: true,
            contextInfo: newsletter
        }, { quoted: mek });

    } catch (e) {
        console.error("tts error:", e);
        reply(`❌ TTS failed.`);
    }
});

// ============================================
// 5. TTS2 (Urdu)
// ============================================
cmd({
    pattern: "tts2",
    alias: ["ttsurdu", "speak2"],
    desc: "Text to speech (Urdu)",
    category: "convert",
    react: "🗣️",
    use: ".tts2 <text>",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply(`🗣️ *TTS2*\n\nExample: .tts2 السلام علیکم`);

        await reply("🗣️ *Generating voice...*");

        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(q)}&tl=ur&client=tw-ob`;
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000
        });

        await conn.sendMessage(from, {
            audio: Buffer.from(res.data),
            mimetype: 'audio/mpeg',
            ptt: true,
            contextInfo: newsletter
        }, { quoted: mek });

    } catch (e) {
        console.error("tts2 error:", e);
        reply(`❌ TTS2 failed.`);
    }
});
