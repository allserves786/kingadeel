// lib/functions.js
const axios = require('axios');

const getBuffer = async (url, options) => {
    try {
        options = options || {};
        const res = await axios({
            method: 'get',
            url,
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Request': 1,
            },
            timeout: 25000,
            ...options,
            responseType: 'arraybuffer',
        });
        return Buffer.from(res.data);
    } catch (e) {
        console.error('[ ❌ ] getBuffer error:', e.message);
        return null;
    }
};

const getGroupAdmins = (participants) => {
    const admins = [];
    if (!Array.isArray(participants)) return admins;
    for (const i of participants) {
        if (i && (i.admin === 'admin' || i.admin === 'superadmin')) {
            if (i.id) admins.push(i.id);
            if (i.jid && !admins.includes(i.jid)) admins.push(i.jid);
            if (i.lid && !admins.includes(i.lid)) admins.push(i.lid);
            if (i.phoneNumber) {
                const pnJid = i.phoneNumber.includes('@') ? i.phoneNumber : `${i.phoneNumber}@s.whatsapp.net`;
                if (!admins.includes(pnJid)) admins.push(pnJid);
                if (!admins.includes(i.phoneNumber)) admins.push(i.phoneNumber);
            }
        }
    }
    return admins;
};

const getRandom = (ext) => {
    if (Array.isArray(ext)) {
        return ext[Math.floor(Math.random() * ext.length)];
    }
    return `${Math.floor(Math.random() * 10000)}${ext || ''}`;
};

const h2k = (eco) => {
    const lyrik = ['', 'K', 'M', 'B', 'T', 'P', 'E'];
    const ma = Math.log10(Math.abs(eco)) / 3 | 0;
    if (ma === 0) return eco;
    const ppo = lyrik[ma];
    const scale = Math.pow(10, ma * 3);
    const scaled = eco / scale;
    let formatt = scaled.toFixed(1);
    if (/\.0$/.test(formatt)) {
        formatt = formatt.substr(0, formatt.length - 2);
    }
    return formatt + ppo;
};

const isUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    return url.match(
        new RegExp(
            /https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&/=]*)/,
            'gi'
        )
    );
};

const Json = (string) => {
    return JSON.stringify(string, null, 2);
};

const runtime = (seconds) => {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const dDisplay = d > 0 ? d + (d === 1 ? ' day, ' : ' days, ') : '';
    const hDisplay = h > 0 ? h + (h === 1 ? ' hour, ' : ' hours, ') : '';
    const mDisplay = m > 0 ? m + (m === 1 ? ' minute, ' : ' minutes, ') : '';
    const sDisplay = s > 0 ? s + (s === 1 ? ' second' : ' seconds') : '';
    return dDisplay + hDisplay + mDisplay + sDisplay;
};

const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

const delay = sleep;

const fetchJson = async (url, options) => {
    try {
        options = options || {};
        const res = await axios({
            method: 'GET',
            url: url,
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            ...options,
        });
        return res.data;
    } catch (err) {
        console.error('[ ❌ ] fetchJson error:', err.message);
        return null;
    }
};

// ===== LID TO PHONE FUNCTIONS =====

/**
 * Convert Lid (Local ID) to Phone Number
 * @param {Object} conn - The WhatsApp connection object
 * @param {string} lid - The LID to convert
 * @returns {Promise<string>} - The phone number or original LID part
 */
async function lidToPhone(conn, lid) {
    try {
        if (!lid || typeof lid !== 'string') return '';
        
        // Check if it's actually a LID (contains @lid)
        if (lid.includes('@lid')) {
            if (conn?.signalRepository?.lidMapping?.getPNForLID) {
                const pn = await conn.signalRepository.lidMapping.getPNForLID(lid);
                if (pn) {
                    return cleanPN(pn);
                }
            }
            if (conn?.lidToPhoneNumber) {
                const pn = await conn.lidToPhoneNumber(lid);
                if (pn) {
                    return cleanPN(pn);
                }
            }
        }
        return cleanPN(lid.split("@")[0]);
    } catch (e) {
        return lid ? cleanPN(lid.split("@")[0]) : '';
    }
}

/**
 * Clean phone number by removing : suffix
 * @param {string} pn - The phone number to clean
 * @returns {string} - Cleaned phone number
 */
function cleanPN(pn) {
    if (!pn || typeof pn !== 'string') return '';
    return pn.split("@")[0].split(":")[0];
}

module.exports = { 
    getBuffer, 
    getGroupAdmins, 
    getRandom, 
    h2k, 
    isUrl, 
    Json, 
    runtime, 
    sleep, 
    delay,
    fetchJson,
    lidToPhone,
    cleanPN
};
