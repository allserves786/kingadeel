// 𝐆ʜᴏsᴛ-𝐌ᴅ💀🚩
const axios = require('axios');
const { cmd } = require('../command');

const botName = "𝐆ʜᴏsᴛ-𝐌ᴅ💀🚩";

cmd({
    pattern: "logo",
    alias: ["style", "fancy", "textlogo", "attitude", "logomaker"],
    use: '.logo <name>',
    desc: "Generate attitude logo image + stylish texts",
    category: "fun",
    react: "✨",
    filename: __filename
},

async (conn, mek, m, { from, args, reply, sender }) => {
    try {
        if (!args[0]) {
            return reply(`╭┈〔 ${botName} 〕┈⊷
┋⋄ ➠ Write a name!
┋⋄ ➠ Example: *.logo Adeel*
╰────────⊷`);
        }

        const name = args.join(" ");
        const upperName = name.toUpperCase();

        // Loading
        let loading = await conn.sendMessage(from, {
            text: `╭┈〔 ${botName} 〕┈⊷
┋⋄ ➠ ✨ Creating logo for *${name}*...
╰────────⊷`
        }, { quoted: mek });

        // ========== 1. IMAGE LOGO ==========
        try {
            // Free logo API (text to image)
            const logoRes = await axios.get(
                `https://api.lolhuman.xyz/api/textprome/pornhub?apikey=GataDios&text1=${encodeURIComponent(upperName)}&text2=GHOST`,
                { responseType: 'arraybuffer', timeout: 20000 }
            );

            const logoBuffer = Buffer.from(logoRes.data);

            await conn.sendMessage(from, {
                image: logoBuffer,
                caption: `╭┈─〔 ${botName} 〕┈─⊷
┋⋄ ➠ ✨ *Logo Created*
┋⋄ ➠ Name: *${name}*
┋⋄ ➠ 👑 @${sender.split('@')[0]}
╰────────────────⊷`,
                mentions: [sender]
            }, { quoted: mek });

        } catch (imgErr) {
            console.log("Logo image error:", imgErr.message);
            // Agar image fail ho to sirf text styles bhej denge
        }

        // ========== 2. STYLE TEXTS ==========
        const styles = [
            `★彡 ${upperName} 彡★`,
            `꧁𓊈𒆜 ${upperName} 𒆜𓊉꧂`,
            `✦✧ ${upperName} ✧✦`,
            `❖ ${upperName} ❖`,
            `『 ${upperName} 』`,
            `🔥 ${upperName} 🔥`,
            `💀 ${upperName} 💀`,
            `👑 ${upperName} 👑`,
            `⚡ ${upperName} ⚡`,
            `🖤 ${upperName} 🖤`,
            `꧁༒☬ ${upperName} ☬༒꧂`,
            `✧･ﾟ: * ${upperName} *:･ﾟ✧`,
            `♛ ${upperName} ♛`,
            `⚔ ${upperName} ⚔`,
            `⟪ ${upperName} ⟫`
        ];

        // Har baar random 8 styles
        const selected = styles.sort(() => 0.5 - Math.random()).slice(0, 8);

        let styleText = `╭┈─〔 ${botName} 〕┈─⊷
┋⋄ ➠ ✨ *Attitude Styles*
┋⋄ ➠ Name: *${name}*
┋⋄ ➠ 
`;

        selected.forEach((s, i) => {
            styleText += `┋⋄ ➠ ${i + 1}. ${s}\n`;
        });

        styleText += `┋⋄ ➠ 
┋⋄ ➠ 👑 @${sender.split('@')[0]}
╰────────────────⊷`;

        await conn.sendMessage(from, {
            text: styleText,
            mentions: [sender]
        }, { quoted: mek });

        // Delete loading
        await conn.sendMessage(from, { delete: loading.key });

    } catch (e) {
        console.error("logo error:", e);
        reply(`╭┈〔 ${botName} 〕┈⊷
┋⋄ ➠ ❌ Failed to create logo
┋⋄ ➠ Try again later
╰────────⊷`);
    }
});
