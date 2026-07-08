const fs = require("fs");
const path = require("path");

// ===== تحميل .env بشكل يدوي يتحمل مشاكل الترميز على ويندوز =====
// (مثلاً لما حد يحفظ .env من "Notepad" العادي، أحياناً بيحفظه UTF-16
//  وهاد بيخلي dotenv العادي يفشل بقراءة المتغيرات بصمت)
function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) {
    console.error(`❌ ما لقيت ملف .env بهاد المسار:\n   ${envPath}`);
    console.error(
      "   تأكد إنه اسم الملف بالضبط \".env\" (مش \".env.txt\") وإنه بنفس مجلد المشروع."
    );
    process.exit(1);
  }

  const buffer = fs.readFileSync(envPath);
  let text;

  // UTF-16 LE BOM
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    text = buffer.toString("utf16le");
  } else if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    // UTF-8 BOM
    text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  } else {
    text = buffer.toString("utf8");
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    // شيل علامات الاقتباس لو موجودة
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const { Client, GatewayIntentBits } = require("discord.js");
const { emojis } = require("./src/database/db");

const ASSETS_DIR = path.join(__dirname, "assets", "emojis");

if (!process.env.TOKEN || !process.env.GUILD_ID) {
  console.error("❌ لازم تحط TOKEN و GUILD_ID بملف .env عشان يعرف البوت يرفع الإيموجيز بأي سيرفر.");
  console.error(
    `   TOKEN موجود؟ ${process.env.TOKEN ? "✅" : "❌ لأ"} | GUILD_ID موجود؟ ${
      process.env.GUILD_ID ? "✅" : "❌ لأ"
    }`
  );
  console.error(
    "   إذا حاطط القيم فعلاً وبرضه بيطلع هاد الخطأ:\n" +
      "   1) تأكد إنه الملف اسمه بالضبط \".env\" مش \".env.txt\" (فعّل إظهار امتدادات الملفات بويندوز).\n" +
      "   2) لا تحط مسافات أو علامات اقتباس زيادة، الشكل الصحيح: TOKEN=رمز_البوت_هون\n" +
      "   3) تأكد إنه ملف .env بنفس مجلد المشروع (جنب upload-emojis.js)."
  );
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const files = fs.readdirSync(ASSETS_DIR).filter((f) => f.endsWith(".png"));

    if (files.length === 0) {
      console.log("⚠️ ما في صور بمجلد assets/emojis.");
      return client.destroy();
    }

    console.log(`⏳ جاري رفع ${files.length} إيموجي على سيرفر "${guild.name}"...`);

    for (const file of files) {
      const name = path.basename(file, ".png"); // مثال: tv_lock

      // إذا موجود إيموجي بنفس الاسم أصلاً بالسيرفر، تجاوزه
      const existing = guild.emojis.cache.find((e) => e.name === name);
      if (existing) {
        emojis.set(name, `<:${existing.name}:${existing.id}>`);
        console.log(`↷ موجود مسبقاً: ${name}`);
        continue;
      }

      const created = await guild.emojis.create({
        attachment: path.join(ASSETS_DIR, file),
        name,
      });

      emojis.set(name, `<:${created.name}:${created.id}>`);
      console.log(`✔ تم رفع: ${name}`);

      // تهدئة بسيطة عشان ما نضرب الـ rate limit
      await new Promise((r) => setTimeout(r, 800));
    }

    console.log("✅ خلصت! الإيموجيز محفوظة بـ data/emojis.json وبتنستخدم تلقائياً بالبانل.");
  } catch (err) {
    console.error("❌ فشل رفع الإيموجيز:", err.message);
  } finally {
    client.destroy();
  }
});

client.login(process.env.TOKEN);
