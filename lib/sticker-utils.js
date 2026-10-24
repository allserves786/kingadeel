const axios = require('axios');
const { fetchGif } = require('./fetchGif');
const { videoToWebp } = require('./video-utils');

async function fetchImage(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

async function gifToSticker(gifBuffer) {
  return await videoToWebp(gifBuffer);
}

module.exports = {
  fetchGif,
  fetchImage,
  gifToSticker,
  videoToWebp
};
