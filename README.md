# WhatsApp Bot - Production Ready

> Powerful WhatsApp bot with admin management, security features, and Docker deployment for Evolution API

[![GitHub](https://img.shields.io/badge/GitHub-mrbopznet--tech%2Fwabot-blue)](https://github.com/mrbopznet-tech/wabot)

## ✨ Features

### 🔐 Admin Management
- **Dual-tier admin system**: Super Admins (permanent) + Dynamic Admins (manageable)
- **Multi-device support**: Handles both phone numbers and @lid device IDs
- **Admin commands**: `/addadmin`, `/deladmin`, `/listadmin`, `/cekid`
- **Persistence**: Auto-saves to `admins.json`

### 🛡️ Security
- **Rate limiting**: Prevents spam (10 commands/minute per user)
- **Webhook validation**: Optional secret for secure webhooks
- **Command protection**: Admin-only commands automatically protected
- **Audit logging**: All admin actions logged

### 💬 Bot Commands
- `/help` - Show all commands
- `/cekid` - Check your WhatsApp ID and role
- `/blast <targets>|<message>` - Broadcast to multiple users (admin only)
- `.h <message>` - Tag all group members (admin only)
- `/addadmin <number>` - Add new admin (admin only)
- `/deladmin <number>` - Remove admin (admin only)
- `/listadmin` - List all admins (admin only)

### 🐳 Docker Ready
- **Optimized image**: Multi-stage build (~150MB)
- **Production-ready**: Non-root user, health checks
- **Portainer compatible**: Deploy via Stack or Container
- **Auto-restart**: Resilient to crashes
- **Volume persistence**: Admins and logs preserved

---

## 🚀 Quick Start

### Local Development

```bash
# Clone repository
git clone https://github.com/mrbopznet-tech/wabot.git
cd wabot

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Edit with your values

# Run
npm start
```

### Docker Deployment

```bash
# Clone and configure
git clone https://github.com/mrbopznet-tech/wabot.git
cd wabot
cp .env.example .env
nano .env

# Deploy with Docker Compose
docker-compose up -d

# Or deploy via Portainer Stack
# See DEPLOYMENT.md for detailed guide
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# Evolution API Configuration
EVOLUTION_API_URL=http://evolution-api:8080
EVOLUTION_API_KEY=your-api-key
EVOLUTION_INSTANCE_NAME=your-instance

# Super Admin Configuration
ADMINS=62882000300327,110157572870214  # Phone numbers or @lid

# Bot Server
BOT_PORT=3000
BOT_WEBHOOK_PATH=/webhook

# Features
WELCOME_MESSAGE_ENABLED=true

# Blast Configuration
BLAST_MIN_DELAY=3000  # Min delay between messages (ms)
BLAST_MAX_DELAY=8000  # Max delay between messages (ms)
BLAST_MAX_TARGETS=50  # Max targets per blast

# Security
RATE_LIMIT_MAX_REQUESTS=10      # Commands per minute
RATE_LIMIT_WINDOW_MS=60000      # Time window (60 seconds)
# WEBHOOK_SECRET=your-secret    # Optional webhook security
```

### Evolution API Webhook

Configure Evolution API to send webhooks to bot:

```bash
URL: http://wa-group-bot:3000/webhook
```

**Note**: Use Docker service name if both on same network, NOT `localhost`!

---

## 📁 Project Structure

```
wabot/
├── index.js                    # Main bot server
├── config.js                   # Configuration loader
├── package.json                # Dependencies
├── Dockerfile                  # Docker image
├── docker-compose.yml          # Docker Compose
├── .env.example                # Environment template
├── DEPLOYMENT.md               # Deployment guide
├── features/                   # Feature modules
│   ├── adminCommand.js         # Admin management commands
│   ├── blastCommand.js         # Broadcast messaging
│   ├── helpCommand.js          # Help menu
│   └── tagallCommand.js        # Tag all members
└── utils/                      # Utilities
    ├── adminManager.js         # Admin system
    ├── evolutionApi.js         # Evolution API client
    ├── logger.js               # Winston logger
    └── rateLimiter.js          # Anti-spam rate limiting
```

---

## 📖 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide for Portainer
- **[QUICKSTART.md](QUICKSTART.md)** - Quick start guide
- **[.env.example](.env.example)** - Configuration reference

---

## 🎯 Usage Examples

### Check Your ID
```
User: /cekid
Bot: 📱 ID WhatsApp Anda
     JID: 62882000300327@s.whatsapp.net
     Phone: 62882000300327
     Role: 👑 Super Admin
```

### Add Admin
```
Admin: /addadmin 628123456789
Bot: ✅ 628123456789 berhasil ditambahkan sebagai admin

# Or reply to user's message
User: Hello
Admin: /addadmin (reply to user)
Bot: ✅ 628123456789 berhasil ditambahkan sebagai admin
```

### Broadcast Message
```
Admin: /blast 628xxx,628yyy|Halo semua!
Bot: ✅ Blast dimulai ke 2 target
     [Progress updates...]
     ✅ Blast selesai! Berhasil: 2, Gagal: 0
```

### Tag All Members
```
Admin: .h Meeting jam 3 sore!
Bot: @user1 @user2 @user3... Meeting jam 3 sore!
```

### Rate Limit Protection
```
# After 10 commands in 60 seconds:
User: /help (11th command)
Bot: ⚠️ Terlalu banyak request!
     Mohon tunggu 45 detik sebelum mengirim command lagi.
     _Anti-spam protection active_
```

---

## 🐛 Troubleshooting

### Bot Not Responding

**Check webhook URL**:
```bash
# Should be (if using Docker):
http://wa-group-bot:3000/webhook

# NOT:
http://localhost:3000/webhook
```

**Check logs**:
```bash
# Docker
docker logs wa-group-bot -f

# Local
tail -f combined.log
```

### Admin Commands Not Working

**Verify admin numbers** in `.env`:
```bash
# Include both phone number AND @lid for multi-device support
ADMINS=62882000300327,110157572870214
```

**Check role**:
```
/cekid
# Should show "Super Admin" or "Admin"
```

### Rate Limit Issues

**Adjust limits** in `.env`:
```bash
RATE_LIMIT_MAX_REQUESTS=20  # Increase if needed
```

**Reset for specific user** (in code):
```javascript
rateLimiter.reset(userId);
```

---

## 🔒 Security Best Practices

1. **Change default secrets**:
   ```bash
   WEBHOOK_SECRET=your-unique-secret-here
   ```

2. **Use strong API keys** in Evolution API

3. **Don't expose port 3000** externally if not needed

4. **Monitor logs** for unauthorized attempts:
   ```bash
   docker logs wa-group-bot | grep -i "unauthorized\|rate limit"
   ```

5. **Regular updates**:
   ```bash
   git pull
   npm update
   docker-compose up -d --build
   ```

---

## 🚢 Deployment Options

### Option 1: Docker Compose (Recommended)
```bash
docker-compose up -d
```

### Option 2: Portainer Stack
1. Go to Portainer UI
2. Create new Stack
3. Paste `docker-compose.yml`
4. Deploy

### Option 3: Portainer Container
1. Build image: `docker build -t wa-bot .`
2. Create container via Portainer
3. Configure network, volumes, env vars

**See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.**

---

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:3000/health
# Response: {"status":"ok","bot":"running"}
```

### Container Status
```bash
docker ps | grep wa-bot
docker stats wa-group-bot
```

### View Logs
```bash
docker logs wa-group-bot -f --tail 100
```

---

## 🔄 Updates & Maintenance

### Update Code
```bash
git pull
npm install
docker-compose up -d --build
```

### Backup Data
```bash
# Backup admin list
cp admins.json backups/admins-$(date +%Y%m%d).json

# Backup logs
tar -czf backups/logs-$(date +%Y%m%d).tar.gz logs/
```

### View Admin List
```bash
cat admins.json | jq .
```

---

## 🎨 Customization

### Add New Command
1. Create file in `features/` folder
2. Export `handleMessage(message, api)` function
3. Import and register in `index.js`

### Modify Rate Limits
Edit `.env`:
```bash
RATE_LIMIT_MAX_REQUESTS=20  # Commands per window
RATE_LIMIT_WINDOW_MS=60000  # Window size (ms)
```

### Change Help Text
Edit `features/helpCommand.js`:
```javascript
const helpText = `Your custom help text...`;
```

---

## 🛠️ Development

### Run in Dev Mode
```bash
npm run dev  # Auto-restart on file changes
```

### Debug Logging
Set in `utils/logger.js`:
```javascript
level: 'debug'  // Show all logs
```

### Test Features
```bash
# Test single feature
node -e "require('./features/adminCommand').handleMessage(...)"
```

---

## 📝 License

MIT License - free to use and modify

---

## 🙏 Credits

- **Evolution API**: WhatsApp Web API
- **Express.js**: Web framework
- **Winston**: Logging
- **Docker**: Containerization

---

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/mrbopznet-tech/wabot/issues)
- **Docs**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Logs**: Check `combined.log` or `docker logs`

---

## 🎯 Roadmap

- [ ] PM2 process manager integration
- [ ] PostgreSQL/SQLite database support
- [ ] Message queue for blast (BullMQ)
- [ ] Multi-language support
- [ ] Usage statistics dashboard
- [ ] Sticker maker feature
- [ ] Auto-reply AI integration

---

**Made with ❤️ for WhatsApp automation**
