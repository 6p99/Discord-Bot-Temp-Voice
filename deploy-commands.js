require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const commands = [];
const commandsPath = path.join(__dirname, "src", "commands");
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"))) {
  const command = require(path.join(commandsPath, file));
  if (command?.data) commands.push(command.data.toJSON());
}

const rest = new REST().setToken(process.env.TOKEN);

(async () => {
  try {
    console.log(`⏳ جاري تسجيل ${commands.length} أمر...`);

    const route = process.env.GUILD_ID
      ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
      : Routes.applicationCommands(process.env.CLIENT_ID);

    await rest.put(route, { body: commands });

    console.log(
      process.env.GUILD_ID
        ? "✅ تم تسجيل الأوامر على السيرفر المحدد (تظهر فوراً)."
        : "✅ تم تسجيل الأوامر عالمياً (ممكن تاخد لحد ساعة عشان تظهر)."
    );
  } catch (err) {
    console.error("❌ فشل تسجيل الأوامر:", err);
  }
})();
