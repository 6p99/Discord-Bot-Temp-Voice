const fs = require("fs");
const path = require("path");

// قاعدة بيانات بسيطة تعتمد على ملفات JSON
// ما بتحتاج أي مكتبة native، تشتغل عادي على Termux / أندرويد / ويندوز

const DATA_DIR = path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

class JSONStore {
  constructor(fileName, defaultValue = {}) {
    this.filePath = path.join(DATA_DIR, fileName);
    this.data = defaultValue;
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf8");
        this.data = raw.trim() ? JSON.parse(raw) : this.data;
      } else {
        this._save();
      }
    } catch (err) {
      console.error(`[DB] فشل تحميل ${this.filePath}:`, err.message);
    }
  }

  _save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
    } catch (err) {
      console.error(`[DB] فشل حفظ ${this.filePath}:`, err.message);
    }
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    this.data[key] = value;
    this._save();
    return value;
  }

  delete(key) {
    delete this.data[key];
    this._save();
  }

  has(key) {
    return Object.prototype.hasOwnProperty.call(this.data, key);
  }

  all() {
    return this.data;
  }
}

// guilds.json => إعدادات كل سيرفر (Creator Channel, الكاتيجوري, البانل)
const guilds = new JSONStore("guilds.json", {});

// rooms.json => الغرف الصوتية المؤقتة الحالية
const rooms = new JSONStore("rooms.json", {});

// emojis.json => آيدي الإيموجيز المخصصة يلي رفعها البوت (name => "<:name:id>")
const emojis = new JSONStore("emojis.json", {});

// userSettings.json => آخر إعدادات استخدمها كل عضو (الحد، القفل) عشان نطبقها تلقائياً بالمرة الجاية
const userSettings = new JSONStore("userSettings.json", {});

module.exports = { guilds, rooms, emojis, userSettings };
