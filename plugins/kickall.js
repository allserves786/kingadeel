// 𝐆ʜᴏsᴛ-𝐌ᴅ💀🚩
const path = require('path');
const config = require('../config');
const { cmd } = require('../command');

const botName = "𝐆ʜᴏsᴛ-𝐌ᴅ💀🚩";

cmd({
    pattern: "kickall",
    alias: ["nuke", "removeall", "cleargrp"],
    use: '.kickall',
    desc: "Remove all members from the group (Admin only).",
    category: "group",
    react: "🚷",
    filename: __filename
},

async (conn, mek, m, { from, sender, isGroup, isBotAdmins, isAdmins, isOwner, isCreator, participants, reply }) => {
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

        // ─── Checks ───
        if (!isGroup) {
            return reply(`*❌ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴄᴀɴ ᴏɴʟʏ ʙᴇ ᴜsᴇᴅ ɪɴ ɢʀᴏᴜᴘs!*`);
        }

        if (!isBotAdmins) {
            return reply(`*❌ ɪ ɴᴇᴇᴅ ᴀᴅᴍɪɴ ᴘʀɪᴠɪʟᴇɢᴇs ᴛᴏ ᴋɪᴄᴋ ᴍᴇᴍʙᴇʀs!*`);
        }

        if (!isAdmins && !isOwner && !isCreator) {
            return reply(`*❌ ᴏɴʟʏ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴs ᴏʀ ʙᴏᴛ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs!*`);
        }

        // ─── Get Participants to Kick ───
        const botNum = conn.user?.id ? conn.user.id.split(':')[0].split('@')[0] : '';
        const botLid = conn.user?.lid ? conn.user.lid.split(':')[0].split('@')[0] : '';
        const senderNum = sender ? String(sender).split('@')[0].split(':')[0] : '';
        const excludeNums = new Set([botNum, botLid, senderNum].filter(Boolean));

        const kickList = (participants || [])
            .filter(p => {
                const pNum = String(p.id || '').split('@')[0].split(':')[0];
                const pLid = String(p.lid || '').split('@')[0].split(':')[0];
                return !excludeNums.has(pNum) && !(pLid && excludeNums.has(pLid));
            })
            .map(p => p.id);

        if (kickList.length === 0) {
            return reply(`*⚠️ ɴᴏ ᴍᴇᴍʙᴇʀs ᴛᴏ ᴋɪᴄᴋ!*`);
        }

        // ─── Kick All ───
        await conn.sendMessage(from, {
            text: `⏳ *ᴋɪᴄᴋɪɴɢ ${kickList.length} ᴍᴇᴍʙᴇʀs...* ${textEmoji}`
        }, { quoted: mek });

        // Remove in batches (WhatsApp limit safety)
        const batchSize = 30;
        for (let i = 0; i < kickList.length; i += batchSize) {
            const batch = kickList.slice(i, i + batchSize);
            try {
                await conn.groupParticipantsUpdate(from, batch, 'remove');
                await new Promise(r => setTimeout(r, 1000)); // delay to avoid ban
            } catch (e) {
                console.error(`Error kicking batch ${i}:`, e);
            }
        }

        const end = new Date().getTime();
        const responseTime = ((end - start) / 1000).toFixed(2);

        // ─── Success Message ───
        let doneText = `╭━━━━━━━━━━━━━━━━╮\n`;
        doneText += `┃  ${botName}\n`;
        doneText += `╰━━━━━━━━━━━━━━━━━⬣\n\n`;
        doneText += `╭━━━〔 🚷 ᴋɪᴄᴋᴀʟʟ 🚷 〕━━━╮\n`;
        doneText += `┃\n`;
        doneText += `┃  ✅ *ᴋɪᴄᴋᴇᴅ:* ${kickList.length} ᴍᴇᴍʙᴇʀs\n`;
        doneText += `┃  ⏱️ *ᴛɪᴍᴇ:* ${responseTime}s\n`;
        doneText += `┃  🔥 *ɢʀᴏᴜᴘ ɴᴜᴋᴇᴅ!*\n`;
        doneText += `┃\n`;
        doneText += `╰━━━━━━━━━━━━━━━━⬣\n`;
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
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in kickall command:", e);
        reply(`*An error occurred:*\n\`\`\`${e.message}\`\`\``);
    }
});
