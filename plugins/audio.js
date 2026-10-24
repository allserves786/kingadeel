// plugins/audio.js — Ghost-MD
const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

ffmpeg.setFfmpegPath(ffmpegPath);

const newsletter = {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363404811118873@newsletter',
        newsletterName: "𝐆ʜᴏsᴛ-𝐌ᴅ",
        serverMessageId: 143
    }
};

async function applyAudioEffect(conn, mek, from, filter, effectName) {
    try {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted?.audioMessage && !quoted?.ptt) {
            return conn.sendMessage(from, {
                text: `🎵 *${effectName}*\n\nAudio ya Voice Note pe reply karke command use karo.`,
                contextInfo: newsletter
            }, { quoted: mek });
        }

        await conn.sendMessage(from, {
            text: `⏳ *${effectName}* lagaya ja raha hai...`,
            contextInfo: newsletter
        }, { quoted: mek });

        // Download audio
        const stream = await downloadContentFromMessage(
            quoted.audioMessage || quoted.ptt,
            'audio'
        );

        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const inputPath = path.join(__dirname, `../temp_${Date.now()}.mp3`);
        const outputPath = path.join(__dirname, `../temp_out_${Date.now()}.mp3`);

        fs.writeFileSync(inputPath, buffer);

        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .audioFilters(filter)
                .on('end', resolve)
                .on('error', reject)
                .save(outputPath);
        });

        await conn.sendMessage(from, {
            audio: fs.readFileSync(outputPath),
            mimetype: 'audio/mpeg',
            ptt: false,
            contextInfo: newsletter
        }, { quoted: mek });

        // Cleanup
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);

    } catch (e) {
        console.error(`${effectName} error:`, e);
        conn.sendMessage(from, {
            text: `❌ ${effectName} fail ho gaya.`,
            contextInfo: newsletter
        }, { quoted: mek });
    }
}

// ====================== COMMANDS ======================

cmd({
    pattern: "bass",
    desc: "Bass boost",
    category: "audio",
    react: "🔊",
    filename: __filename
}, async (conn, mek, m, { from }) => {
    await applyAudioEffect(conn, mek, from, "bass=g=15", "BASS");
});

cmd({
    pattern: "blown",
    desc: "Blown effect",
    category: "audio",
    react: "💥",
    filename: __filename
}, async (conn, mek, m, { from }) => {
    await applyAudioEffect(conn, mek, from, "acrusher=level_in=1:level_out=1:bits=8:mode=log", "BLOWN");
});

cmd({
    pattern: "chipmunk",
    alias: ["tupai"],
    desc: "Chipmunk voice",
    category: "audio",
    react: "🐿️",
    filename: __filename
}, async (conn, mek, m, { from }) => {
    await applyAudioEffect(conn, mek, from, "asetrate=44100*1.5,atempo=0.8", "CHIPMUNK");
});

cmd({
    pattern: "deep",
    desc: "Deep voice",
    category: "audio",
    react: "🗣️",
    filename: __filename
}, async (conn, mek, m, { from }) => {
    await applyAudioEffect(conn, mek, from, "asetrate=44100*0.8", "DEEP");
});

cmd({
    pattern: "demon",
    desc: "Demon voice",
    category: "audio",
    react: "😈",
    filename: __filename
}, async (conn, mek, m, { from }) => {
    await applyAudioEffect(conn, mek, from, "asetrate=44100*0.6,atempo=1.1", "DEMON");
});

cmd({
    pattern: "earrape",
    desc: "Earrape",
    category: "audio",
    react: "📢",
    filename: __filename
}, async (conn, mek, m, { from }) => {
    await applyAudioEffect(conn, mek, from, "volume=12", "EARRAPE");
});

cmd({
    pattern: "fast",
    desc: "Fast audio",
    category: "audio",
    react: "⚡",
    filename: __filename
}, async (conn, mek, m, { from }) => {
    await applyAudioEffect(conn, mek, from, "atempo=1.6", "FAST");
});

cmd({
    pattern: "fat",
    desc: "Fat voice",
    category: "audio",
    react: "🐻",
    filename: __filename
}, async (conn, mek, m, { from }) => {
    await applyAudioEffect(conn, mek, from, "asetrate=44100*0.7,atempo=1.2", "FAT");
});

cmd({
    pattern: "nightcore",
    desc: "Nightcore",
    category: "audio",
    react: "🌙",
    filename: __filename
}, async (conn, mek, m, { from }) => {
    await applyAudioEffect(conn, mek, from, "asetrate=44100*1.25,atempo=1.05", "NIGHTCORE");
});

cmd({
    pattern: "reverse",
    desc: "Reverse audio",
    category: "audio",
    react: "⏪",
    filename: __filename
}, async (conn, mek, m, { from }) => {
    await applyAudioEffect(conn, mek, from, "areverse", "REVERSE");
});

cmd({
    pattern: "robot",
    desc: "Robot voice",
    category: "audio",
    react: "🤖",
    filename: __filename
}, async (conn, mek, m, { from }) => {
    await applyAudioEffect(conn, mek, from, "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)'", "ROBOT");
});

cmd({
    pattern: "slow",
    desc: "Slow audio",
    category: "audio",
    react: "🐢",
    filename: __filename
}, async (conn, mek, m, { from }) => {
    await applyAudioEffect(conn, mek, from, "atempo=0.7", "SLOW");
});

cmd({
    pattern: "smooth",
    desc: "Smooth audio",
    category: "audio",
    react: "✨",
    filename: __filename
}, async (conn, mek, m, { from }) => {
    await applyAudioEffect(conn, mek, from, "lowpass=f=3000", "SMOOTH");
});

cmd({
    pattern: "baby",
    desc: "Baby voice",
    category: "audio",
    react: "👶",
    filename: __filename
}, async (conn, mek, m, { from }) => {
    await applyAudioEffect(conn, mek, from, "asetrate=44100*1.4,atempo=0.85", "BABY");
});
