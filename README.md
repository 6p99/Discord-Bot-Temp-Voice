# =========================================================================
# 🎙️ Temp Voice Bot - README
# =========================================================================

A feature-rich, high-performance temporary voice channel bot built entirely using Discord.js v14. Inspired by the concept of TempVoicePro, this bot is modern, streamlined, and engineered entirely around Components v2 (a single, unified control panel layout containing all action buttons for an optimal user experience).

No heavy database setups required! It runs completely fine without MongoDB or MySQL by storing data via simple, lightweight JSON files. This makes it perfect to deploy on local Windows/Linux machines or resource-constrained environments like Termux.

---

## ✨ Features

- **`/setup` Automation**: Instantly creates everything you need:
  - A "🔊 Temporary Rooms" category.
  - A "➕ Create Room" voice channel — whenever a member joins this, a private voice room is dynamically created for them and they are automatically moved into it.
  - A dedicated text channel containing the Universal Control Panel.

- **Universal Control Panel**: No clutter! A single control panel handles all active rooms. The button actions automatically detect the voice room you are currently in and verify if you are its owner.

- **Interactive Control Buttons**:
  - 🔒 **Lock**: Block new members from joining your room.
  - 🔓 **Unlock**: Re-open your room to the public.
  - 🙈 **Hide**: Hide your room from the server's channel list.
  - 👁️ **Show**: Make your room visible again.
  - 🔢 **Limit**: Set a custom user capacity limit via a popup modal.
  - ✏️ **Rename**: Give your voice room a custom name via a popup modal.
  - 🌍 **Region Changer**: Accurately measures real-time ping across all Discord voice regions by having the bot physically test connections, sorting them from fastest to slowest before letting you pick.
  - ⛔ **Ban**: Block a specific user from accessing your room and instantly kick them if they are inside.
  - ✅ **Unban**: Lift a room ban from a user.
  - 🎫 **Permit**: Allow a specific user to join your room, bypassing lock/hide restrictions.
  - ✉️ **Invite**: Generate a quick, one-use invite link that expires in 1 hour.
  - 🔄 **Transfer Ownership**: Hand over room ownership to another active member inside your room.
  - 👑 **Claim Ownership**: If the original owner leaves, any remaining member inside the room can claim ownership.
  - 💬 **Text Chat Toggle**: Enable or disable the text chat interface within your voice channel.
  - 🧵 **Thread**: Spin up a quick discussion thread inside the room's text chat.

- **Smart Persistent Settings**: Every time you adjust user limits, lock/unlock, or configure settings, the bot automatically saves your preferences. Your next newly created room will automatically inherit your last saved setup!

- **Deletion Delay Grace Period**: When everyone leaves a temporary room, the bot waits for 1 full minute before purging it. This prevents accidental deletions if someone gets disconnected or wants to jump right back in.

---

## 🎨 Custom Emojis Setup (Optional but Recommended)

The bot comes with clean, custom-designed monochromatic (Black & White style) icons to give your control panel a premium look.

To upload and use them automatically, run:
$ node upload-emojis.js

### Requirements for Emoji Upload:
- Ensure GUILD_ID is defined in your .env file (the server where emojis will be uploaded).
- The bot needs "Manage Expressions" (or "Manage Emojis and Stickers") permissions.
- Images are located in assets/emojis/ (tv_rename, tv_limit, tv_lock, tv_transfer, tv_region, tv_kick, tv_unban, tv_delete).
- Once uploaded, emoji IDs are cached in data/emojis.json and applied automatically. If skipped, standard Unicode emojis will be used as a fallback.

---

## 📦 Installation

Run the following commands in your terminal:

$ git clone <your-repository-url>
$ cd TempVoiceBot
$ npm install
$ cp .env.example .env

Now open your .env file and fill out your credentials:
-------------------------------------------------------------------------
TOKEN=YOUR_BOT_TOKEN
CLIENT_ID=YOUR_BOT_APPLICATION_ID
GUILD_ID=YOUR_SERVER_ID  # Optional. If left blank, commands register globally.
-------------------------------------------------------------------------

---

## 🚀 Deploying & Running

Register slash commands and kick off the bot:
$ node deploy-commands.js
$ npm start

Or keep it running 24/7 using PM2:
$ pm2 start src/index.js --name tempvoice
$ pm2 save

---

## 🕹️ How to Use

1. Run the `/setup` slash command (requires "Manage Server" permissions).
2. The bot automatically creates the voice hub category, the generator room, and the control panel channel.
3. Join "➕ Create Room" to test it out. Your custom room will open instantly.
4. While sitting in your new room, head over to the control panel text channel and use the interactive buttons to customize your space.
5. Accidentally deleted the control panel? Simply run `/panel` in any text channel to re-send a fresh one.

---

## 📁 Project Structure

TempVoiceBot/
├── deploy-commands.js
├── package.json
├── .env.example
├── data/                  ← Generated automatically (guilds.json, rooms.json, emojis.json)
├── assets/
│   └── emojis/            ← Monochromatic control icon assets
├── upload-emojis.js       ← Handles bulk uploading of custom icons
└── src/
    ├── index.js
    ├── commands/
    │   ├── setup.js
    │   └── panel.js
    ├── events/
    │   ├── ready.js
    │   ├── interactionCreate.js
    │   └── voiceStateUpdate.js
    ├── handlers/
    │   └── tempvoice.js   ← Core logic for buttons, select menus, and modals
    ├── utils/
    │   ├── panel.js       ← Components v2 container UI builder
    │   └── rooms.js
    └── database/
        └── db.js          ← Simple JSON file-system database wrapper

---

## ⚠️ Required Bot Permissions

Make sure the bot has a role positioned high enough in your hierarchy or grant it the "Administrator" permission. Minimum required permissions include:
- Manage Channels
- Move Members
- View Channel & Connect (Voice privileges)
- Send Messages (In the control panel channel)
- Create Instant Invite (For the invite button functionality)

---

## 🏓 Note on the Region Ping Test

When hitting the Region button, the bot creates a temporary hidden testing channel named "🧪 ping-test" (created once and recycled later). The bot physically hops into this channel across different voice servers to measure genuine network UDP latency. The entire process takes up to a minute. Don't worry—this channel is completely hidden from ordinary members (@everyone view permissions are denied) so it won't clutter your server UI.

# =========================================================================
# End of File
# =========================================================================