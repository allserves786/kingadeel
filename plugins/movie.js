// plugins/movie.js — Ghost-MD
const { cmd } = require('../command');
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

// ========== MOVIE ==========
cmd({
    pattern: "movie",
    alias: ["film", "mov"],
    desc: "Search Movie",
    category: "download",
    react: "🎬",
    use: ".movie Jawan",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply(`🎬 *MOVIE*\n\nExample:\n.movie Jawan\n.movie Pathaan\n.movie Avengers`);

        await reply("🎬 *Movie search ho rahi hai...*");

        const search = await yts(`${q} full movie trailer`);
        const videos = search.videos.slice(0, 5);

        if (!videos.length) return reply("❌ Movie nahi mili.");

        let text = `🎬 *MOVIE RESULTS*\n\n`;
        videos.forEach((v, i) => {
            text += `*${i + 1}. ${v.title}*\n`;
            text += `⏱ ${v.timestamp} | 👁 ${v.views}\n`;
            text += `🔗 ${v.url}\n\n`;
        });
        text += `> 𝐆ʜᴏsᴛ-𝐌ᴅ`;

        await conn.sendMessage(from, {
            image: { url: videos[0].thumbnail },
            caption: text,
            contextInfo: newsletter
        }, { quoted: mek });

    } catch (e) {
        console.error("movie error:", e);
        reply("❌ Movie search fail ho gaya.");
    }
});

// ========== DRAMA ==========
cmd({
    pattern: "drama",
    alias: ["serial", "dramaserial"],
    desc: "Search Drama",
    category: "download",
    react: "📺",
    use: ".drama Tere Bin",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply(`📺 *DRAMA*\n\nExample:\n.drama Tere Bin\n.drama Mere Humsafar\n.drama Yakeen Ka Safar`);

        await reply("📺 *Drama search ho rahi hai...*");

        const search = await yts(`${q} drama full episode`);
        const videos = search.videos.slice(0, 6);

        if (!videos.length) return reply("❌ Drama nahi mila.");

        let text = `📺 *DRAMA RESULTS*\n\n`;
        videos.forEach((v, i) => {
            text += `*${i + 1}. ${v.title}*\n`;
            text += `⏱ ${v.timestamp}\n`;
            text += `🔗 ${v.url}\n\n`;
        });
        text += `> 𝐆ʜᴏsᴛ-𝐌ᴅ`;

        await conn.sendMessage(from, {
            image: { url: videos[0].thumbnail },
            caption: text,
            contextInfo: newsletter
        }, { quoted: mek });

    } catch (e) {
        console.error("drama error:", e);
        reply("❌ Drama search fail ho gaya.");
    }
});
