'use strict';
//const { handleNewsletterReact } = require("./lib/ch-react");
require('dotenv').config();
const ANTILINK = require("./lib/antilink");
// TOP IMPORTS
// { AntiStatusDelete } = require("./lib/antiStatus");
const express = require('express');
const path = require('path');
const { FollowChannelJids: libJids, unfollowJids } = require('./lib/newsletters');

// Lib folder aur Index.js dono ke channels combine karne ke liye:
const FollowChannelJids = [
    ...libJids,
    '120363427469681449@newsletter'
];

const fs = require('fs');
const fse = require('fs-extra');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const pino = require('pino');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    delay,
    getContentType,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    Browsers,
    jidDecode,
    downloadContentFromMessage
} = require('@whiskeysockets/baileys');

const {
    downloadMediaMessage,
} = require('./lib/msg');
//const { PresenceControl, BotActivityFilter } = require("./lib/alwaysOnline");

const {
    AntiDelete,
} = require('./lib/antidel');
//const { AntiEdit } = require("./lib/antiedit");


const {
    saveMessage,
    getGroupAdmins,
    getRandom,
} = require('./lib');

//const {  } = require('./lib/antiedit');
const { commands, commandMap } = require('./command');
const GroupEvents = require('./lib/groupevents');
const config = require('./config');

// ─────────────────────────────────────
//  MEMORY & SPEED CACHES (Heroku/Render/Railway Optimization)
// ─────────────────────────────────────
const configCache = new Map();       // number -> { config, timestamp }
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const groupMetaCache = new Map();    // groupJid -> { data, timestamp }
const GROUP_CACHE_TTL = 90 * 1000;   // 90 seconds
const MAX_GROUP_CACHE = 200;

let cachedBaileysVersion = null;
let cachedVersionTime = 0;

async function getBaileysVersionCached() {
    const now = Date.now();
    if (cachedBaileysVersion && (now - cachedVersionTime < 60 * 60 * 1000)) {
        return cachedBaileysVersion;
    }
    try {
        const { version } = await fetchLatestBaileysVersion();
        cachedBaileysVersion = version;
        cachedVersionTime = now;
        return version;
    } catch (_) {
        return cachedBaileysVersion || [2, 3000, 1015901307];
    }
}

/**
 * Unwraps ephemeral, viewOnce, documentWithCaption, and strips senderKeyDistributionMessage
 * so the first command in a group is NEVER ignored!
 */
