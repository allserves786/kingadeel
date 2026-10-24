// plugins/video.js — Ghost-MD
const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

const newsletter = {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363404811118873@newsletter',
        newsletterName: "𝐆ʜᴏsᴛ-𝐌ᴅ",
        serverMessageId: 143
    }
};

async function getVideoLink(url) {
    const apis = [
        `https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.giftedtech.co.ke/api/download/ytmp4?apikey=gifted&url=${encodeURIComponent(url)}`,
        `https://api.siputzx.my.id/api/d/yt?url=${encodeURIComponent(url)}`,
        `https://yt-api.bardia.pro/api/download?url=${encodeURIComponent(url)}&format=mp4`
    ];

    for (const api of apis) {
        try {
            const res = await axios.get(api, { timeout: 28000 });
            const data = res.data;

            const link = data?.data?.dl || 
                         data?.data?.url || 
                         data?.result?.download_url || 
                         data?.result?.url || 
                         data?.url || 
                         data?.download || 
                         data?.link || null;

            if (link && link.startsWith('http')) return link;
        } catch {}
    }
    return null;
}

cmd({
    pattern: "video",
    alias: ["playvideo", "ytvideo", "ytmp4"],
    desc: "Download YouTube Video",
    category: "download",
    react: "🎥",
    use: ".video Tum Hi Aana",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) {
            return reply(`🎥 *VIDEO*\n\nExample:\n.video Tum Hi Aana\n.video Shape of You`);
        }

        await reply("🎥 *Video search + download ho rahi hai...*\nThoda wait karo");

        const search = await yts(q);
        const video = search.videos[0];

        if (!video) return reply("❌ Video nahi mili.");

        // Free APIs usually fail on long videos
        if (video.seconds > 420) {
            return reply(`⚠️ Video bohot lambi hai (*${video.timestamp}*).\n\nFree download mein short videos better kaam karti hain.\n\n🔗 ${video.url}`);
        }

        const dlUrl = await getVideoLink(video.url);

        if (!dlUrl) {
            return reply(`🎥 *${video.title}*\n\n❌ Abhi download link nahi mil raha.\nThodi der baad try karo.\n\n🔗 ${video.url}`);
        }

        await conn.sendMessage(from, {
            video: { url: dlUrl },
            caption: `🎥 *${video.title}*\n\n⏱ ${video.timestamp} | 👁 ${video.views}\n\n> 𝐆ʜᴏsᴛ-𝐌ᴅ`,
            contextInfo: newsletter
        }, { quoted: mek });

    } catch (e) {
        console.error("video error:", e);
        reply("❌ Video download fail ho gaya.");
    }
});
