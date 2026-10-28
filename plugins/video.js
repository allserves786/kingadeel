const { cmd } = require('../command')
const axios = require('axios')
const yts = require('yt-search')
const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
const fs = require('fs')
const path = require('path')

// ============ FFMPEG PATH ============
ffmpeg.setFfmpegPath(ffmpegPath)

// ============ TEMP DIRECTORY ============
const tempDir = path.join(__dirname, '../temp')
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

// ============ APIs (MULTIPLE FALLBACKS) ============
const APIS = {
    arslan: async (url) => {
        try {
            const res = await axios.get('https://arslan-apis-v2.vercel.app/download/ytmp4', {
                params: { url },
                timeout: 60000
            })
            if (res.data?.status === true && res.data?.result?.download?.url) {
                return {
                    success: true,
                    downloadUrl: res.data.result.download.url,
                    title: res.data.result.metadata?.title,
                    quality: res.data.result.metadata?.quality || '720p'
                }
            }
            return { success: false }
        } catch (e) {
            return { success: false }
        }
    },
    davidcyril: async (url) => {
        try {
            const res = await axios.get('https://apis.davidcyriltech.my.id/download/ytmp4', {
                params: { url },
                timeout: 60000
            })
            if (res.data?.success && res.data?.result?.download_url) {
                return {
                    success: true,
                    downloadUrl: res.data.result.download_url,
                    title: res.data.result.title,
                    quality: res.data.result.quality || '480p'
                }
            }
            return { success: false }
        } catch (e) {
            return { success: false }
        }
    }
}

async function getDownload(videoUrl) {
    for (const [name, apiFn] of Object.entries(APIS)) {
        try {
            console.log(`[VIDEO] Trying ${name}...`)
            const result = await apiFn(videoUrl)
            if (result.success && result.downloadUrl) {
                console.log(`[VIDEO] ${name} success`)
                return result
            }
        } catch (e) {}
    }
    return null
}

// ============ VIDEO INFO (link ya search) ============
async function getVideoInfo(q) {
    let info = { url: null, thumbnail: null, title: null, duration: null, views: null, ago: null, channel: null }

    if (q.includes('youtu')) {
        info.url = q.trim()
        const vidId = info.url.match(/(?:youtu\.be\/|v=|shorts\/)([a-zA-Z0-9_-]{11})/)?.[1]
        if (vidId) {
            try {
                const v = await yts({ videoId: vidId })
                if (v) {
                    info.thumbnail = v.thumbnail
                    info.title = v.title
                    info.duration = v.timestamp
                    info.views = v.views
                    info.ago = v.ago
                    info.channel = v.author?.name
                }
            } catch (e) {}
        }
    } else {
        const search = await yts(q)
        if (!search.videos?.length) return null
        const v = search.videos[0]
        info.url = v.url
        info.thumbnail = v.thumbnail
        info.title = v.title
        info.duration = v.timestamp
        info.views = v.views
        info.ago = v.ago
        info.channel = v.author?.name
    }
    return info
}

// ============ TIME PARSER (trim ke liye) ============
// "00:00:10" -> 10, "01:02" -> 62, "30" -> 30. Ghalat format par NaN.
function timeToSeconds(t) {
    const parts = String(t).trim().split(':').map(Number)
    if (parts.some(isNaN)) return NaN
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    if (parts.length === 1) return parts[0]
    return NaN
}

// ============ FFMPEG TRIM ============
function trimVideo(inputPath, outputPath, start, duration) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .setStartTime(start)
            .setDuration(duration)
            .output(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', reject)
            .run()
    })
}

