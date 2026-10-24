// plugins/blur.js — Ghost-MD (Portrait Style)
const { cmd } = require('../command');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { Jimp } = require('jimp');

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
    pattern: "blur",
    alias: ["portrait", "dslr", "bgblur"],
    desc: "Portrait / Background Blur",
    category: "tools",
    react: "📷",
    use: "Reply to photo → .blur",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted?.imageMessage) {
            return reply(`📷 *PORTRAIT BLUR*\n\nPhoto pe reply karke .blur likho`);
        }

        await reply("📷 *Portrait blur lagaya ja raha hai...*");

        // Download image
        const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const image = await Jimp.read(buffer);
        const width = image.bitmap.width;
        const height = image.bitmap.height;

        // Create strongly blurred version
        const blurred = image.clone().blur(18);

        // Create radial mask (center clear, edges blurred)
        const mask = new Jimp({ width, height, color: 0x000000FF });

        const centerX = width / 2;
        const centerY = height / 2;
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

        mask.scan(0, 0, width, height, function (x, y, idx) {
            const dx = x - centerX;
            const dy = y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // 0 = center (clear), 255 = edges (full blur)
            let strength = Math.min(255, (dist / maxDist) * 280);
            strength = Math.pow(strength / 255, 1.4) * 255; // softer falloff

            this.bitmap.data[idx] = strength;     // R
            this.bitmap.data[idx + 1] = strength; // G
            this.bitmap.data[idx + 2] = strength; // B
            this.bitmap.data[idx + 3] = 255;      // A
        });

        // Composite: original + blurred according to mask
        image.mask(mask);
        blurred.composite(image, 0, 0);

        const finalBuffer = await blurred.getBuffer('image/jpeg');

        await conn.sendMessage(from, {
            image: finalBuffer,
            caption: `📷 *Portrait Blur*\n\n> 𝐆ʜᴏsᴛ-𝐌ᴅ`,
            contextInfo: newsletter
        }, { quoted: mek });

    } catch (e) {
        console.error("blur error:", e);
        reply(`❌ Portrait blur fail\n\n${e.message}`);
    }
});
