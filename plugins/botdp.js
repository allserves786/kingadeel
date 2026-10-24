// 𝐆ʜᴏsᴛ-𝐌ᴅ💀🚩
const path = require('path');
const config = require('../config');
const { cmd } = require('../command');

const botName = "𝐆ʜᴏsᴛ-𝐌ᴅ💀🚩";

cmd({
    pattern: "botdp",
    alias: ["setdp", "setpp", "changedp", "botpp"],
    use: '.botdp (reply to image)',
    desc: "Change bot's profile picture.",
    category: "owner",
    react: "🖼️",
    filename: __filename
},

async (conn, mek, m, { from, quoted, sender, isOwner, reply }) => {
    try {
        const start = new Date().getTime();

        // ─── Random Emojis ───
        const reactionEmojis = ['🔥', '⚡', '🚀', '💨', '🎯', '🎉', '🌟', '💥', '🕐', '🔹'];
        const textEmojis = ['💎', '🏆', '⚡️', '🚀', '🎶', '🌠', '🌀', '🔱', '🛡️', '✨'];
        const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
        let textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
        while (textEmoji === reactionEmoji) {
            textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
        }

        await conn.sendMessage(from, {
            react: { text: textEmoji, key: mek.key }
        });

        // ─── Owner Check ───
        if (!isOwner) {
            return reply(`*❌ ᴏɴʟʏ ʙᴏᴛ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs!*`);
        }

        // ─── Get Image ───
        let imageBuffer;
        
        if (quoted && (quoted.mtype === 'imageMessage' || quoted.type === 'imageMessage')) {
            imageBuffer = await quoted.download();
        } else if (mek.message?.imageMessage) {
            imageBuffer = await mek.download();
        } else {
            return reply(`*⚠️ ᴘʟᴇᴀsᴇ ʀᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ!*\n\n*ᴇxᴀᴍᴘʟᴇ:*\n${config.PREFIX || '.'}botdp (ʀᴇᴘʟʏ ᴛᴏ ᴘʜᴏᴛᴏ)`);
        }

        if (!imageBuffer) {
            return reply(`*❌ ғᴀɪʟᴇᴅ ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ ɪᴍᴀɢᴇ!*`);
        }

        // ─── Loading ───
        const loadingMsg = await conn.sendMessage(from, {
            text: `⏳ *ᴜᴘᴅᴀᴛɪɴɢ ʙᴏᴛ ᴅᴘ...* ${textEmoji}`
        }, { quoted: mek });

        // ─── Update DP ───
        const botJid = conn.user.id;
        await conn.updateProfilePicture(botJid, imageBuffer);

        const end = new Date().getTime();
        const responseTime = ((end - start) / 1000).toFixed(2);

        // ─── Success ───
        let doneText = `╭━━━〔 ${botName} 〕━━━⊷\n\n`;
        doneText += `╭━━━━〔 ✅ ᴅᴘ ᴜᴘᴅᴀᴛᴇᴅ ✅ 〕━━━━╮\n`;
        doneText += `┃\n`;
        doneText += `┃  🖼️ *ʙᴏᴛ ᴘʀᴏғɪʟᴇ ᴘɪᴄᴛᴜʀᴇ*\n`;
        doneText += `┃  ✅ *ᴄʜᴀɴɢᴇᴅ sᴜᴄᴄᴇssғᴜʟʟʏ!*\n`;
        doneText += `┃  ⚡ *sᴘᴇᴇᴅ:* ${responseTime}s\n`;
        doneText += `┃\n`;
        doneText += `╰━━━━━━━━━━━━━━━━━━━⬣\n`;
        doneText += `\n> *© ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐌ᴀғɪᴀ 𝐀ᴅᴇᴇʟ*`;

        await conn.sendMessage(from, {
            text: doneText,
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
        }, { quoted: loadingMsg });

    } catch (e) {
        console.error("Error in botdp command:", e);
        reply(`*❌ ᴇʀʀᴏʀ:* \`\`\`${e.message}\`\`\`\n\n*ᴛɪᴘ:* ᴍᴀᴋᴇ sᴜʀᴇ ᴛʜᴇ ɪᴍᴀɢᴇ ɪs ɴᴏᴛ ᴛᴏᴏ ʟᴀʀɢᴇ ᴀɴᴅ ʙᴏᴛ ʜᴀs ᴘᴇʀᴍɪssɪᴏɴs.`);
    }
});
