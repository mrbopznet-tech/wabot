# WhatsApp Group Manager Bot

Bot untuk manage WhatsApp groups dengan Evolution API. Setiap fitur dalam file terpisah untuk mudah debugging!

## 🎯 Features

✅ **Welcome Message** - Auto greet member baru  
✅ **Tag All Command** - Mention semua member (`/tagall`)  
✅ **Help Command** - Daftar command (`/help`)  
✅ **Scheduled Messages** - Auto-post reminder harian/mingguan  
✅ **Broadcast Groups** - Kirim ke banyak grup sekaligus

## 📁 Project Structure

```
bot/
├── index.js                    # Main bot
├── config.js                   # Configuration
├── package.json                # Dependencies
├── .env                        # Environment variables
├── features/                   # Feature modules (1 file per feature!)
│   ├── helpCommand.js
│   ├── welcomeMessage.js
│   ├── tagallCommand.js
│   ├── scheduledMessages.js
│   └── broadcastGroups.js
└── utils/
    ├── evolutionApi.js         # Evolution API wrapper
    └── logger.js               # Logging
```

## ⚙️ Setup

### 1. Install Dependencies

```bash
cd bot
npm install
```

### 2. Configure Environment

Edit `bot/.env`:

```env
# Evolution API
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=change-me-to-secure-key
INSTANCE_NAME=test_v236

# Bot Admin (your phone number, no +)
ADMINS=6281234567890

# Enable/disable features
WELCOME_MESSAGE_ENABLED=true
TAGALL_ENABLED=true
HELP_ENABLED=true
SCHEDULED_MESSAGES_ENABLED=true
BROADCAST_ENABLED=true
```

### 3. Configure Scheduled Messages (Optional)

Edit `config.js` -> `features.scheduledMessages.schedules`:

```javascript
schedules: [
  {
    name: "Morning Reminder",
    cron: "0 8 * * *", // Setiap hari jam 8 pagi
    groups: ["120363XXXXX@g.us"], // Group IDs
    message: "☀️ Selamat pagi!"
  }
]
```

**Cara dapat Group ID:**
1. Kirim pesan di grup: `/help`
2. Check logs bot, akan muncul `remoteJid` grup

### 4. Setup Webhook di Evolution API

Bot perlu tau kalau ada pesan masuk. Set webhook:

```bash
curl -X POST http://localhost:8080/webhook/set/test_v236 \
  -H "apikey: change-me-to-secure-key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://localhost:3000/webhook",
    "webhook_by_events": true,
    "events": ["MESSAGES_UPSERT", "GROUP_PARTICIPANTS_UPDATE"]
  }'
```

**PENTING:** 
1. Jika bot dan Evolution API di server berbeda, ganti `localhost` dengan IP/domain server bot!
2. **Evolution API v2** mungkin menambahkan event name ke akhir URL (misal: `/webhook/messages-upsert`). Bot sudah diset untuk handle ini, jadi pastikan setup URL-nya bersih (`http://.../webhook`).

### 5. Run Bot

```bash
npm start
```

Atau untuk development (auto-restart):
```bash
npm run dev
```

## 📱 Usage

### Member Commands
- `/help` - Tampilkan bantuan

### Admin Commands
- `/tagall <pesan>` - Mention semua member
  - Contoh: `/tagall Meeting jam 3 sore!`
- `/broadcast <pesan>` - Broadcast ke semua grup (bot admin only)

### Auto Features
- **Welcome Message** - Otomatis saat ada member baru
- **Scheduled Messages** - Kirim otomatis sesuai jadwal

## 🔧 Customization

### Modify Welcome Message

Edit `config.js`:
```javascript
welcomeMessage: {
  message: "Halo @user! Custom message...",
  delay: 2000
}
```

### Add/Remove Commands

Edit `config.js`:
```javascript
tagall: {
  commands: ['/tagall', '/everyone', '!all'] // Add/remove
}
```

### Enable/Disable Features

Edit `.env`:
```env
WELCOME_MESSAGE_ENABLED=false  # Disable welcome
TAGALL_ENABLED=true            # Enable tagall
```

## 🐛 Debugging

### Check Logs

Bot menggunakan Winston logger:
- Console output (warna)
- `combined.log` - Semua logs
- `error.log` - Error only

### Test Specific Feature

Karena setiap fitur terpisah, gampang debug:

1. Stop bot
2. Edit feature file yang mau di-test
3. Add `console.log()` di feature
4. Restart bot
5. Test command/trigger

### Common Issues

**Bot tidak respon / Gabales:**
- **URL Webhook Salah**: Evolution API v2 mengirim ke `/webhook/messages-upsert`. Pastikan bot listen di semua subpath (sudah difix di code `index.js`).
- **Data Malformed**: Terkadang API mengirim data aneh (`spread string`). Bot sudah punya auto-normalize, cek logs jika ada warning "treating as raw string".
- Check webhook status: `curl http://localhost:3000/health`
- Check logs: `tail -f combined.log`
- Pastikan Evolution API running

**Command tidak jalan:**
- Check feature enabled di `.env`
- Check logs untuk error
- Verify admin phone number di `ADMINS`

**Scheduled message tidak kirim:**
- Check cron format benar
- Check `groups` array tidak kosong
- Check timezone server

## 📊 Monitor

Health check:
```bash
curl http://localhost:3000/health
```

Response:
```json
{"status":"ok","bot":"running"}
```

## 🚀 Production Tips

1. **Use PM2** untuk auto-restart:
   ```bash
   npm install -g pm2
   pm2 start index.js --name wa-bot
   pm2 save
   pm2 startup
   ```

2. **Set strong API key** di Evolution API

3. **Backup logs** secara berkala

4. **Monitor resource usage**

---

**Made with ❤️ using Evolution API**
