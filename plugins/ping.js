// plugins/ping.js — Ghost-MD
const path = require('path');
const fs = require('fs');
const { cmd } = require('../command');

cmd({
    pattern: "ping",
    alias: ["speed", "pong", "latency"],
    use: '.ping',
    desc: "Check bot response speed",
    category: "main",
    react: "💎",
    filename: __filename
},

async (conn, mek, m, { from, sender, reply }) => {
    try {
        const start = Date.now();
        const ms = (Date.now() - start).toFixed(0);

        await conn.sendMessage(from, {
            text: `\`\`\`𝐏๏፝֟ƞ̽g ${ms}𝐌s 🛡️\`\`\``,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363404811118873@newsletter',
                    newsletterName: "𝐆ʜᴏsᴛ-𝐌ᴅ",
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

        // Optional audio
        const audioPath = path.join(__dirname, '../assets/menu.mp3');
        if (fs.existsSync(audioPath)) {
            await conn.sendMessage(from, {
                audio: fs.readFileSync(audioPath),
                mimetype: 'audio/mp4',
                ptt: true,
                fileName: 'GhostMD_Ping.mp3'
            }, { quoted: mek });
        }

    } catch (e) {
        console.error("ping error:", e);
        reply(`*Error:* ${e.message}`);
    }
});
