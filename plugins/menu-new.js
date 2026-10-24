const path = require('path');
const fs = require('fs');
const axios = require('axios');
const config = require('../config');
const { cmd, commands } = require('../command');
const { runtime } = require('../lib/functions');

// ─── GHOST MD SMALL CAPS ───
const toSmallCaps = (text) => {
    if (!text || typeof text !== 'string') return '';

    const map = {
        a:'ᴀ', b:'ʙ', c:'ᴄ', d:'ᴅ', e:'ᴇ', f:'ғ',
        g:'ɢ', h:'ʜ', i:'ɪ', j:'ᴊ', k:'ᴋ', l:'ʟ',
        m:'ᴍ', n:'ɴ', o:'ᴏ', p:'ᴘ', q:'ǫ', r:'ʀ',
        s:'s', t:'ᴛ', u:'ᴜ', v:'ᴠ', w:'ᴡ', x:'x',
        y:'ʏ', z:'ᴢ'
    };

    return text
        .split('')
        .map(char => map[char.toLowerCase()] || char)
        .join('');
};

// ─── VIP BOX CATEGORY DESIGN ───
const formatCategory = (category, cmds) => {
    const validCmds = cmds.filter(item =>
        item.pattern &&
        typeof item.pattern === 'string' &&
        item.pattern.trim() !== ''
    );

    if (!validCmds.length) return '';

    const title = `╭━━〔 ⭐ ${toSmallCaps(category)} 〕━━╮`;

    const body = validCmds.map(item =>
        `┃ ▣ ⤷ ${toSmallCaps(item.pattern.trim())}`
    ).join('\n');

    const footer = '╰━━━━━━━━━━━━━━➤';

    return `\n${title}\n${body}\n${footer}\n`;
};

// ─── IMAGE VALIDATION ───
const validateAndFetchImage = async (url) => {
    if (!url || typeof url !== 'string') {
        return { valid: false };
    }

    try {
        if (!/^https?:\/\/.+/i.test(url.trim())) {
            return { valid: false };
        }

        const response = await axios.get(url.trim(), {
            timeout: 10000,
            maxRedirects: 5,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'image/*,*/*'
            },
            validateStatus: status =>
                status >= 200 && status < 400
        });

        const contentType = response.headers['content-type'] || '';

        if (!contentType.toLowerCase().startsWith('image/')) {
            return { valid: false };
        }

        return {
            valid: true,
            buffer: Buffer.from(response.data)
        };
    } catch (error) {
        console.log('Menu image validation failed:', error.message);
        return { valid: false };
    }
};

// ─── FALLBACK IMAGE ───
const FALLBACK_IMAGE_URL =
    'https://i.ibb.co/pBQN2T8t/GHOST-MD.jpg';

// ─── MENU COMMAND ───
cmd({
    pattern: 'menu',
    alias: ['m', 'help', 'allmenu', 'fullmenu'],
    use: '.menu',
    desc: 'Show all bot commands',
    category: 'main',
    react: '⚡',
    filename: __filename
},
async (
    conn, mek, m,
    { from, pushname, reply, userConfig }
) => {
    try {
        await conn.sendPresenceUpdate('composing', from);

        // Automatically read registered commands
        const allCommands = Object.values(commands);
        const totalCommands = allCommands.length;

        const categorized = {};

        for (const item of allCommands) {
            const category = item.category;

            if (
                !category ||
                typeof category !== 'string' ||
                !category.trim() ||
                category === 'undefined' ||
                !item.pattern ||
                typeof item.pattern !== 'string' ||
                !item.pattern.trim()
            ) {
                continue;
            }

            if (!categorized[category]) {
                categorized[category] = [];
            }

            categorized[category].push(item);
        }

        // Sort categories alphabetically
        const sortedCategories = Object.keys(categorized).sort(
            (a, b) => a.localeCompare(b)
        );

        let menuSections = '';

        for (const category of sortedCategories) {
            menuSections += formatCategory(
                category,
                categorized[category]
            );
        }

        // ─── CONFIG VALUES ───
        const BOT_NAME =
            userConfig?.BOT_NAME ||
            config.BOT_NAME ||
            '𝐆𝐇𝐎𝐒𝐓 𝐌𝐃';

        const OWNER_NAME =
            userConfig?.OWNER_NAME ||
            config.OWNER_NAME ||
            'MAFIA ADEEL';

        const PREFIX =
            userConfig?.PREFIX ||
            config.PREFIX ||
            '.';

        const MODE =
            userConfig?.MODE ||
            config.MODE ||
            'private';

        const VERSION =
            userConfig?.VERSION ||
            config.VERSION ||
            '1.0.0';

        const DESCRIPTION =
            userConfig?.DESCRIPTION ||
            config.DESCRIPTION ||
            '';

        const BOT_IMAGE =
            userConfig?.BOT_IMAGE ||
            userConfig?.BOT_MEDIA_URL ||
            config.BOT_IMAGE ||
            config.BOT_MEDIA_URL;

        // ─── VIP MAIN MENU BOX ───
        const dec = `╭━━〔 💀 ${BOT_NAME} 〕━━╮
┃ 👑 𝐎𝐖𝐍𝐄𝐑 : ${OWNER_NAME}
┃ ⚡ 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 : ${totalCommands}
┃ ⏱️ 𝐑𝐔𝐍𝐓𝐈𝐌𝐄 : ${runtime(process.uptime())}
┃ 📌 𝐏𝐑𝐄𝐅𝐈𝐗 : ${PREFIX}
┃ ⚙️ 𝐌𝐎𝐃𝐄 : ${MODE}
┃ 🏷️ 𝐕𝐄𝐑𝐒𝐈𝐎𝐍 : ${VERSION}
╰━━━━━━━━━━━━━━➤
${menuSections}
╭━━〔 ⚡ 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 〕━━╮
┃ 👑 𝐌𝐀𝐅𝐈𝐀 𝐀𝐃𝐄𝐄𝐋 💀🚩
╰━━━━━━━━━━━━━━➤
${DESCRIPTION}`;

        // ─── IMAGE SOURCE ───
        let imageToSend;

        let imageValidation =
            await validateAndFetchImage(BOT_IMAGE);

        if (!imageValidation.valid) {
            imageValidation =
                await validateAndFetchImage(FALLBACK_IMAGE_URL);
        }

        if (imageValidation.valid) {
            imageToSend = imageValidation.buffer;
        }

        const contextInfo = {
            mentionedJid: m.sender ? [m.sender] : []
        };

        // Send image if available, otherwise send text
        if (imageToSend) {
            await conn.sendMessage(from, {
                image: imageToSend,
                caption: dec,
                contextInfo
            }, { quoted: mek });
        } else {
            await conn.sendMessage(from, {
                text: dec,
                contextInfo
            }, { quoted: mek });
        }

        // ─── OPTIONAL MENU AUDIO ───
        const audioPath = path.join(
            __dirname,
            '../assets/menu.mp3'
        );

        if (fs.existsSync(audioPath)) {
            const audioBuffer = fs.readFileSync(audioPath);

            await conn.sendMessage(from, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                ptt: true,
                fileName: 'Menu.mp3'
            }, { quoted: mek });
        }

    } catch (error) {
        console.error('GHOST-MD menu error:', error);
        reply(`Menu Error: ${error.message || error}`);
    }
});
