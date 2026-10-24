
const { isJidBroadcast, isJidGroup, isJidNewsletter } = require('@whiskeysockets/baileys');

// Bounded in-memory stores to prevent RAM bloat and disk I/O bottlenecks on Heroku/Render/Railway
const MAX_MESSAGES = 350;
const MAX_CONTACTS = 800;
const MAX_GROUPS = 150;
const MAX_COUNTS = 1000;
const MESSAGE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const messagesMap = new Map();      // id -> { id, jid, message, timestamp }
const contactsMap = new Map();      // jid -> name
const groupMetaMap = new Map();     // jid -> metadata
const msgCountMap = new Map();      // `${jid}:${sender}` -> { jid, sender, count }

function enforceLimit(map, limit) {
    while (map.size > limit) {
        const oldestKey = map.keys().next().value;
        if (oldestKey === undefined) break;
        map.delete(oldestKey);
    }
}

const saveContact = async (jid, name) => {
    if (!jid || !name || isJidGroup(jid) || isJidBroadcast(jid) || isJidNewsletter(jid)) return;
    if (contactsMap.has(jid)) contactsMap.delete(jid);
    contactsMap.set(jid, String(name).slice(0, 80));
    enforceLimit(contactsMap, MAX_CONTACTS);
};

const getContacts = async () => {
    const list = [];
    for (const [jid, name] of contactsMap.entries()) {
        list.push({ jid, name });
    }
    return list;
};

const saveMessage = async (message) => {
    if (!message || !message.key) return;
    const jid = message.key.remoteJid;
    const id = message.key.id;
    if (!id || !jid || jid === 'status@broadcast' || isJidNewsletter(jid)) return;

    if (message.sender && message.pushName) {
        saveContact(message.sender, message.pushName).catch(() => {});
    }

    const timestamp = Date.now();
    // Store lightweight copy of message for AntiDelete / AntiEdit
    const slimMessage = {
        key: message.key,
        message: message.message,
        messageTimestamp: message.messageTimestamp,
        pushName: message.pushName,
        sender: message.sender
    };

    if (messagesMap.has(id)) messagesMap.delete(id);
    messagesMap.set(id, { id, jid, message: slimMessage, timestamp });
    enforceLimit(messagesMap, MAX_MESSAGES);
};

const loadMessage = async (id) => {
    if (!id) return null;
    return messagesMap.get(id) || null;
};

const getName = async (jid) => {
    if (!jid) return 'Unknown';
    return contactsMap.get(jid) || jid.split('@')[0].replace(/_/g, ' ');
};

const saveGroupMetadata = async (jid, client) => {
    if (!isJidGroup(jid) || !client) return;
    try {
        const groupMetadata = await client.groupMetadata(jid);
        if (!groupMetadata) return;
        const metadata = {
            jid: groupMetadata.id,
            subject: groupMetadata.subject,
            subjectOwner: groupMetadata.subjectOwner,
            subjectTime: groupMetadata.subjectTime
                ? new Date(groupMetadata.subjectTime * 1000).toISOString()
                : null,
            size: groupMetadata.size,
            creation: groupMetadata.creation ? new Date(groupMetadata.creation * 1000).toISOString() : null,
            owner: groupMetadata.owner,
            desc: groupMetadata.desc,
            descId: groupMetadata.descId,
            linkedParent: groupMetadata.linkedParent,
            restrict: groupMetadata.restrict,
            announce: groupMetadata.announce,
            isCommunity: groupMetadata.isCommunity,
            isCommunityAnnounce: groupMetadata.isCommunityAnnounce,
            joinApprovalMode: groupMetadata.joinApprovalMode,
            memberAddMode: groupMetadata.memberAddMode,
            ephemeralDuration: groupMetadata.ephemeralDuration,
            participants: (groupMetadata.participants || []).map((p) => ({
                id: p.id,
                jid,
                participantId: p.id,
                admin: p.admin,
            })),
        };
        if (groupMetaMap.has(jid)) groupMetaMap.delete(jid);
        groupMetaMap.set(jid, metadata);
        enforceLimit(groupMetaMap, MAX_GROUPS);
    } catch (_) {}
};

const getGroupMetadata = async (jid) => {
    if (!isJidGroup(jid)) return null;
    return groupMetaMap.get(jid) || null;
};

const saveMessageCount = async (message) => {
    if (!message || !message.key) return;
    const jid = message.key.remoteJid;
    const sender = message.key.participant || message.sender;
    if (!jid || !sender || !isJidGroup(jid)) return;

    const key = `${jid}:${sender}`;
    const existing = msgCountMap.get(key);
    if (existing) {
        existing.count += 1;
    } else {
        msgCountMap.set(key, { jid, sender, count: 1 });
        enforceLimit(msgCountMap, MAX_COUNTS);
    }
};

const getInactiveGroupMembers = async (jid) => {
    if (!isJidGroup(jid)) return [];
    const groupMetadata = await getGroupMetadata(jid);
    if (!groupMetadata || !Array.isArray(groupMetadata.participants)) return [];

    const inactiveMembers = groupMetadata.participants.filter((participant) => {
        const pid = participant.id || participant.participantId;
        const record = msgCountMap.get(`${jid}:${pid}`);
        return !record || record.count === 0;
    });

    return inactiveMembers.map((member) => member.id || member.participantId);
};

const getGroupMembersMessageCount = async (jid) => {
    if (!isJidGroup(jid)) return [];
    const groupCounts = [];
    for (const record of msgCountMap.values()) {
        if (record.jid === jid && record.count > 0) {
            groupCounts.push(record);
        }
    }
    groupCounts.sort((a, b) => b.count - a.count);

    return Promise.all(
        groupCounts.map(async (record) => ({
            sender: record.sender,
            name: await getName(record.sender),
            messageCount: record.count,
        }))
    );
};

const getChatSummary = async () => {
    const byJid = new Map();
    for (const msg of messagesMap.values()) {
        const entry = byJid.get(msg.jid) || { count: 0, lastTimestamp: 0 };
        entry.count += 1;
        if (msg.timestamp > entry.lastTimestamp) entry.lastTimestamp = msg.timestamp;
        byJid.set(msg.jid, entry);
    }

    const summaries = [];
    for (const [jid, info] of byJid.entries()) {
        const chatName = isJidGroup(jid) ? jid : await getName(jid);
        summaries.push({
            jid,
            name: chatName,
            messageCount: info.count,
            lastMessageTimestamp: info.lastTimestamp || null,
        });
    }

    return summaries.sort((a, b) => (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0));
};

const saveMessageV2 = async (message) => {
    await saveMessage(message);
    await saveMessageCount(message);
};

// Periodic memory cleanup every 3 minutes
setInterval(() => {
    try {
        const cutoff = Date.now() - MESSAGE_TTL_MS;
        for (const [id, entry] of messagesMap.entries()) {
            if (entry.timestamp < cutoff) {
                messagesMap.delete(id);
            }
        }
        if (typeof global.gc === 'function') {
            global.gc();
        }
    } catch (_) {}
}, 3 * 60 * 1000).unref();

module.exports = {
    saveContact,
    getContacts,
    loadMessage,
    getName,
    getChatSummary,
    saveGroupMetadata,
    getGroupMetadata,
    saveMessageCount,
    getInactiveGroupMembers,
    getGroupMembersMessageCount,
    saveMessage: saveMessageV2,
};
