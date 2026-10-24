// plugins/ai.js — Ghost-MD
const { cmd } = require('../command');
const axios = require('axios');

const newsletter = {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363404811118873@newsletter',
        newsletterName: "𝐆ʜᴏsᴛ-𝐌ᴅ",
        serverMessageId: 143
    }
};

// ========== FREE TEXT AI ==========
async function freeAI(prompt) {
    const apis = [
        async () => {
            const res = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, {
                timeout: 30000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            return typeof res.data === 'string' ? res.data : null;
        },
        async () => {
            const res = await axios.get(`https://api.siputzx.my.id/api/ai/gpt?content=${encodeURIComponent(prompt)}`, { timeout: 25000 });
            return res.data?.data || res.data?.result || null;
        },
        async () => {
            const res = await axios.get(`https://api.giftedtech.co.ke/api/ai/gpt?apikey=gifted&q=${encodeURIComponent(prompt)}`, { timeout: 25000 });
            return res.data?.result || null;
        }
    ];

    for (const api of apis) {
        try {
            const result = await api();
            if (result && result.length > 3) return result.trim();
        } catch {}
    }
    return null;
}

// ========== FREE IMAGE AI ==========
async function freeImage(prompt) {
    try {
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
        return Buffer.from(res.data);
    } catch {
        return null;
    }
}

// ========== AI MENU ==========
cmd({
    pattern: "aimenu",
    alias: ["ailist", "aim"],
    desc: "AI Commands Menu",
    category: "ai",
    react: "🤖",
    filename: __filename
}, async (conn, mek, m, { from }) => {
    const text = `╭━━━〔 *🤖 AI MENU* 〕━━━┈⊷
┃
┃ *Chat AI*
┃ ├ .chatgpt
┃ ├ .gemini
┃ ├ .llama
┃ ├ .mistral
┃ ├ .deepseek
┃ ├ .blackbox
┃ ├ .talkai
┃ └ .copilot
┃
┃ *Image AI*
┃ ├ .dalle
┃ └ .flux
┃
┃ *Tools*
┃ ├ .aitranslate
┃ ├ .grammar
┃ ├ .rephrase
┃ ├ .summarize
┃ ├ .roast
┃ ├ .mathai
┃ └ .animeai
┃
╰━━━━━━━━━━━━━━━━━━┈⊷
📌 Example: .chatgpt Hello
> 𝐆ʜᴏsᴛ-𝐌ᴅ`;

    await conn.sendMessage(from, { text, contextInfo: newsletter }, { quoted: mek });
});

// ========== TEXT AI COMMANDS ==========
const textCommands = [
    { pattern: "chatgpt", aliases: ["gpt", "ai"], name: "ChatGPT" },
    { pattern: "gemini", aliases: [], name: "Gemini" },
    { pattern: "llama", aliases: [], name: "Llama" },
    { pattern: "mistral", aliases: ["mistral2"], name: "Mistral" },
    { pattern: "deepseek", aliases: [], name: "DeepSeek" },
    { pattern: "blackbox", aliases: [], name: "Blackbox" },
    { pattern: "talkai", aliases: [], name: "TalkAI" },
    { pattern: "copilot", aliases: [], name: "Copilot" }
];

textCommands.forEach(cmdObj => {
    cmd({
        pattern: cmdObj.pattern,
        alias: cmdObj.aliases,
        desc: `${cmdObj.name} AI Chat`,
        category: "ai",
        react: "🤖",
        filename: __filename
    }, async (conn, mek, m, { from, q, reply }) => {
        if (!q) return reply(`🤖 *\( {cmdObj.name}*\n\nExample:\n. \){cmdObj.pattern} Pakistan ke bare mein batao`);

        await reply(`🤖 *${cmdObj.name} soch raha hai...*`);

        const answer = await freeAI(q);
        if (!answer) return reply("❌ AI se jawab nahi mila. Thodi der baad try karo.");

        await conn.sendMessage(from, {
            text: `🤖 *\( {cmdObj.name}*\n\n \){answer}\n\n> 𝐆ʜᴏsᴛ-𝐌ᴅ`,
            contextInfo: newsletter
        }, { quoted: mek });
    });
});

// ========== IMAGE AI ==========
cmd({
    pattern: "dalle",
    alias: ["imagine", "aiimage"],
    desc: "AI Image Generator",
    category: "ai",
    react: "🖼️",
    use: ".dalle a cat wearing sunglasses",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply(`🖼️ *DALL-E*\n\nExample:\n.dalle a beautiful girl in rain`);

    await reply("🖼️ *Image generate ho rahi hai...*");

    const img = await freeImage(q);
    if (!img) return reply("❌ Image generate nahi hui. Try again.");

    await conn.sendMessage(from, {
        image: img,
        caption: `🖼️ *AI Image*\n\nPrompt: ${q}\n\n> 𝐆ʜᴏsᴛ-𝐌ᴅ`,
        contextInfo: newsletter
    }, { quoted: mek });
});

cmd({
    pattern: "flux",
    desc: "Flux AI Image",
    category: "ai",
    react: "✨",
    use: ".flux cyberpunk city",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply(`✨ *FLUX*\n\nExample:\n.flux futuristic car`);

    await reply("✨ *Flux image ban rahi hai...*");

    const img = await freeImage(q + ", flux style, highly detailed");
    if (!img) return reply("❌ Image fail. Try again.");

    await conn.sendMessage(from, {
        image: img,
        caption: `✨ *Flux AI*\n\nPrompt: ${q}\n\n> 𝐆ʜᴏsᴛ-𝐌ᴅ`,
        contextInfo: newsletter
    }, { quoted: mek });
});

// ========== TOOLS ==========
cmd({
    pattern: "aitranslate",
    alias: ["aitrans"],
    desc: "AI Translate",
    category: "ai",
    react: "🌐",
    use: ".aitranslate hello to urdu",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply(`🌐 *AI Translate*\n\nExample:\n.aitranslate Hello how are you to urdu`);

    await reply("🌐 *Translate ho raha hai...*");
    const answer = await freeAI(`Translate this text accurately: ${q}`);
    if (!answer) return reply("❌ Translate fail.");

    await conn.sendMessage(from, {
        text: `🌐 *AI Translate*\n\n${answer}\n\n> 𝐆ʜᴏsᴛ-𝐌ᴅ`,
        contextInfo: newsletter
    }, { quoted: mek });
});

cmd({
    pattern: "grammar",
    desc: "Fix grammar",
    category: "ai",
    react: "📝",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply(`📝 *Grammar*\n\nExample:\n.grammar i is going to school`);

    const answer = await freeAI(`Correct the grammar of this sentence and only return the corrected version:\n${q}`);
    if (!answer) return reply("❌ Fail.");

    await conn.sendMessage(from, {
        text: `📝 *Corrected*\n\n${answer}\n\n> 𝐆ʜᴏsᴛ-𝐌ᴅ`,
        contextInfo: newsletter
    }, { quoted: mek });
});

cmd({
    pattern: "rephrase",
    desc: "Rephrase text",
    category: "ai",
    react: "✍️",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply(`✍️ *Rephrase*\n\nExample:\n.rephrase I am very happy today`);

    const answer = await freeAI(`Rephrase this text in a better way:\n${q}`);
    if (!answer) return reply("❌ Fail.");

    await conn.sendMessage(from, {
        text: `✍️ *Rephrased*\n\n${answer}\n\n> 𝐆ʜᴏsᴛ-𝐌ᴅ`,
        contextInfo: newsletter
    }, { quoted: mek });
});

cmd({
    pattern: "summarize",
    alias: ["summary"],
    desc: "Summarize text",
    category: "ai",
    react: "📄",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply(`📄 *Summarize*\n\nLamba text do summarize karne ke liye`);

    const answer = await freeAI(`Summarize this text in short:\n${q}`);
    if (!answer) return reply("❌ Fail.");

    await conn.sendMessage(from, {
        text: `📄 *Summary*\n\n${answer}\n\n> 𝐆ʜᴏsᴛ-𝐌ᴅ`,
        contextInfo: newsletter
    }, { quoted: mek });
});

cmd({
    pattern: "roast",
    desc: "Roast someone",
    category: "ai",
    react: "🔥",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply(`🔥 *Roast*\n\nExample:\n.roast Ali`);

    const answer = await freeAI(`Write a funny and savage roast for: ${q}. Keep it in Hinglish and not too toxic.`);
    if (!answer) return reply("❌ Fail.");

    await conn.sendMessage(from, {
        text: `🔥 *Roast*\n\n${answer}\n\n> 𝐆ʜᴏsᴛ-𝐌ᴅ`,
        contextInfo: newsletter
    }, { quoted: mek });
});

cmd({
    pattern: "mathai",
    alias: ["math"],
    desc: "Solve math problems",
    category: "ai",
    react: "🧮",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply(`🧮 *Math AI*\n\nExample:\n.mathai 25 * 4 + 10`);

    const answer = await freeAI(`Solve this math problem step by step:\n${q}`);
    if (!answer) return reply("❌ Fail.");

    await conn.sendMessage(from, {
        text: `🧮 *Math Solution*\n\n${answer}\n\n> 𝐆ʜᴏsᴛ-𝐌ᴅ`,
        contextInfo: newsletter
    }, { quoted: mek });
});

cmd({
    pattern: "animeai",
    desc: "Anime style AI response",
    category: "ai",
    react: "🎌",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply(`🎌 *Anime AI*\n\nExample:\n.animeai kaise ho`);

    const answer = await freeAI(`Reply in a cute anime girl style (use some Japanese words like nya, senpai etc):\n${q}`);
    if (!answer) return reply("❌ Fail.");

    await conn.sendMessage(from, {
        text: `🎌 *Anime AI*\n\n${answer}\n\n> 𝐆ʜᴏsᴛ-𝐌ᴅ`,
        contextInfo: newsletter
    }, { quoted: mek });
});
