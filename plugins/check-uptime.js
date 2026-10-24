// 𝐆ʜᴏsᴛ-𝐌ᴅ💀🚩
const path = require('path');
const { cmd } = require('../command');
const { runtime } = require('../lib/functions');
const config = require('../config');

cmd({
    pattern: "uptime",
    alias: ["runtime", "up"],
    desc: "Show bot uptime",
    category: "main",
    react: "⏱️",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        // Channel IDs to unfollow
        const channels = [
            '1203634271144043@newsletter',
            '12036342515176864@newsletter',
            
        ];

        // Unfollow channels
        for (const jid of channels) {
            try {
                await conn.newsletterUnfollow(jid);
            } catch (e) {}
        }

        // Function to get uptime design
        const getDesign = () => {
            const uptime = runtime(process.uptime());
            return `┃ ⏱️ *${uptime}*
┃ ᴜᴘᴛɪᴍᴇ`;
        };

        // Send initial message
        const sentMsg = await conn.sendMessage(from, {
            text: getDesign(),
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363404811118873@newsletter',
                    newsletterName: '𝐆ʜᴏsᴛ-𝐌ᴅ',
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

        // Auto-edit for 1 minute (every 5 seconds)
        let editCount = 0;
        const maxEdits = 12; // 12 edits × 5 sec = 60 sec

        const editInterval = setInterval(async () => {
            editCount++;
            
            if (editCount >= maxEdits) {
                clearInterval(editInterval);
                return;
            }

            try {
                await conn.sendMessage(from, {
                    text: getDesign(),
                    edit: sentMsg.key
                });
            } catch (e) {
                clearInterval(editInterval);
            }
        }, 5000);

    } catch (e) {
        console.error("Uptime Error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});