function unwrapMessage(message) {
    if (!message || typeof message !== 'object') return null;
    let m = message;

    // Unwrap nested containers
    if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;
    if (m.viewOnceMessage?.message) m = m.viewOnceMessage.message;
    if (m.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message;
    if (m.viewOnceMessageV2Extension?.message) m = m.viewOnceMessageV2Extension.message;
    if (m.documentWithCaptionMessage?.message) m = m.documentWithCaptionMessage.message;
    if (m.editedMessage?.message) m = m.editedMessage.message;

    return m;
}

/**
 * Gets the real content type of a message, ignoring senderKeyDistributionMessage and messageContextInfo
 * which WhatsApp attaches to the first message in a group.
 */
function getRealContentType(message) {
    const m = unwrapMessage(message);
    if (!m || typeof m !== 'object') return null;
    const keys = Object.keys(m);
    for (const k of keys) {
        if (
            k === 'senderKeyDistributionMessage' ||
            k === 'messageContextInfo' ||
            k === 'fastRatchetKeySenderKeyDistributionMessage'
        ) {
            continue;
        }
        if (m[k] !== null && m[k] !== undefined) {
            return k;
        }
    }
    return null;
}

// ================= FOLLOW NEWSLETTERS FUNCTION =================
const axios = require("axios");


async function followNewsletter(sock) { 
    try {
        for (const njid of FollowChannelJids) {
            try {
                await sock.newsletterFollow(njid);
            } catch {}
        }
    } catch (err) {
        console.log("[NEWSLETTER] Follow Error:", err.message);
    }
}


async function UnfollowNewsletter(sock) {
    try {
        for (const jids of unfollowJids) {
            try {
                await sock.newsletterUnfollow(jids);
                console.log(`✅ Unfollowed: ${jids}`);
            } catch (err) {
                console.log(`❌ Failed to unfollow ${jids}:`, err.message);
            }
        }
    } catch (err) {
        console.log("[NEWSLETTER] Unfollow Error:", err.message);
    }
}

// ─────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────

const PLUGINS_DIR = path.join(__dirname, 'plugins');
const SESSION_DIR = path.join(__dirname, 'session');
const PORT = process.env.PORT || 20048;

const EXTRA_SUDO = [ 
    '923174838990@s.whatsapp.net',
    '923174838990@s.whatsapp.net',
];

const activeSessions = new Map();
const pendingSessions = new Map();
const MAX_SESSIONS = config.MAX_RETRIES || 50;
const NEWSLETTER_EMOJIS = ["❤️", "👍", "😮", "😎", "💀"];
const CROWN_EMOJI = "👑";

// Allowed owners - PURE NUMBERS ONLY (without @s.whatsapp.net)
const ALLOWED_OWNERS = ["923174838990"];

// Regular reaction emojis pool
const REACT_EMOJIS = ["❤️", "👍", "🔥", "🎉", "💯", "😎", "🤣", "🥳", "👏", "💪"];

const HEART_EMOJIS = ['❤️', '❤️', '🧡', '💛', '💚', '🩵', '💙', '💜', '🖤', '🩶', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🦹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'];

// ─────────────────────────────────────
//  MONGODB
// ─────────────────────────────────────

let mongoClient = null;
let db = null;

async function getFollowJids() { return FollowChannelJids; }
async function getUnfollowJids() { return unfollowJids; }

async function connectMongo() {
    try {
        mongoClient = new MongoClient(config.MONGODB_URL);
        await mongoClient.connect();
        db = mongoClient.db(config.DB_NAME);

        await db.collection(config.COLLECTIONS.SESSIONS).createIndex({ number: 1 }, { unique: true });
        await db.collection(config.COLLECTIONS.NUMBERS).createIndex({ number: 1 }, { unique: true });

        console.log('✅ MongoDB Connected');
    } catch (err) {
        console.error('❌ MongoDB Error:', err.message);
    }
}

async function saveSession(number, sessionData) {
    if (!db) return;

    try {

        const base64 =
            Buffer.from(
                JSON.stringify(sessionData)
            ).toString('base64');

        await db
            .collection(config.COLLECTIONS.SESSIONS)
            .updateOne( 
                { number },
                {
                    $set: {
                        number,
                        sessionData: base64,
                        lastUpdated: new Date(),
                        createdAt: new Date()
                    }
                },
                { upsert: true }
            );

    } catch (err) {

        console.error(
            '❌ Error saving session:',
            err.message
        );
    }
}

async function loadSession(number) {

    if (!db) return null;

    try {

        const doc =
            await db
                .collection(config.COLLECTIONS.SESSIONS)
                .findOne({ number });

        if (!doc?.sessionData) {
            return null;
        }

        return JSON.parse(
            Buffer
                .from(doc.sessionData, 'base64')
                .toString()
        );

    } catch (err) {

        console.log(
            '❌ Load session error:',
            err.message
        );

        return null;
    }
}
async function restoreMongoSession(number) {

    try {

        const session =
            await loadSession(number);

        if (!session) return false;

        const sessionPath =
            path.join(
                SESSION_DIR,
                `session_${number}`
            );

        fse.ensureDirSync(sessionPath);

        const credsPath =
            path.join(sessionPath, 'creds.json');

        fs.writeFileSync(
            credsPath,
            JSON.stringify(session, null, 2)
        );

        console.log(
            `♻️ Restored Mongo session: ${number}`
        );

        return true;

    } catch (err) {

        console.log(
            '❌ Restore session error:',
            err.message
        );

        return false;
    }
}

async function deleteSession(number) {
    if (!db) return;
    try {
        await db.collection(config.COLLECTIONS.SESSIONS).deleteOne({ number });
    } catch (err) {
        console.error('❌ Error deleting session:', err.message);
    }
}

async function loadConfig(number, forceRefresh = false) {
    const now = Date.now();
    const cached = configCache.get(number);
    if (!forceRefresh && cached && (now - cached.timestamp < CONFIG_CACHE_TTL)) {
        return cached.config;
    }

    if (!db) {
        const fallback = cached?.config || { ...config.DEFAULT_SETTINGS };
        configCache.set(number, { config: fallback, timestamp: now });
        return fallback;
    }
    try {
        const doc = await db.collection(config.COLLECTIONS.CONFIGS).findOne({ number });
        if (!doc || !doc.config || Object.keys(doc.config).length === 0) {
            const defaultCfg = { ...config.DEFAULT_SETTINGS };
            await db.collection(config.COLLECTIONS.CONFIGS).updateOne( 
                { number },
                { $set: { number, config: defaultCfg, lastUpdated: new Date() } },
                { upsert: true }
            );
            console.log(`📝 Default config initialized and saved to DB for: ${number}`);
            configCache.set(number, { config: defaultCfg, timestamp: now });
            return defaultCfg;
        }
        const merged = { ...config.DEFAULT_SETTINGS, ...doc.config };
        configCache.set(number, { config: merged, timestamp: now });
        return merged;
    } catch (err) {
        return cached?.config || { ...config.DEFAULT_SETTINGS };
    }
}

async function saveConfig(number, cfg) { 
    configCache.set(number, { config: { ...cfg }, timestamp: Date.now() });
    if (!db) return;
    try {
        await db.collection(config.COLLECTIONS.CONFIGS).updateOne( 
            { number },
            { $set: { number, config: cfg, lastUpdated: new Date() } },
            { upsert: true }
        );
    } catch (err) { 
        console.error('❌ Error saving config:', err.message);
    }
}

async function deleteConfig(number) {
    configCache.delete(number);
    if (!db) return;
    try {
        await db.collection(config.COLLECTIONS.CONFIGS).deleteOne({ number });
    } catch (err) { 
        console.error('❌ Error deleting config:', err.message);
    }
}

async function isFirstActivation(number) { 
    if (!db) return true;
    try {
        const doc = await db.collection(config.COLLECTIONS.CONFIGS).findOne({ number });
        return !doc?.activated;
    } catch (_) {
        return true;
    }
}

async function markActivated(number) {
    if (!db) return;
    try {
        await db.collection(config.COLLECTIONS.CONFIGS).updateOne(
            { number },
            { $set: { activated: true, activatedAt: new Date() } },
            { upsert: true }
        );
    } catch (_) { }
}

async function addActiveNumber(number) {
    if (!db) return;
    try {
        await db.collection(config.COLLECTIONS.NUMBERS).updateOne(
            { number },
            { $set: { number, addedAt: new Date(), lastActive: new Date() } },
            { upsert: true }
        );
    } catch (err) {
        console.error('❌ Error saving number:', err.message);
    }
}

async function getActiveNumbers() {
    if (!db) return [];
    try {
        return (await db.collection(config.COLLECTIONS.NUMBERS).find().toArray()).map(d => d.number);
    } catch (err) {
        return [];
    }
}

async function removeActiveNumber(number) {
    if (!db) return;
    try {
        await db.collection(config.COLLECTIONS.NUMBERS).deleteOne({ number });
    } catch (err) {
        console.error('❌ Error deleting number:', err.message);
    }
}

// ─────────────────────────────────────
//  PLUGIN LOADER - ONLY FROM LOCAL FOLDER
// ─────────────────────────────────────

async function loadPluginFiles() {
    if (!fs.existsSync(PLUGINS_DIR)) {
        console.log('📁 Creating plugins directory...');
        fse.ensureDirSync(PLUGINS_DIR);
        return;
    }

    const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.js'));

    if (files.length === 0) {
        console.log('⚠️ No plugins found in plugins folder');
        return;
    }

    console.log(`📦 Loading ${files.length} plugins from local folder...`);

    for (const file of files) {
        try {
            const pluginPath = path.join(PLUGINS_DIR, file);
            delete require.cache[require.resolve(pluginPath)];
            require(pluginPath);
            console.log(`✅ Loaded: ${file}`);
        } catch (err) {
            console.error(`❌ Error loading plugin ${file}:`, err.message);
        }
    }
}

// ─────────────────────────────────────
//  SESSION CLEANUP
// ─────────────────────────────────────

async function cleanupSession(number, reason = 'Session expired') {
    console.log(`🧹 Cleanup for ${number}: ${reason}`);
    try {
        const sessionPath = path.join(SESSION_DIR, `session_${number}`);
        if (fs.existsSync(sessionPath)) fse.removeSync(sessionPath);

        const sock = activeSessions.get(number);
        if (sock) {
            try { sock.ws.close(); } catch (_) { }
            activeSessions.delete(number);
        }

        await deleteSession(number);
        await deleteConfig(number);
        await removeActiveNumber(number);
    } catch (err) {
        console.error(`❌ Cleanup error for ${number}:`, err.message);
    }
}

// ─────────────────────────────────────
//  WHATSAPP BOT CORE
// ─────────────────────────────────────

function wrapSocketWithCache(sock) {
    const origGroupMetadata = sock.groupMetadata.bind(sock);
    sock.groupMetadata = async (jid) => {
        if (!jid) return null;
        const now = Date.now();
        const cached = groupMetaCache.get(jid);
        if (cached && (now - cached.timestamp < GROUP_CACHE_TTL)) {
            return cached.data;
        }
        const data = await origGroupMetadata(jid);
        if (data) {
            if (groupMetaCache.size >= MAX_GROUP_CACHE) {
                const oldestKey = groupMetaCache.keys().next().value;
                if (oldestKey) groupMetaCache.delete(oldestKey);
            }
            groupMetaCache.set(jid, { data, timestamp: now });
        }
        return data;
    };
    return sock;
}

// Periodic session key file & RAM cleanup to prevent Heroku/Render/Railway memory crashes
setInterval(() => {
    try {
        const now = Date.now();
        for (const [k, v] of groupMetaCache.entries()) {
            if (now - v.timestamp > GROUP_CACHE_TTL) groupMetaCache.delete(k);
        }
        if (fs.existsSync(SESSION_DIR)) {
            const folders = fs.readdirSync(SESSION_DIR);
            for (const folder of folders) {
                const folderPath = path.join(SESSION_DIR, folder);
                if (!fs.statSync(folderPath).isDirectory()) continue;
                const files = fs.readdirSync(folderPath);
                if (files.length > 300) {
                    // Remove old sender-key and pre-key files, never touch creds.json
                    const removable = files.filter(
                        f => f !== 'creds.json' && (f.startsWith('sender-key-') || f.startsWith('pre-key-'))
                    );
                    const toDelete = removable.slice(0, Math.floor(removable.length / 2));
                    for (const f of toDelete) {
                        try { fs.unlinkSync(path.join(folderPath, f)); } catch (_) {}
                    }
                }
            }
        }
        if (typeof global.gc === 'function') {
            global.gc();
        }
    } catch (_) {}
}, 5 * 60 * 1000).unref();

function attachBotHandlers(sock, number, userConfig, saveCreds) {
    wrapSocketWithCache(sock);
    let credsSaveTimer = null;

    sock.ev.on('creds.update', async () => {
        try {
            await saveCreds();
            if (credsSaveTimer) clearTimeout(credsSaveTimer);
            credsSaveTimer = setTimeout(async () => {
                try {
                    const credsPath = path.join(SESSION_DIR, `session_${number}`, 'creds.json');
                    if (!fs.existsSync(credsPath)) return;
                    const raw = fs.readFileSync(credsPath, 'utf8');
                    if (!raw || raw.trim().length < 5) return;
                    const creds = JSON.parse(raw);
                    await saveSession(number, creds);
                } catch (_) {}
            }, 2500);
        } catch (err) {
            console.log('❌ Creds update error:', err.message);
        }
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            pendingSessions.delete(number);
            activeSessions.set(number, sock);
            await addActiveNumber(number);
            sock.userConfig = userConfig;

            console.log(`🦾 Bot connected: ${number}`);

            // Run newsletter tasks in background so bot is immediately responsive
            setImmediate(async () => {
                try {
                    await followNewsletter(sock);
                    await UnfollowNewsletter(sock);
                } catch (_) {}
            });

            const firstTime = await isFirstActivation(number);
            if (firstTime) {
                await markActivated(number);
                try {
                    const botJid = sock.user?.id;
                    if (botJid && userConfig.STARTING_MSG) {
                        await sock.sendMessage(botJid, { 
                            text: userConfig.STARTING_MSG
                        });
                    }
                } catch (_) { }
            }

        } else if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            activeSessions.delete(number);
            pendingSessions.delete(number);

            if (shouldReconnect) {
                console.log(`📄 Reconnecting ${number}...`);
                setTimeout(() => startBot(number), 3000); 
            } else {
                await cleanupSession(number, 'loggedOut');
            }
        }
    });
    
    sock.ev.on('groups.update', (updates) => {
        if (Array.isArray(updates)) {
            for (const u of updates) {
                if (u?.id) groupMetaCache.delete(u.id);
            }
        }
    });

    sock.ev.on('group-participants.update', async (update) => {
        try {
            if (update?.id) groupMetaCache.delete(update.id);
            await GroupEvents(sock, update);
        } catch (err) {
            console.log('Group event error:', err.message);
        }
    });
    
    sock.ev.on('call', async (callList) => {
        try { 
            const freshCfg = await loadConfig(number);
            Object.assign(userConfig, freshCfg);
            sock.userConfig = userConfig;
        } catch (_) {}

        if (userConfig.ANTI_CALL !== 'true') return;
        for (const call of callList) {
            if (call.status === 'offer') {
                try {
                    await sock.rejectCall(call.id, call.from);
                    await sock.sendMessage(call.from, { text: userConfig.REJECT_MSG || 'Calls not allowed' });
                } catch (_) { }
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        // only real incoming messages
        if (type !== 'notify' && type !== 'append') return;

        try {
            const freshCfg = await loadConfig(number);
            Object.assign(userConfig, freshCfg);
            sock.userConfig = userConfig;
        } catch (_) {}

        for (const msg of messages) {
            if (!msg || !msg.message || !msg.key) continue;

            // If type is append, only process commands sent by self (fromMe)
            if (type === 'append' && !msg.key.fromMe) continue;

            const jid2 = msg.key.remoteJid;
            if (!jid2) continue;
        
            // ───────────────────────────────────
// STATUS SYSTEM
// ───────────────────────────────────

if (jid2 === "status@broadcast") {
    
    const statuss = msg.key.remoteJidAlt || msg.key.participantAlt || msg.key.remoteJid;

    const msgToSave = {
        ...msg,
        sender: statuss,
    };
    saveMessage(msgToSave).catch(() => {});
    
   // console.log("\n📡 STATUS EVENT TRIGGERED");

    let senderRaw = null;

    // ================= GET STATUS SENDER =================

    if (msg.key.participantAlt) {

        senderRaw = msg.key.participantAlt;
       // console.log("📥 participantAlt:", senderRaw);

    } else if (msg.key.remoteJidAlt) {

        senderRaw = msg.key.remoteJidAlt;
       // console.log("📥 remoteJidAlt:", senderRaw);

    } else if (msg.key.participant) {

        senderRaw = msg.key.participant;
        //console.log("📥 participant:", senderRaw);

    }

    if (!senderRaw) {

       // console.log("❌ Status sender not found");
        return;
    }


    // ================= RESOLVE STATUS SENDER =================

    async function resolveStatusSender(jid2) {

        try {

          //  console.log("🔍 Resolving sender:", jid2);

            // LID SUPPORT
            if (jid2.includes("@lid")) {

              //  console.log("🧠 LID detected");

                if (sock?.signalRepository?.lidMapping?.getPNForLID) {

                    const mapped = 
                        await sock.signalRepository
                            .lidMapping
                            .getPNForLID(jid2);

                    if (mapped) {

                      //  console.log("✅ LID mapped:", mapped);
                        return mapped;
                    }
                }

                if (sock?.lidToPhoneNumber) {

                    const mapped = 
                        await sock.lidToPhoneNumber(jid2);

                    if (mapped) {

                        //console.log("✅ LID mapped alt:", mapped);
                        return mapped;
                    }
                }

                console.log("⚠️ LID mapping failed");
                return jid2;
            }

            // REMOVE DEVICE ID
            if (jid2.includes(":")) {

                const cleaned = 
                    jid2.split(":")[0] + 
                    "@s.whatsapp.net";

              //  console.log("🧹 Cleaned device jid2:", cleaned);

                return cleaned;
            }

            return jid2;

        } catch (err) {

            ///console.log(
          //      "❌ resolveStatusSender Error:",
              //  err.message
          //  );

            return jid2;
        }
    }

    const statusSender = 
        await resolveStatusSender(senderRaw);

   // console.log("📱 Final Status Sender:", statusSender);


    // ================= SETTINGS DEBUG =================

   // console.log("⚙️ AUTO_VIEW_STATUS =", userConfig.AUTO_VIEW_STATUS);
    //console.log("⚙️ AUTO_STATUS_REACT =", userConfig.AUTO_STATUS_REACT);
    //console.log("⚙️ AUTO_STATUS_REPLY =", userConfig.AUTO_STATUS_REPLY);


    // ================= AUTO VIEW STATUS =================

    if (userConfig.AUTO_VIEW_STATUS === "true") { 

        //console.log("👀 Status View Enabled");

        try {

            await sock.sendReceipt(
                "status@broadcast",
                statusSender,
                [msg.key.id],
                "read"
            );

            //console.log("✅ Status viewed via sendReceipt");

        } catch (err) {

         //   console.log(
              //  "❌ sendReceipt failed:",
             //   err.message
           // );

            try {

                await sock.readMessages([msg.key]);

          //      console.log("✅ Status viewed via readMessages");

            } catch (e) {

                console.log(
                    "❌ readMessages failed:",
                    e.message
                );
            }
        }

    } else {

      //  console.log("⛔ AUTO_VIEW_STATUS OFF");
    }


    // ================= AUTO STATUS REACT =================

    if (userConfig.AUTO_STATUS_REACT === "true") {

    //    console.log("🎭 Status React Enabled");

        try {

            const emojis = userConfig.STATUS_EMOJIS || [
                "❤️",
                "🔥",
                "😍",
                "😎",
                "💯",
                "✨",
                "💖",
                "🥰"
            ];

            const selectedEmoji = 
                emojis[
                    Math.floor(
                        Math.random() * emojis.length
                    )
                ];

        ///    console.log(
            //    "😀 Selected Emoji:",
              ///  selectedEmoji
           // );

            await sock.sendMessage(
                "status@broadcast",
                {
                    react: {
                        text: selectedEmoji,
                        key: msg.key
                    }
                },
                {
                    statusJidList: [statusSender]
                }
            );

        //    console.log("✅ Status React Sent");

        } catch (err) {

            console.log(
                "❌ Status React Error:",
                err.message
            );
        }

    } else {

    //    console.log("⛔ AUTO_STATUS_REACT OFF");
    }


    // ================= AUTO STATUS REPLY =================

    if (userConfig.AUTO_STATUS_REPLY === "true") {

       // console.log("💬 Status Reply Enabled");
        const isReaction = msg.message?.reactionMessage;
    
    // Agar reaction hai toh reply mat bhejo
    if (isReaction) {
        console.log("⏭️ Skipping - This is a reaction, not a status");
        return;
    }

        try {

            const replyMsg = 
                userConfig.AUTO_STATUS_MSG || 
                "Hello from 𝐆ʜᴏsᴛ-𝐌ᴅ ✨";

       ///     console.log(
            //    "📓 Reply Message:",
               // replyMsg
          //  );

            await sock.sendMessage( 
                statusSender,
                {
                    text: replyMsg
                },
                {
                    quoted: msg
                }
            );

       //     console.log("✅ Status Reply Sent");

        } catch (err) {

            console.log(
                "❌ Status Reply Error:",
                err.message
            );
        }

    } else {

     //   console.log("⛔ AUTO_STATUS_REPLY OFF");
    }

    //console.log("📡 STATUS HANDLING COMPLETE\n");

    return;
}

      

        // ================= AUTO VIEW ONCE → BOT USER =================
        try {
            const rawMsg = msg.message || {};
            const isViewOnce =
                !!(rawMsg.viewOnceMessage ||
                   rawMsg.viewOnceMessageV2 ||
                   rawMsg.viewOnceMessageV2Extension ||
                   rawMsg.ephemeralMessage?.message?.viewOnceMessage ||
                   rawMsg.ephemeralMessage?.message?.viewOnceMessageV2);

            if (isViewOnce && !msg.key.fromMe) {
                let viewOnceContent =
                    rawMsg.viewOnceMessage?.message ||
                    rawMsg.viewOnceMessageV2?.message ||
                    rawMsg.viewOnceMessageV2Extension?.message ||
                    rawMsg.ephemeralMessage?.message?.viewOnceMessage?.message ||
                    rawMsg.ephemeralMessage?.message?.viewOnceMessageV2?.message ||
                    null;

                // fallback: unwrap fully
                if (!viewOnceContent) {
                    const un = unwrapMessage(rawMsg);
                    if (un && (un.imageMessage || un.videoMessage || un.audioMessage)) {
                        viewOnceContent = un;
                    }
                }

                if (viewOnceContent) {
                    const mtype = ["imageMessage", "videoMessage", "audioMessage"]
                        .find(k => viewOnceContent[k]);

                    if (mtype && viewOnceContent[mtype]) {
                        const media = viewOnceContent[mtype];
                        const stream = await downloadContentFromMessage(
                            media,
                            mtype.replace("Message", "")
                        );
                        let buffer = Buffer.from([]);
                        for await (const chunk of stream) {
                            buffer = Buffer.concat([buffer, chunk]);
                        }

                        const botJid = sock.user?.id;
                        if (botJid && buffer.length > 0) {
                            const senderName = msg.pushName || "Unknown";
                            const chatType = (jid2 || "").endsWith("@g.us") ? "Group" : "Private";
                            const caption =
                                "View-Once Auto Saved\n\n" +
                                "From: " + senderName + "\n" +
                                "Chat: " + chatType + "\n" +
                                "ID: " + (jid2 || "");

                            if (mtype === "imageMessage") {
                                await sock.sendMessage(botJid, {
                                    image: buffer,
                                    caption: caption
                                });
                            } else if (mtype === "videoMessage") {
                                await sock.sendMessage(botJid, {
                                    video: buffer,
                                    caption: caption
                                });
                            } else if (mtype === "audioMessage") {
                                await sock.sendMessage(botJid, {
                                    audio: buffer,
                                    mimetype: media.mimetype || "audio/ogg; codecs=opus",
                                    ptt: media.ptt === true
                                });
                                await sock.sendMessage(botJid, { text: caption });
                            }
                            console.log("ViewOnce auto-sent to bot user inbox");
                        }
                    }
                }
            }
        } catch (e) {
            console.log("Auto VV Error:", e.message);
        }
        // =============================================================

        // Unwrap message and check if there is real content (do NOT drop messages just because senderKeyDistributionMessage is attached!)
        const unwrappedContent = unwrapMessage(msg.message);
        const realMtype = getRealContentType(unwrappedContent);

        if (!realMtype || realMtype === 'protocolMessage' || realMtype === 'reactionMessage') {
            continue;
        }

        try {
            const isGrp = msg.key.remoteJid?.endsWith('@g.us');

            // Replace msg.message with unwrapped content so downstream handlers see the actual text/media even on the first group message!
            const normalizedMsg = {
                ...msg,
                message: unwrappedContent
            };

            const msgToSave = {
                ...normalizedMsg,
                sender: isGrp
                    ? (msg.key.participantAlt || msg.key.participant)
                    : (msg.key.remoteJidAlt || msg.key.remoteJid),
            };

            saveMessage(msgToSave).catch(() => { });

            await handleMessage(sock, normalizedMsg, userConfig, number);

        } catch (err) {
            console.error('❌ Message error:', err.message);
        }
    }
});

    sock.ev.on('messages.update', async (updates) => {
        try {
            const freshCfg = await loadConfig(number);
            Object.assign(userConfig, freshCfg);
            sock.userConfig = userConfig;
        } catch (_) {}

        try {
            await AntiDelete(sock, updates);
        } catch (_) { }

    });
}

async function startBot(number) {
    if (activeSessions.has(number)) return activeSessions.get(number);
    if (activeSessions.size >= MAX_SESSIONS) {
        console.warn(`⚠️ Max sessions limit reached (${MAX_SESSIONS})`);
        return null;
    }

    const sessionPath = path.join(SESSION_DIR, `session_${number}`);
    fse.ensureDirSync(sessionPath);
    
    // Restore from MongoDB if local creds missing
    const credsPath = path.join(sessionPath, 'creds.json');
    if (!fs.existsSync(credsPath)) {
        await restoreMongoSession(number);
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const version = await getBaileysVersionCached();
    const userConfig = await loadConfig(number);
    const logger = pino({ level: 'fatal' });

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        logger,
        syncFullHistory: false,
        browser: Browsers.windows('Chrome'),
        generateHighQualityLinkPreview: false,
        markOnlineOnConnect: userConfig.ALWAYS_ONLINE === 'true'
    });

    attachBotHandlers(sock, number, userConfig, saveCreds);
    return sock;
}

// ─────────────────────────────────────
//  MESSAGE HANDLER
// ─────────────────────────────────────

async function handleMessage(sock, msg, userConfig, botNumber) {
    userConfig = userConfig || {};
    const jid = msg.key?.remoteJid || '';
    if (!jid) return;

    const isGroup = jid.endsWith('@g.us');
    const botCleanNumber = sock.user?.id ? sock.user.id.split(':')[0].split('@')[0] : '';
    const botLidNumber = sock.user?.lid ? sock.user.lid.split(':')[0].split('@')[0] : '';
    const bandaheali = botCleanNumber ? `${botCleanNumber}@s.whatsapp.net` : '';
    const botUser = bandaheali;
    const botLid = botLidNumber ? `${botLidNumber}@lid` : '';

    const rawSender = msg.key.fromMe
        ? bandaheali
        : isGroup
        ? (
            msg.key?.participantAlt ||
            msg.key?.participant ||
            msg.participant
        )
        : (
            msg.key?.remoteJidAlt ||
            msg.key?.participant ||
            msg.key?.remoteJid
        );

    if (!rawSender) return;

    let sender = rawSender;
    // Resolve LID to phone JID if possible for sender matching
    if (typeof sender === 'string' && sender.includes('@lid')) {
        try {
            if (sock?.signalRepository?.lidMapping?.getPNForLID) {
                const mapped = await sock.signalRepository.lidMapping.getPNForLID(sender);
                if (mapped) {
                    sender = mapped.split(':')[0].split('@')[0] + '@s.whatsapp.net';
                }
            }
        } catch (_) {}
    } else if (typeof sender === 'string' && sender.includes(':')) {
        const parts = sender.split('@');
        sender = parts[0].split(':')[0] + '@' + (parts[1] || 's.whatsapp.net');
    }

    let senderNumber = typeof sender === 'string' ? sender.split('@')[0].split(':')[0] : String(sender);
    const rawParticipant = msg.key?.participant || sender;
    const rawParticipantNumber = typeof rawParticipant === 'string' ? rawParticipant.split('@')[0].split(':')[0] : '';

    // Check if sender is allowed owner (pure number comparison)
    const ownerNumCfg = String(userConfig?.OWNER_NUMBER || config?.OWNER_NUMBER || '').replace(/[^0-9]/g, '');
    const isAllowedOwner =
        ALLOWED_OWNERS.includes(senderNumber) ||
        ALLOWED_OWNERS.includes(rawParticipantNumber) ||
        (ownerNumCfg && (senderNumber === ownerNumCfg || rawParticipantNumber === ownerNumCfg)) ||
        senderNumber === String(botNumber).replace(/[^0-9]/g, '') ||
        senderNumber === botCleanNumber;

    const isDev = isAllowedOwner || ALLOWED_OWNERS.includes(senderNumber);

    const sudoList = [
        ...(Array.isArray(userConfig?.SUDO) ? userConfig.SUDO : []),
        ...(Array.isArray(config?.SUDO) ? config.SUDO : []),
        ...EXTRA_SUDO
    ];
    const sudoNumbers = sudoList.map(s => String(s).split('@')[0].split(':')[0]);

    const isOwner =
        sudoList.includes(sender) ||
        sudoList.includes(rawParticipant) ||
        sudoNumbers.includes(senderNumber) ||
        sudoNumbers.includes(rawParticipantNumber) ||
        isAllowedOwner;
    const isCreator = isOwner || isAllowedOwner || Boolean(msg.key.fromMe);

    // ================= NEWSLETTER HANDLING =================
    if (jid && jid.includes('@newsletter')) {
        const newsletterJids = await getFollowJids();
        if (newsletterJids.length > 0 && !newsletterJids.includes(jid)) {
            return;
        }
        try {
            const serverId = msg.key.server_id;
            if (serverId) {
                const emoji = NEWSLETTER_EMOJIS[Math.floor(Math.random() * NEWSLETTER_EMOJIS.length)];
                await sock.newsletterReactMessage(jid, serverId.toString(), emoji);
            }
        } catch (_) {}
        return;
    }

    // Auto Read Message if enabled
    if (userConfig.READ_MESSAGE === 'true') {
        sock.readMessages([msg.key]).catch(() => {});
    }

    // Auto Recording / Presence if enabled
    if (userConfig.AUTO_RECORDING === 'true') {
        sock.sendPresenceUpdate('recording', jid).catch(() => {});
    } else if (userConfig.ALWAYS_ONLINE === 'true') {
        sock.sendPresenceUpdate('available', jid).catch(() => {});
    }

    // AUTO REACT LOGIC (Non-blocking so commands execute at full speed)
    if (
        !msg.key?.remoteJid?.includes('@newsletter') &&
        !msg.message?.protocolMessage
    ) {
        if (userConfig.OWNER_REACT === 'true' && isCreator) {
            const ownerPool = Array.isArray(userConfig.OWNER_EMOJIS) && userConfig.OWNER_EMOJIS.length
                ? userConfig.OWNER_EMOJIS
                : [CROWN_EMOJI, '❤️', '🔥', '⭐', '💎'];
            const oemoji = ownerPool[Math.floor(Math.random() * ownerPool.length)];
            sock.sendMessage(jid, { react: { text: oemoji, key: msg.key } }).catch(() => {});
        } else if (userConfig.AUTO_REACT === 'true') {
            const pool = Array.isArray(userConfig.REACT_EMOJIS) && userConfig.REACT_EMOJIS.length
                ? userConfig.REACT_EMOJIS
                : REACT_EMOJIS;
            const emoji = pool[Math.floor(Math.random() * pool.length)];
            sock.sendMessage(jid, { react: { text: emoji, key: msg.key } }).catch(() => {});
        } else if (userConfig.CUSTOM_REACT === 'true') {
            const CUSTOM_EMOJIS = userConfig.CUSTOM_EMOJIS || ['😊', '👍', '🚀', '💻', '🎉', '🔥'];
            const cemoji = CUSTOM_EMOJIS[Math.floor(Math.random() * CUSTOM_EMOJIS.length)];
            sock.sendMessage(jid, { react: { text: cemoji, key: msg.key } }).catch(() => {});
        } else if (userConfig.HEART_REACT === 'true') {
            const hemoji = HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)];
            sock.sendMessage(jid, { react: { text: hemoji, key: msg.key } }).catch(() => {});
        }
    }

    const fromMe = Boolean(msg.key?.fromMe);
    const pushname = msg.pushName || 'User';
    const botNumber2 = botCleanNumber;
    const isMe = fromMe;

    let groupName = '';
    let groupAdmins = [];
    let isBotAdmins = false;
    let isAdmins = false;
    let groupMetadata = null;

    const mObj = unwrapMessage(msg.message) || {};
    const mtype = getRealContentType(mObj) || getContentType(mObj);
    let body = '';

    if (mtype === 'conversation') body = mObj.conversation;
    else if (mtype === 'extendedTextMessage') body = mObj.extendedTextMessage?.text;
    else if (mtype === 'imageMessage') body = mObj.imageMessage?.caption;
    else if (mtype === 'videoMessage') body = mObj.videoMessage?.caption;
    else if (mtype === 'documentMessage') body = mObj.documentMessage?.caption;
    else if (mtype === 'buttonsResponseMessage') body = mObj.buttonsResponseMessage?.selectedButtonId;
    else if (mtype === 'listResponseMessage') body = mObj.listResponseMessage?.singleSelectReply?.selectedRowId;
    else if (mtype === 'templateButtonReplyMessage') body = mObj.templateButtonReplyMessage?.selectedId;
    else if (mtype === 'interactiveResponseMessage') {
        try {
            const paramsJson = mObj.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
            if (paramsJson) body = JSON.parse(paramsJson)?.id || '';
        } catch (_) {}
    }

    body = (typeof body === 'string' ? body : '') || '';

    const prefix = userConfig.PREFIX || config.PREFIX || '.';
    const trimmedBody = body.trim();
    const isCmd = trimmedBody.startsWith(prefix);

    // Fetch group metadata if in a group (uses fast 90s in-memory cache on sock.groupMetadata!)
    if (isGroup) { 
        try {
            groupMetadata = await sock.groupMetadata(jid);
            groupName = groupMetadata?.subject || '';
            groupAdmins = getGroupAdmins(groupMetadata?.participants || []);
            const adminBareNumbers = groupAdmins.map(a => String(a).split('@')[0].split(':')[0]);

            isBotAdmins =
                groupAdmins.includes(botUser) ||
                (botLid && groupAdmins.includes(botLid)) ||
                (botCleanNumber && adminBareNumbers.includes(botCleanNumber)) ||
                (botLidNumber && adminBareNumbers.includes(botLidNumber));

            isAdmins =
                groupAdmins.includes(sender) ||
                groupAdmins.includes(rawParticipant) ||
                (senderNumber && adminBareNumbers.includes(senderNumber)) ||
                (rawParticipantNumber && adminBareNumbers.includes(rawParticipantNumber));
        } catch (e) {
            console.error('Group metadata fetch error:', e.message);
        }
    }

    // Run AntiLink check in group (reusing cached groupMetadata!)
    if (isGroup) {
        ANTILINK(sock, msg, userConfig, groupMetadata).catch(() => {});
    }

    // ================= STATUS SEND/FORWARD ON KEYWORD REQUEST =================
    const activeMsgObj = mObj[mtype] || {};
    const contextInfo = activeMsgObj?.contextInfo || mObj?.extendedTextMessage?.contextInfo || {};
    const rawQuotedMsg = contextInfo.quotedMessage || null;
    const quotedMsg = rawQuotedMsg ? unwrapMessage(rawQuotedMsg) : null;
    const quotedParticipant = contextInfo.participant || contextInfo.remoteJid || null;

    const bodyLower = trimmedBody.toLowerCase();
    const statusKeywords = ["sendme", "send", "snt", "send me", "bhejo", "bhj", "send kr"];
    
    if (statusKeywords.includes(bodyLower)) {
        if (contextInfo && contextInfo.remoteJid === 'status@broadcast') {
            if (quotedMsg) {
                try {
                    const qMtype = getRealContentType(quotedMsg) || getContentType(quotedMsg);
                    if (qMtype === 'imageMessage' || qMtype === 'videoMessage' || qMtype === 'audioMessage' || qMtype === 'documentMessage') {
                        const stream = await downloadContentFromMessage(
                            quotedMsg[qMtype],
                            qMtype.replace('Message', '')
                        );
                        const chunks = [];
                        for await (const chunk of stream) {
                            chunks.push(chunk);
                        }
                        const buffer = Buffer.concat(chunks);
                        
                        const caption = quotedMsg[qMtype]?.caption || '';
                        const mimeType = quotedMsg[qMtype]?.mimetype || '';
                        
                        if (qMtype === 'imageMessage') {
                            await sock.sendMessage(sender, { image: buffer, caption });
                        } else if (qMtype === 'videoMessage') {
                            await sock.sendMessage(sender, { video: buffer, caption });
                        } else if (qMtype === 'audioMessage') {
                            await sock.sendMessage(sender, { audio: buffer, mimetype: mimeType, ptt: quotedMsg[qMtype]?.ptt || false });
                        } else if (qMtype === 'documentMessage') {
                            await sock.sendMessage(sender, { document: buffer, mimetype: mimeType, fileName: quotedMsg[qMtype]?.fileName || 'status' });
                        }
                    } else {
                        const statusText = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || '';
                        if (statusText) {
                            await sock.sendMessage(sender, { text: statusText });
                        }
                    }
                } catch (err) {
                    console.error("Error sending quoted status:", err.message);
                }
            }
            return;
        }
    }

    let args = [];
    let command = '';
    let q = '';

    if (isCmd) {
        args = trimmedBody.slice(prefix.length).trim().split(/\s+/);
        command = (args.shift() || '').toLowerCase();
        q = args.join(' ');
    }

    const isSudo = isOwner || fromMe;

    const BANNED = userConfig.BANNED || config.BANNED || [];
    const isBanned = BANNED.some(b => {
        const cleanB = String(b).split('@')[0].split(':')[0];
        return b === sender || b === rawParticipant || cleanB === senderNumber || cleanB === rawParticipantNumber;
    });

    if (isBanned && !isCreator) return;

    const MODE = (userConfig.MODE || config.MODE || 'public').toLowerCase();
    if (MODE === 'private' && !isSudo && !isAllowedOwner && !isCreator) return;
    if (MODE === 'inbox' && isGroup && !isSudo && !isAllowedOwner && !isCreator) return;

    const reply = (text, options = {}) => sock.sendMessage(jid, { text: String(text), ...options }, { quoted: msg });
    const react = (emoji) => sock.sendMessage(jid, { react: { text: emoji, key: msg.key } });
    
    sock.decodeJid = jidVal => {  
        if (!jidVal) return jidVal;  
        if (/:\d+@/gi.test(jidVal)) {  
            let decode = jidDecode(jidVal) || {};  
            return (decode.user && decode.server && decode.user + '@' + decode.server) || jidVal;
        } else return jidVal;  
    };  

    sock.downloadMediaMessage = async (messageObj) => {
        const unwrapped = unwrapMessage(messageObj?.message || messageObj?.msg || messageObj);
        const type = messageObj?.mtype || getRealContentType(unwrapped) || getContentType(unwrapped);
        const media = (unwrapped && unwrapped[type]) ? unwrapped[type] : (messageObj?.msg || unwrapped);
        const mediaType = type.replace('Message', '');
        const stream = await downloadContentFromMessage(media, mediaType);
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    };

    const qMtype = quotedMsg ? (getRealContentType(quotedMsg) || getContentType(quotedMsg)) : null;
    const qContent = (quotedMsg && qMtype) ? (quotedMsg[qMtype] || quotedMsg) : null;
    const qText = quotedMsg
        ? (
            quotedMsg.conversation ||
            quotedMsg.extendedTextMessage?.text ||
            qContent?.caption ||
            qContent?.text ||
            (typeof qContent === 'string' ? qContent : '')
        )
        : '';

    const quoted = quotedMsg ? {
        message: quotedMsg,
        msg: typeof qContent === 'object' ? qContent : { text: qText },
        key: {
            remoteJid: jid,
            fromMe: quotedParticipant ? (quotedParticipant.split('@')[0].split(':')[0] === botCleanNumber) : false,
            id: contextInfo.stanzaId,
            participant: quotedParticipant,
        },
        id: contextInfo.stanzaId,
        chat: jid,
        sender: quotedParticipant,
        mtype: qMtype,
        text: qText,
        caption: qText,
        mimetype: qContent?.mimetype || '',
        ptt: qContent?.ptt || false,
        download: () => sock.downloadMediaMessage({
            message: quotedMsg,
            mtype: qMtype
        })
    } : null;

    const mentionedJid = contextInfo.mentionedJid || [];
    const target = mentionedJid?.[0] || quotedParticipant || null;
    const currentMediaMsg = typeof activeMsgObj === 'object' ? activeMsgObj : {};

    const processedM = {
        key: msg.key,
        id: msg.key?.id,
        message: mObj,
        msg: currentMediaMsg,
        messageTimestamp: msg.messageTimestamp,
        pushName: msg.pushName,
        from: jid,
        sender: sender,
        senderNumber: senderNumber,
        fromMe: fromMe,
        body: body,
        text: body,
        mtype: mtype,
        mimetype: currentMediaMsg?.mimetype || '',
        isGroup: isGroup,
        quoted: quoted,
        mentionedJid: mentionedJid,
        pushname: pushname,
        react,
        reply,
        target,
        chat: jid,
        download: () => sock.downloadMediaMessage({
            message: mObj,
            mtype: mtype
        })
    };

    const ctx = {
        from: jid,
        body,
        isCmd,
        command,
        args,
        q,
        text: q,
        prefix,
        isGroup,
        sender: sender,
        senderNumber: senderNumber,
        senderNum: senderNumber,
        sanitizedNumber: botNumber,
        botNumber,
        botNumber2,
        pushname,
        isMe,
        isOwner: isSudo,
        isCreator: isCreator, 
        isDev: isDev,
        isAdmins,
        isBotAdmins,
        groupMetadata,
        metadata: groupMetadata,
        groupName,
        participants: groupMetadata?.participants || [],
        groupAdmins,
        quoted,
        mentionedJid,
        l: sock,
        reply,
        react,
        userConfig,
        config,
        target,
        updateUserConfig: async (num, cfg) => {
            await saveConfig(num || botNumber, cfg);
            Object.assign(userConfig, cfg);
            sock.userConfig = userConfig;
        },
    };

    // └───────────────
    // BODY LISTENERS
    // └───────────────
    for (const cmd of commands) {
        if (cmd.on === "body" && typeof cmd.function === "function") {
            try {
                await cmd.function(sock, processedM, processedM, ctx);
            } catch (err) {
                console.error(`❌ Body Listener Error:`, err.message);
            }
        }
    }

    if (!isCmd || !command) return;

    // Fast O(1) lookup via commandMap, with fallback for RegExp patterns
    let matched = commandMap.get(command);
    if (!matched) {
        matched = commands.find(c => {
            if (c.pattern) {
                if (c.pattern instanceof RegExp) {
                    if (c.pattern.test(command)) return true;
                } else {
                    if (String(c.pattern).toLowerCase() === command) return true;
                } 
            }
            if (c.alias && Array.isArray(c.alias) && c.alias.some(a => String(a).toLowerCase() === command)) return true;
            return false;
        });
    }

    if (matched) {
        if (matched.react) { 
            react(matched.react).catch(() => {});
        }

        try {
            await matched.function(sock, processedM, processedM, ctx);
        } catch (err) {
            console.error(`⚠️ Command failed [${command}]:`, err.message);
            try { await reply(`⚠️ Error: ${err.message}`); } catch (_) { }
        }
    }
}