// ============================================
// 🎥 VIDEO COMMAND
// ============================================
cmd({
    pattern: "video",
    alias: ["yt", "ytmp4"],
    desc: "Download YouTube video (MP4) with trim support",
    category: "download",
    react: "🎥",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    const stamp = Date.now()
    const tempInput = path.join(tempDir, `input_${stamp}.mp4`)
    const tempOutput = path.join(tempDir, `output_${stamp}.mp4`)

    try {
        if (!q) return reply(
`❌ *Please provide a video name or YouTube link*
Example:
.video alan walker faded
.video https://youtu.be/xxx
.video https://youtu.be/xxx trim 00:00:10 00:00:30`)

        // ============ TRIM CHECK ============
        // doosra time END hai: duration = end - start
        let query = q.trim()
        let trimStart = null
        let trimEnd = null
        let trimDuration = null

        const words = query.split(/\s+/)
        const trimIndex = words.indexOf('trim')
        if (trimIndex !== -1) {
            if (words.length <= trimIndex + 2) {
                return reply(
`❌ *Trim ke liye start aur end time dono do*
Example: .video <link> trim 00:00:10 00:00:30`)
            }
            trimStart = words[trimIndex + 1]
            trimEnd = words[trimIndex + 2]
            const startSec = timeToSeconds(trimStart)
            const endSec = timeToSeconds(trimEnd)
            if (isNaN(startSec) || isNaN(endSec) || endSec <= startSec) {
                return reply(
`❌ *Trim time ghalat hai*
Sahi tareeqa: .video <link> trim 00:00:10 00:00:30
(End time, start time se bara hona chahiye)`)
            }
            trimDuration = endSec - startSec
            query = words.slice(0, trimIndex).join(' ')
        }

        await reply("⏳ *ꜱᴇᴀʀᴄʜɪɴɢ, ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...*")

        const info = await getVideoInfo(query)
        if (!info) return reply("❌ *No results found*")

        await reply("⬇️ *ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ, ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...*")

        const result = await getDownload(info.url)
        if (!result) return reply("❌ *Failed to fetch video*")

        const finalTitle = result.title || info.title || 'Video'

        const infoCaption =
`*╭┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*
*┇•* 🎥 *𝐆ʜᴏsᴛ - xᴅ ᴠɪᴅᴇᴏ ᴅʟ*
*┇•* ℹ️ *ᴛɪᴛʟᴇ: ${finalTitle}*
*┇•* ⌛ *ᴅᴜʀᴀᴛɪᴏɴ: ${info.duration || 'N/A'}*
*┇•* 👁️ *ᴠɪᴇᴡs: ${info.views?.toLocaleString() || 'N/A'}*
*┇•* 📆 *ᴜᴘʟᴏᴀᴅᴇᴅ: ${info.ago || 'N/A'}*
*┇•* 📡 *ᴄʜᴀɴɴᴇʟ: ${info.channel || 'N/A'}*
*┇•* 🎞️ *ǫᴜᴀʟɪᴛʏ: ${result.quality || '720p'}*${trimStart ? `\n*┇•* ✂️ *ᴛʀɪᴍ: ${trimStart} ᴛᴏ ${trimEnd}*` : ''}
*╰┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*`

        // Thumbnail + info pehle
        if (info.thumbnail) {
            await conn.sendMessage(from, {
                image: { url: info.thumbnail },
                caption: infoCaption
            }, { quoted: mek })
        }

        const poweredCaption =
`
*╭┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*
*┇•* *_ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴛᴇᴀᴍ ᴢᴇᴇ_*
*╰┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*`

        if (trimStart && trimDuration) {
            await reply("✂️ *ᴛʀɪᴍᴍɪɴɢ ᴠɪᴅᴇᴏ, ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...*")

            // Download full video to temp
            const writer = fs.createWriteStream(tempInput)
            const response = await axios({ url: result.downloadUrl, method: 'GET', responseType: 'stream' })
            response.data.pipe(writer)
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve)
                writer.on('error', reject)
            })

            await trimVideo(tempInput, tempOutput, trimStart, trimDuration)

            await conn.sendMessage(from, {
                video: { url: tempOutput },
                mimetype: 'video/mp4',
                caption: poweredCaption
            }, { quoted: mek })
        } else {
            await conn.sendMessage(from, {
                video: { url: result.downloadUrl },
                mimetype: 'video/mp4',
                caption: poweredCaption
            }, { quoted: mek })
        }

    } catch (err) {
        console.error(err)
        reply("❌ *An error occurred while downloading video*")
    } finally {
        // Cleanup temp files
        for (const f of [tempInput, tempOutput]) {
            try { if (fs.existsSync(f)) fs.unlinkSync(f) } catch (e) {}
        }
    }
})

// ============================================
// 📄 VIDEO AS DOCUMENT
// ============================================
cmd({
    pattern: "videodoc",
    alias: ["vdoc", "docvideo"],
    desc: "Download YouTube video as document file",
    category: "download",
    react: "📄",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        if (!q) return reply(
`❌ *Please provide a video name or YouTube link*
Example:
.vdoc imagine dragons believer
.vdoc https://youtu.be/xxx`)

        await reply("⏳ *ꜱᴇᴀʀᴄʜɪɴɢ, ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...*")

        const info = await getVideoInfo(q.trim())
        if (!info) return reply("❌ *No results found*")

        await reply("⬇️ *ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ, ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...*")

        const result = await getDownload(info.url)
        if (!result) return reply("❌ *Failed to fetch video*")

        const finalTitle = result.title || info.title || 'video'
        const safeFileName = finalTitle.replace(/[^\w\s-]/g, '').trim().substring(0, 50) || 'video'

        const { data: videoBuffer } = await axios.get(result.downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 120000
        })

        const caption =
`*╭┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*
*┇•* 📄 *𝐆ʜᴏsᴛ - xᴅ ᴠɪᴅᴇᴏ ᴅᴏᴄ*
*┇•* ℹ️ *ᴛɪᴛʟᴇ: ${finalTitle}*
*┇•* 🎞️ *ǫᴜᴀʟɪᴛʏ: ${result.quality || '720p'}*
*╰┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*

*╭┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*
*┇•* *_ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴛᴇᴀᴍ ᴢᴇᴇ_*
*╰┉┉┉┉┉┉┉┉┉┉┉┉┉┉━┈᛭*`

        await conn.sendMessage(from, {
            document: Buffer.from(videoBuffer),
            mimetype: 'video/mp4',
            fileName: `${safeFileName}.mp4`,
            caption
        }, { quoted: mek })

    } catch (err) {
        console.error(err)
        reply("❌ *An error occurred while downloading video*")
    }
})
