const { Events } = require("discord.js");
const { guilds } = require("../database/db");
const { createTempRoom, deleteIfEmpty, getRoom } = require("../utils/rooms");

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const guild = newState.guild || oldState.guild;
    const guildConfig = guilds.get(guild.id);
    if (!guildConfig) return;

    // === انضم لروم الإنشاء => أنشئله غرفة خاصة ===
    if (
      newState.channelId &&
      newState.channelId === guildConfig.creatorChannelId
    ) {
      try {
        await createTempRoom(guild, newState.member, guildConfig);
      } catch (err) {
        console.error("[TempVoice] فشل إنشاء الغرفة:", err.message);
      }
    }

    // === غادر روم مؤقتة => امنحها مهلة دقيقة، وبعدين احذفها لو ضلت فاضية ===
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
      const oldChannel = oldState.channel;
      if (oldChannel && getRoom(oldChannel.id)) {
        // مهلة دقيقة كاملة: لو رجع صاحبها (أو أي حد) خلال هالوقت ما بتنحذف
        setTimeout(() => {
          deleteIfEmpty(oldChannel).catch(() => {});
        }, 60_000);
      }
    }
  },
};
