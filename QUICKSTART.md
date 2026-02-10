# Quick Start Guide - WhatsApp Group Manager Bot

## 🚀 Steps untuk Mulai

### 1. Start Bot

```bash
cd bot
npm start
```

Output seharusnya:
```
🤖 Initializing WhatsApp Group Manager Bot...
✅ helpCommand enabled
✅ welcomeMessage enabled
✅ tagallCommand enabled
✅ scheduledMessages enabled
✅ broadcastGroups enabled
🚀 Webhook server listening on port 3000
📡 Registering webhook with Evolution API...
✅ Webhook registered successfully!
✅ Bot initialized successfully!
📱 Instance: test_v236
🔗 Webhook: http://localhost:3000/webhook
```

**Auto-Setup!** ✨ Bot otomatis register webhook ke Evolution API, tidak perlu manual lagi!

### 2. Configure (Optional)
**Edit nomor admin** di `bot/.env`:
```env
ADMINS=6281234567890  # 👈 Ganti dengan nomor Anda
```

Restart bot jika sudah running.

### 3. Test di WhatsApp

#### A. Test /help Command
1. Buka grup WhatsApp yang sudah connect ke `test_v236`
2. Ketik: `/help`
3. Bot akan balas dengan daftar command

#### B. Test /tagall Command (Admin Only!)
1. Pastikan nomor Anda ada di `ADMINS` di `.env`
2. Di grup, ketik: `/tagall Meeting penting!`
3. Bot akan mention semua member

#### C. Test Welcome Message
1. Tambahkan member baru ke grup
2. Bot otomatis welcome dengan mention

### 4. Configure Scheduled Messages

Edit `bot/config.js`:

```javascript
scheduledMessages: {
  enabled: true,
  schedules: [
    {
      name: "Morning Reminder",
      cron: "0 8 * * *",
      groups: ["120363XXXXX@g.us"], // GANTI dengan Group ID
      message: "☀️ Selamat pagi!"
    }
  ]
}
```

**Cara dapat Group ID:**
1. Kirim pesan di grup: `/help`
2. Check logs bot: `remoteJid: "120363XXXXX@g.us"`
3. Copy ID tersebut ke config

Restart bot untuk apply changes.

### 5. Setup Broadcast Groups

**Option A:** Pakai scheduled messages groups
- Broadcast akan kirim ke grup yang ada di `scheduledMessages.schedules`

**Option B:** Edit `broadcastGroups.js`
- Add method untuk track groups
- Simpan group IDs ke database/file

Test broadcast:
```
/broadcast Pengumuman penting untuk semua!
```

---

## 🐛 Troubleshooting

### Bot tidak respon
```bash
# Check bot running
curl http://localhost:3000/health

# Check webhook
curl http://localhost:8080/webhook/find/test_v236 -H "apikey: change-me-to-secure-key"
```

### Command tidak jalan
1. Check logs di terminal bot
2. Pastikan nomor admin benar di `.env`
3. Pastikan feature enabled

### Welcome message tidak muncul
1. Check logs: `GROUP_PARTICIPANTS_UPDATE` event received?
2. Verify webhook includes `GROUP_PARTICIPANTS_UPDATE` event

---

## 📝 Configuration Checklist

- [ ] Bot `.env` configured dengan API key yang benar
- [ ] Admin phone number di `ADMINS` (format: 6281234567890)
- [ ] Bot running: `npm start`
- [ ] Webhook di-set ke Evolution API
- [ ] Group IDs added untuk scheduled messages (optional)
- [ ] Test `/help` command berhasil

---

Ready to go! 🎉
