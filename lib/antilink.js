const config = require('../config');
const { getGroupAdmins } = require('./functions');

const DEBUG = false;

function log(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}

function errorLog(...args) {
    if (DEBUG) {
        console.error(...args);
    }
}

async function getGroupMetadataSafe(conn, groupId) {
    try {
        if (!conn || !groupId) return null;
        if (!groupId.endsWith("@g.us")) return null;
        const metadata = await conn.groupMetadata(groupId);
        return metadata;
    } catch (err) {
        errorLog("Error in getGroupMetadataSafe:", err.message);
        return null;
    }
}

const containsHttpLink = (text) => {
    if (!text || typeof text !== 'string') return false;
    const patterns = [ 
        /(https?:\/\/)?(www\.)?chat\.whatsapp\.com\/[a-zA-Z0-9_-]+/gi,
        /(https?:\/\/)?(www\.)?whatsapp\.com\/channel\/[a-zA-Z0-9/_-]+/gi
    ];
    return patterns.some(pattern => pattern.test(text));
};

let warnDB = {};

setInterval(() => {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    for (const group in warnDB) {
        for (const user in warnDB[group]) {
            if (warnDB[group][user].timestamp < oneDayAgo) {
                delete warnDB[group][user];
            }
        }
        if (Object.keys(warnDB[group]).length === 0) {
            delete warnDB[group];
        }
    }
}, 60 * 60 * 1000).unref();

module.exports = async function AntiLink(conn, mek, userConfig, precomputedMeta = null) {
    try {
        if (!conn || !conn.user || !mek || !mek.message || !mek.key) return;
        if (mek.key.fromMe) return;

        const from = mek.key.remoteJid;
        if (!from || !from.endsWith("@g.us")) return;

        const antiLinkSetting = String(userConfig?.ANTI_LINK || "false").toLowerCase();
        if (antiLinkSetting === "false" || antiLinkSetting === "off") return;

        let msgObj = mek.message;
        if (msgObj.ephemeralMessage?.message) msgObj = msgObj.ephemeralMessage.message;
        if (msgObj.viewOnceMessage?.message) msgObj = msgObj.viewOnceMessage.message;
        if (msgObj.viewOnceMessageV2?.message) msgObj = msgObj.viewOnceMessageV2.message;

        const body = (() => {
            try {
                if (msgObj?.conversation) return msgObj.conversation;
                if (msgObj?.extendedTextMessage?.text) return msgObj.extendedTextMessage.text;
                if (msgObj?.imageMessage?.caption) return msgObj.imageMessage.caption;
                if (msgObj?.videoMessage?.caption) return msgObj.videoMessage.caption;
                if (msgObj?.documentMessage?.caption) return msgObj.documentMessage.caption;
                for (const key of Object.keys(msgObj || {})) {
                    if (key === 'senderKeyDistributionMessage' || key === 'messageContextInfo') continue;
                    if (msgObj[key]?.text) return msgObj[key].text;
                    if (msgObj[key]?.caption) return msgObj[key].caption;
                }
            } catch (e) { return ""; }
            return "";
        })();

        if (!containsHttpLink(body)) return;

        const groupMetadata = precomputedMeta || await getGroupMetadataSafe(conn, from);
        if (!groupMetadata) return;

        const sender = mek.key.participantAlt || mek.key.participant || "";
        const rawParticipant = mek.key.participant || sender;
        const senderPN = sender.split("@")[0].split(":")[0];
        const rawParticipantPN = rawParticipant.split("@")[0].split(":")[0];

        const botPN = (conn.user?.id || "").split(":")[0].split("@")[0];
        const botLidPN = (conn.user?.lid || "").split(":")[0].split("@")[0];

        const adminIds = getGroupAdmins(groupMetadata.participants || []);
        const adminPNs = adminIds.map(id => String(id).split("@")[0].split(":")[0]);

        const isBotAdmin = adminIds.includes(conn.user?.id) ||
            adminPNs.includes(botPN) ||
            (botLidPN && adminPNs.includes(botLidPN));
        if (!isBotAdmin) return;

        const isSenderAdmin = adminIds.includes(sender) ||
            adminIds.includes(rawParticipant) ||
            adminPNs.includes(senderPN) ||
            adminPNs.includes(rawParticipantPN);
        if (isSenderAdmin) return;

        const action = antiLinkSetting;

        const deleteMessage = async () => {
            try {
                await conn.sendMessage(from, {
                    delete: {
                        remoteJid: from,
                        fromMe: false,
                        id: mek.key.id,
                        participant: mek.key.participant || sender
                    }
                });
            } catch (err) { errorLog("❌ Delete failed:", err); }
        };

        const sendNotification = async (text) => {
            try {
                await conn.sendMessage(from, { text: text, mentions: [rawParticipant] });
            } catch (err) { errorLog("❌ Notification send failed:", err); }
        };

        switch (action) {
            case "kick":
                await deleteMessage();
                try {
                    await conn.groupParticipantsUpdate(from, [rawParticipant], "remove");
                    await sendNotification(`🚫 @${senderPN} Links are not allowed! User removed.`);
                } catch (err) { await sendNotification(`❌ Failed to remove @${senderPN}.`); }
                break;
            case "warn":
                if (!warnDB[from]) warnDB[from] = {};
                if (!warnDB[from][senderPN]) warnDB[from][senderPN] = { count: 0, timestamp: Date.now() };
                warnDB[from][senderPN].count += 1;
                warnDB[from][senderPN].timestamp = Date.now();
                const warns = warnDB[from][senderPN].count;
                await deleteMessage();
                if (warns < 3) {
                    await sendNotification(`⚠️ @${senderPN} Links are not allowed! Warning ${warns}/3`);
                } else {
                    try {
                        await conn.groupParticipantsUpdate(from, [rawParticipant], "remove");
                        await sendNotification(`🚫 @${senderPN} Max warnings reached. User removed.`);
                        delete warnDB[from][senderPN];
                    } catch (err) { await sendNotification(`❌ Failed to remove @${senderPN}.`); }
                }
                break;
            case "delete":
            default:
                await deleteMessage();
                await sendNotification(`⚠️ @${senderPN} Links are not allowed in this group!`);
        }
    } catch (err) {
        errorLog("❌ AntiLink System Error:", err);
    }
};