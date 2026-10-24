// 𝐆ʜᴏsᴛ-𝐌ᴅ💀🚩
const config = require('../config');
const { cmd } = require('../command');

const botName = "𝐆ʜᴏsᴛ-𝐌ᴅ💀🚩";

cmd({
    pattern: "setname",
    alias: ["changename", "groupname", "gname"],
    use: '.setname <नया नाम>',
    desc: "Change the group name.",
    category: "group",
    react: "📝",
    filename: __filename
},

async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, args, reply, sender }) => {
    try {
        if (!isGroup) return reply(`╭┈〔 ${botName} 〕┈⊷\n┋⋄ ➠ यह कमांड सिर्फ ग्रुप में काम करती है!\n╰────────⊷`);
        
        if (!isAdmins) return reply(`╭┈〔 ${botName} 〕┈⊷\n┋⋄ ➠ सिर्फ *Admin* ही ग्रुप का नाम बदल सकते हैं!\n╰────────⊷`);
        
        if (!isBotAdmins) return reply(`╭┈〔 ${botName} 〕┈⊷\n┋⋄ ➠ मुझे पहले *Admin* बनाओ!\n╰────────⊷`);

        const newName = args.join(" ");
        if (!newName) return reply(`╭┈〔 ${botName} 〕┈⊷\n┋⋄ ➠ नया नाम लिखो!\n┋⋄ ➠ उदाहरण: *.setname Ghost Squad*\n╰────────⊷`);

        await conn.groupUpdateSubject(from, newName);

        await conn.sendMessage(from, {
            text: `╭┈─〔 ${botName} 〕┈─⊷
┋⋄ ➠ ✅ ग्रुप का नाम सफलतापूर्वक बदल दिया गया!
┋⋄ ➠ 📝 नया नाम : *${newName}*
┋⋄ ➠ 👑 बदला गया : @${sender.split('@')[0]}
╰────────────────⊷`,
            mentions: [sender],
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
        console.error("Error in setname command:", e);
        reply(`*Error:* \`\`\`${e.message}\`\`\``);
    }
});
