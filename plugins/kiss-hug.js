// plugins/kiss-hug.js — Ghost-MD
const { cmd } = require('../command');

// ============================================
// KISS COMMAND
// ============================================
cmd({
    pattern: "kiss",
    alias: ["chumma", "kissme", "pyaar"],
    desc: "Send a virtual kiss",
    react: "💋",
    category: "fun",
    filename: __filename
}, async (conn, mek, m, { from, sender, reply, args }) => {
    try {
        let target = args[0] ? args.join(" ") : "tum";
        
        const kisses = [
            `💋 *KISS BHEJA!* 💋\n\n@\( {sender.split("@")[0]} ne * \){target}* ko ek soft kiss diya 😘\n\n*"Chumma le lo... dil se!"* 💕`,
            `💋 *VIRTUAL KISS!* 💋\n\n*${target}* ke liye special kiss 💋\n\n(っ˘з(˘⌣˘ ) 💋\n\n*"Yeh kiss sirf tumhare liye hai!"* 🥺❤️`,
            `💋 *CHUMMA ALERT!* 💋\n\n@\( {sender.split("@")[0]} ne * \){target}* ko kiss kar diya!\n\n*"Ab sharmao mat... le lo!"* 😂💋`
        ];

        await conn.sendMessage(from, {
            text: kisses[Math.floor(Math.random() * kisses.length)],
            mentions: [sender]
        }, { quoted: mek });

    } catch (e) {
        console.error("kiss error:", e);
        reply(`*Error:* ${e.message}`);
    }
});

// ============================================
// HUG COMMAND
// ============================================
cmd({
    pattern: "hug",
    alias: ["gale", "hugme", "embrace"],
    desc: "Send a warm virtual hug",
    react: "🤗",
    category: "fun",
    filename: __filename
}, async (conn, mek, m, { from, sender, reply, args }) => {
    try {
        let target = args[0] ? args.join(" ") : "tum";
        
        const hugs = [
            `🤗 *HUG BHEJA!* 🤗\n\n@\( {sender.split("@")[0]} ne * \){target}* ko tight hug diya 🫂\n\n*"Aao gale lag jao... sab theek ho jayega!"* 💛`,
            `🤗 *WARM HUG!* 🤗\n\n*${target}* ke liye special hug 🫂\n\n(っ◔◡◔)っ ❤️\n\n*"Yeh hug dil se hai!"* 🥺💕`,
            `🤗 *GALE LAGAO!* 🤗\n\n@\( {sender.split("@")[0]} ne * \){target}* ko gale laga liya!\n\n*"Ab mat ro... main hun na!"* 😭❤️`
        ];

        await conn.sendMessage(from, {
            text: hugs[Math.floor(Math.random() * hugs.length)],
            mentions: [sender]
        }, { quoted: mek });

    } catch (e) {
        console.error("hug error:", e);
        reply(`*Error:* ${e.message}`);
    }
});
