const { ChannelType, PermissionsBitField } = require("discord.js");
const { rooms, guilds, userSettings } = require("../database/db");

/**
 * يرجع بيانات الغرفة المؤقتة إذا كانت الروم يلي الشخص فيها غرفة مؤقتة
 */
function getRoom(channelId) {
  return rooms.get(channelId);
}

/**
 * يتحقق أن العضو داخل صوت + الروم يلي هو فيها غرفة مؤقتة + رجّع الداتا
 */
function getActiveRoomFromMember(member) {
  const channel = member.voice?.channel;
  if (!channel) return { channel: null, room: null };
  const room = getRoom(channel.id);
  return { channel, room };
}

function isOwner(room, userId) {
  return !!room && room.ownerId === userId;
}

/**
 * ينشئ غرفة صوتية مؤقتة جديدة تحت الكاتيجوري المحدد بإعدادات السيرفر
 */
async function createTempRoom(guild, member, guildConfig) {
  const count = Object.values(rooms.all()).filter(
    (r) => r.guildId === guild.id
  ).length;

  const saved = userSettings.get(member.id) || {};
  const everyoneId = guild.roles.everyone.id;

  const overwrites = [
    {
      id: member.id,
      allow: [
        PermissionsBitField.Flags.Connect,
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.MoveMembers,
      ],
    },
  ];

  if (saved.locked) {
    overwrites.push({
      id: everyoneId,
      deny: [PermissionsBitField.Flags.Connect],
    });
  }

  const channel = await guild.channels.create({
    name: `🔊 غرفة ${member.user.username}`.slice(0, 100),
    type: ChannelType.GuildVoice,
    parent: guildConfig.categoryId || undefined,
    userLimit:
      typeof saved.limit === "number" && saved.limit >= 0 && saved.limit <= 99
        ? saved.limit
        : 0,
    permissionOverwrites: overwrites,
  });

  rooms.set(channel.id, {
    guildId: guild.id,
    ownerId: member.id,
    locked: !!saved.locked,
    hidden: false,
    chatDisabled: false,
    bannedUsers: [],
    permittedUsers: [],
    createdAt: Date.now(),
    index: count + 1,
  });

  await member.voice.setChannel(channel).catch(() => {});
  return channel;
}

/**
 * يحذف الغرفة من القاعدة + يحاول حذف القناة نفسها لو ما زالت موجودة
 */
async function destroyRoom(guild, channelId) {
  rooms.delete(channelId);
  const channel = guild.channels.cache.get(channelId);
  if (channel) {
    await channel.delete().catch(() => {});
  }
}

/**
 * يحذف الغرفة تلقائياً إذا صارت فاضية
 */
async function deleteIfEmpty(channel) {
  if (!channel || channel.type !== ChannelType.GuildVoice) return;
  const room = getRoom(channel.id);
  if (!room) return;
  if (channel.members.size === 0) {
    await destroyRoom(channel.guild, channel.id);
  }
}

module.exports = {
  getRoom,
  getActiveRoomFromMember,
  isOwner,
  createTempRoom,
  destroyRoom,
  deleteIfEmpty,
};