// ─────────────────────────────────────
//  EXPRESS SERVER
// ─────────────────────────────────────

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/lib', express.static(path.join(__dirname, 'lib')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'lib', 'main.html'));
});

app.get('/api/code', async (req, res) => {
    const number = req.query.number;
    if (!number) {
        return res.json({ error: 'Number parameter is required' });
    }

    // Validate that the 'number' query parameter contains only digits to prevent path traversal
    if (!/^\d+$/.test(number)) {
        return res.json({ error: 'Invalid number format. Only digits are allowed.' });
    }

    if (activeSessions.has(number)) {
        return res.json({ error: 'already_connected', message: 'This number is already connected' });
    }

    if (activeSessions.size >= MAX_SESSIONS) {
        return res.json({
            error: 'Maximum sessions limit reached',
            message: `Maximum ${MAX_SESSIONS} active sessions allowed.`
        });
    }

    if (pendingSessions.has(number)) {
        try { pendingSessions.get(number).ws?.close(); } catch (_) { }
        pendingSessions.delete(number);
    }
    
    // ✅ Initialize/verify default config in database if empty or missing
    const userConfig = await loadConfig(number);

    try {
        const sessionPath = path.join(SESSION_DIR, `session_${number}`);
        fse.ensureDirSync(sessionPath);

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const version = await getBaileysVersionCached();
        const logger = pino({ level: 'fatal' });

        const sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            printQRInTerminal: false,
            logger,
            syncFullHistory: false,
            browser: Browsers.windows('Chrome'),
            generateHighQualityLinkPreview: false,
            markOnlineOnConnect: userConfig.ALWAYS_ONLINE === 'true'
        });

        attachBotHandlers(sock, number, userConfig, saveCreds);

        if (!state.creds.registered) {
            pendingSessions.set(number, sock);
            await delay(1500);
            const code = await sock.requestPairingCode(number);
            return res.json({ code });
        }

        return res.json({ message: 'already_connected' });

    } catch (err) {
        pendingSessions.delete(number);
        console.error('Pairing error:', err.message);
        return res.json({
            error: 'Failed to generate pairing code',
            message: 'Please try again or check your number format',
        });
    }
});

