// Ghost-MD
// plugins/vv.js

const { cmd } = require('../command');

cmd({
  pattern: "vv",
  alias: ["viewonce", "retrive", "vo"],
  react: "🐳",
  desc: "Retrieve view once message",
  category: "owner",
  filename: __filename
}, async (client, message, match, { from, isCreator, reply }) => {
  try {
    if (!isCreator) {
      return reply("*This is an owner command.*");
    }

    if (!match.quoted) {
      return reply("*Please reply to a view once message!*");
    }

    const buffer = await match.quoted.download();
    const mtype = match.quoted.mtype;

    let messageContent = {};

    switch (mtype) {
      case "imageMessage":
        messageContent = {
          image: buffer,
          caption: match.quoted.text || match.quoted.caption || "",
          mimetype: match.quoted.mimetype || "image/jpeg"
        };
        break;

      case "videoMessage":
        messageContent = {
          video: buffer,
          caption: match.quoted.text || match.quoted.caption || "",
          mimetype: match.quoted.mimetype || "video/mp4"
        };
        break;

      case "audioMessage":
        messageContent = {
          audio: buffer,
          mimetype: match.quoted.mimetype || "audio/ogg; codecs=opus",
          ptt: match.quoted.ptt === true
        };
        break;

      default:
        return reply("Only image, video and audio view-once supported");
    }

    await client.sendMessage(from, messageContent, { quoted: message });

  } catch (error) {
    console.error("vv Error:", error);
    reply("Error:\n" + error.message);
  }
});
