// plugins/unban.js — Ghost-MD Unban Appeal Helper
const { cmd } = require('../command');

function cleanNumber(n) {
  return String(n || '').replace(/[^0-9]/g, '');
}

function makeAppeals(num) {
  return [
`Subject: Wrongful Ban Appeal – ${num}

Hello WhatsApp Support,

My number +${num} was banned by mistake. I follow WhatsApp Terms of Service and did not use any unauthorized apps.

Please review my account and restore access.

Thank you.`,

`Subject: Account Ban Review Request – ${num}

Dear WhatsApp Team,

I believe my number +${num} was banned incorrectly. I only use WhatsApp for personal communication.

Kindly check and unban my number as soon as possible.

Regards.`,

`Subject: Request to Unban Number +${num}

Hi Support,

My WhatsApp number +${num} is banned without a valid reason. I did not spam or violate any rules.

Please restore my account.

Thank you.`,

`Subject: Appeal for Wrong Ban – +${num}

Assalam o Alaikum / Hello,

Mera number +${num} ghalati se ban ho gaya hai. Main WhatsApp rules follow karta/kartii hoon.

Please mera account wapas open kar dein.

Shukriya.`,

`Subject: Urgent Unban Request – ${num}

Hello WhatsApp,

Number: +${num}
Issue: Account banned by mistake

I request a full review of my account. I do not use modified / unofficial WhatsApp apps.

Please unban my number.

Thanks.`,

`Subject: Account Recovery – +${num}

Dear Team,

I am unable to access WhatsApp on +${num}. This ban seems automatic / wrong.

Please investigate and reactivate my number.

Best regards.`,

`Subject: Final Appeal – Unban +${num}

Hello WhatsApp Support,

This is a formal appeal for number +${num}.
I respect community guidelines and need this account for important communication.

Please lift the ban after review.

Thank you for your time.`
  ];
}

cmd({
  pattern: 'unban',
  alias: ['unbanrequest', 'appeal', 'banappeal'],
  react: '🔓',
  desc: 'Generate WhatsApp unban appeal messages',
  category: 'main',
  use: '.unban <number>',
  filename: __filename
}, async (conn, mek, m, { from, args, q, reply, sender }) => {
  try {
    const num = cleanNumber(args[0] || q);
    if (!num || num.length < 10 || num.length > 15) {
      return reply(
`🔓 *UNBAN APPEAL*

*Usage:*
.unban 923001234567

*Example:*
.unban 923001234567

Note: Bot sirf appeal messages deta hai.
Asal unban WhatsApp Support karta hai.`
      );
    }

    await reply(`🔓 *Preparing appeals for +${num}...*`);

    const appeals = makeAppeals(num);

    // Guide message
    await conn.sendMessage(from, {
      text:
`╭───〔 𝐆ʜᴏsᴛ-𝐌ᴅ 〕───╮
│ 🔓 *UNBAN GUIDE*
│
│ 📞 Number: *+${num}*
│
│ *Kaise use karein:*
│ 1) Neeche 7 appeal messages aayenge
│ 2) Koi 1 copy karo
│ 3) Open karo:
│ https://www.whatsapp.com/contact
│ 4) "Ban appeal" select karo
│ 5) Message paste karke send karo
│
│ ⚠️ Bot number khud unban nahi karta
│ ✅ Sirf strong appeal text deta hai
╰────────────────╯`
    }, { quoted: mek });

    // 7 separate appeal messages
    for (let i = 0; i < appeals.length; i++) {
      await conn.sendMessage(from, {
        text:
`📩 *Appeal ${i + 1}/7*\n` +
`📞 +${num}\n\n` +
`\`\`\`\n${appeals[i]}\n\`\`\`\n\n` +
`_Copy karke WhatsApp Support pe bhejo_`
      }, { quoted: mek });
    }

    await conn.sendMessage(from, {
      text:
`✅ *Done*\n\n` +
`Support link:\nhttps://www.whatsapp.com/contact\n\n` +
`Tip: Har 12–24 hours baad naya appeal bhej sakte ho.\n` +
`> Ghost-MD | Mafia Adeel`
    }, { quoted: mek });

  } catch (e) {
    console.error('UNBAN ERROR:', e);
    reply('❌ *Error:* ' + e.message);
  }
});
