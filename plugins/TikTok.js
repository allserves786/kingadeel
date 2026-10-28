// 𝐆ʜᴏsᴛ-𝐌ᴅ💀🚩
const path = require('path');
const config = require('../config');
const { cmd } = require('../command');
const axios = require('axios');

const botName = "𝐆ʜᴏsᴛ-𝐌ᴅ💀🚩";

cmd({
    pattern: "tiktok",
    alias: ["tt", "ttdl", "tiktokdl", "tikdown"],
    use: '.tiktok <link>',
    desc: "Download TikTok video without watermark.",
    category: "download",
    react: "🎵",
    filename: __filename
},

async (conn, mek, m, { from, quoted, sender, args, q, reply }) => {
    try {
        // ─── Unfollow Channels ───
        const channels = [
            '120363409104273154@newsletter',
            '120363426829681935@newsletter',
        ];
        for (const jid of channels) {
            try { await conn.newsletterUnfollow(jid); } catch (e) {}
        }

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

        // ─── Check URL ───
        if (!q) {
            return reply(
`❌ *Please provide a TikTok link*
Example:
${config.PREFIX || '.'}tiktok https://vm.tiktok.com/xxxxx`);
        }

        const url = q.trim();
        if (!url.includes('tiktok.com') && !url.includes('vm.tiktok.com')) {
            return reply("❌ *Invalid TikTok link*");
        }

        // ─── Loading Message ───
        const loadingMsg = await conn.sendMessage(from, {
            text: `⬇️ *ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ, ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...* ${textEmoji}`
        }, { quoted: mek });

        // ─── API Call ───
        const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
        const { data } = await axios.get(apiUrl, { timeout: 30000 });

        if (!data.data || !data.data.play) {
            return reply("❌ *Failed to fetch video. Try another link or check if the video is public*");
        }

        const videoData = data.data;
        const videoUrl = videoData.play; // ✅ NO WATERMARK
        const title = videoData.title || 'No Title';
        const author = videoData.author?.nickname || 'Unknown';
        const duration = videoData.duration || 0;
        const views = videoData.play_count || 0;
        const likes = videoData.digg_count || 0;

        const end = new Date().getTime();
        const responseTime = ((end - start) / 1000).toFixed(2);

        // ─── Build Caption ───
        const caption =
`*╭┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*
*┇•* 🎵 *𝐆ʜᴏsᴛ - xᴅ ᴛɪᴋᴛᴏᴋ ᴅʟ*
*┇•* ℹ️ *ᴛɪᴛʟᴇ: ${title}*
*┇•* 👤 *ᴄʀᴇᴀᴛᴏʀ: ${author}*
*┇•* ⌛ *ᴅᴜʀᴀᴛɪᴏɴ: ${duration}s*
*┇•* 👁️ *ᴠɪᴇᴡs: ${views.toLocaleString()}*
*┇•* ❤️ *ʟɪᴋᴇs: ${likes.toLocaleString()}*
*┇•* ⚡ *sᴘᴇᴇᴅ: ${responseTime}s*
*┇•* ✅ *ɴᴏ ᴡᴀᴛᴇʀᴍᴀʀᴋ*
*╰┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*

*╭┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*
*┇•* *_ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴛᴇᴀᴍ ᴢᴇᴇ_*
*╰┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*`;

        // ─── Send Video ───
        await conn.sendMessage(from, {
            video: { url: videoUrl },
            caption: caption,
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
        console.error("Error in tiktok command:", e);
        reply(`❌ *An error occurred while downloading video*\n\n_${e.message}_`);
    }
});
