const { Events, ActivityType } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`✅ البوت اشتغل باسم ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: "🎙️ الغرف الصوتية المؤقتة", type: ActivityType.Watching }],
      status: "online",
    });
  },
};
