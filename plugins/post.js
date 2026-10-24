// 𝐆ʜᴏsᴛ-𝐌ᴅ💀🚩
const config = require('../config');
const { cmd } = require('../command');

const botName = "𝐆ʜᴏsᴛ-𝐌ᴅ💀🚩";

// ====================== YOUR CHANNELS ======================
const channels = [
    "120363427726080403@newsletter",
    "120363427699571996@newsletter",
    "120363427178745909@newsletter",
    "120363426597283338@newsletter",
    "120363427193954406@newsletter",
    "120363427469681449@newsletter",
    "120363425853645059@newsletter",
    "120363411122450099@newsletter",
    "120363427843226885@newsletter",
    "120363404811118873@newsletter"
];
// ===========================================================

cmd({
    pattern: "post",
    alias: ["cpost", "channelpost", "broadcast"],
    use: '.post <message>',
    desc: "Post a message to all configured channels.",
    category: "owner",
    react: "📢",
    filename: __filename
},

async (conn, mek, m, { from, args, reply, sender, isOwner }) => {
    try {
        if (!isOwner) {
            return reply(`╭┈〔 ${botName} 〕┈⊷
┋⋄ ➠ ❌ This command is only for the Owner!
╰────────⊷`);
        }

        const text = args.join(" ");
        if (!text) {
            return reply(`╭┈〔 ${botName} 〕┈⊷
┋⋄ ➠ Please write the message to post!
┋⋄ ➠ Example: *.post New update is live now!*
╰────────⊷`);
        }

        let successCount = 0;
        let failedCount = 0;

        // Send to all channels
        for (const channelJid of channels) {
            try {
                await conn.sendMessage(channelJid, {
                    text: text
                });
                successCount++;
            } catch (err) {
                console.error(`Failed to post on ${channelJid}:`, err);
                failedCount++;
            }
        }

        // Confirmation message
        await conn.sendMessage(from, {
            text: `╭┈─〔 ${botName} 〕┈─⊷
┋⋄ ➠ ✅ Post sent successfully!
┋⋄ ➠ 📢 Total Channels : ${channels.length}
┋⋄ ➠ ✅ Success : ${successCount}
┋⋄ ➠ ❌ Failed : ${failedCount}
┋⋄ ➠ ✍️ Message : ${text}
┋⋄ ➠ 👑 @${sender.split('@')[0]}
╰────────────────⊷`,
            mentions: [sender],
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: channels[0],
                    newsletterName: "𝐆ʜᴏsᴛ-𝐌ᴅ",
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in post command:", e);
        reply(`*An error occurred:* \`\`\`${e.message}\`\`\``);
    }
});