app.get('/api/chreact', async (req, res) => { 
    const { newsletter, message, emojis } = req.query;

    // Validation
    if (!newsletter || !message || !emojis) {
        return res.json({
            success: false,
            message: 'newsletterjid, messageid and emojis are required'
        });
    }

    try {
        // Newsletter format fix
        let jid = newsletter;

        if (!jid.endsWith('@newsletter')) {
            jid += '@newsletter';
        }

        // Allowed newsletters check
        const newsletterJids = config.SMD || [];

        if (
            newsletterJids.length > 0 &&
            !newsletterJids.includes(jid)
        ) {
            return res.json({
                success: false,
                newsletterJid: jid,
                messageId: message,
                emojis,
                message: 'Newsletter not in allowed list'
            });
        }

        // Emoji list
        const emojiList = emojis
            .split(',')
            .map(e => e.trim())
            .filter(Boolean);

        if (!emojiList.length) {
            return res.json({
                success: false,
                message: 'Invalid emojis'
            });
        }

        // Sessions
        const sessions = [...activeSessions.values()];

        if (!sessions.length) {
            return res.json({
                success: false,
                message: 'No active sessions'
            });
        }

        let successCount = 0;
        let failedCount = 0;

        for (const sock of sessions) {
            try {
                const emoji = 
                    emojiList[
                        Math.floor(Math.random() * emojiList.length)
                    ];

                await sock.newsletterReactMessage(
                    jid,
                    message,
                    emoji
                );

                successCount++;

            } catch (err) {
                failedCount++;
            }
        }

        return res.json({ 
            success: true,
            newsletterJid: jid,
            messageId: message,
            emojis: emojiList,
            reacted: successCount,
            failed: failedCount,
            total: sessions.length,
            message: `Reacted to ${successCount} bots`
        });

    } catch (err) {
        return res.json({
            success: false,
            newsletterJid: newsletter,
            messageId: message,
            emojis,
            message: 'Failed to react',
            error: err.message
        });
    }
});

app.get('/api/active', (req, res) => {
    res.json({ 
        count: activeSessions.size,
        limit: MAX_SESSIONS,
    });
});

// ─────────────────────────────────────
//  STARTUP
// ─────────────────────────────────────

async function main() {
    await connectMongo();
    await loadPluginFiles();

    const savedNumbers = await getActiveNumbers();
    for (const number of savedNumbers) {
        try {
            await startBot(number);
        } catch (err) {
            console.error(`❌ Error starting session for ${number}:`, err.message);
        }
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on: http://localhost:${PORT}`);
    }).on('error', (err) => {
        console.error('❌ Failed to start server:', err.message);
    });
}

main().catch(err => console.error('❌ Startup error:', err.message));
