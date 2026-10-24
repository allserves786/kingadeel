const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const Crypto = require('crypto');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const webp = require('node-webpmux');

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Image or Video buffer to WebP sticker with metadata
 */
async function imageToWebp(imageBuffer) {
  const inputPath = path.join(tmpdir(), Crypto.randomBytes(6).readUIntLE(0, 6).toString(36) + '.jpg');
  const outputPath = path.join(tmpdir(), Crypto.randomBytes(6).readUIntLE(0, 6).toString(36) + '.webp');

  fs.writeFileSync(inputPath, imageBuffer);

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .on('error', reject)
      .on('end', () => resolve(true))
      .addOutputOptions([
        '-vcodec', 'libwebp',
        '-vf', "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0,split [a][b];[a] palettegen=reserve_transparent=on:transparency_color=ffffff [p];[b][p] paletteuse"
      ])
      .toFormat('webp')
      .save(outputPath);
  });

  const buffer = fs.readFileSync(outputPath);
  try { fs.unlinkSync(inputPath); } catch (_) {}
  try { fs.unlinkSync(outputPath); } catch (_) {}
  return buffer;
}

async function addExif(webpBuffer, packname = '𝐆ʜᴏsᴛ-𝐌ᴅ', author = '𝐆ʜᴏsᴛ-𝐌ᴅ') {
  const img = new webp.Image();
  await img.load(webpBuffer);

  const json = {
    'sticker-pack-id': 'com.ghost.tech',
    'sticker-pack-name': packname,
    'sticker-pack-publisher': author,
    'emojis': ['❤️', '💀']
  };

  let exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
  let jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
  let exif = Buffer.concat([exifAttr, jsonBuff]);
  exif.writeUIntLE(jsonBuff.length, 14, 4);

  img.exif = exif;
  return await img.save(null);
}

class Sticker {
  constructor(buffer, options = {}) {
    this.buffer = buffer;
    this.pack = options.pack || '𝐆ʜᴏsᴛ-𝐌ᴅ';
    this.author = options.author || '𝐆ʜᴏsᴛ-𝐌ᴅ';
  }

  async toBuffer() {
    let webpBuf = await imageToWebp(this.buffer);
    try {
      return await addExif(webpBuf, this.pack, this.author);
    } catch (_) {
      return webpBuf;
    }
  }

  async build() {
    return await this.toBuffer();
  }
}

const StickerTypes = {
  DEFAULT: 'default',
  CROPPED: 'crop',
  FULL: 'full',
  CIRCLE: 'circle',
  ROUNDED: 'rounded'
};

async function createSticker(buffer, options = {}) {
  const sticker = new Sticker(buffer, options);
  return await sticker.toBuffer();
}

module.exports = {
  Sticker,
  createSticker,
  StickerTypes,
  imageToWebp,
  addExif
};
