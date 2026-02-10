# WhatsApp Bot - Portainer Deployment Guide

## 📋 Prerequisites

- ✅ Portainer installed on home server
- ✅ Evolution API running in Docker
- ✅ Evolution API network name (usually `evolution-network` or similar)
- ✅ Bot source code ready

---

## 🚀 Deployment Options

### Option 1: Portainer Stack (Recommended)
Best for: Quick deployment, easy updates

### Option 2: Portainer Container
Best for: Custom configuration, manual control

---

## 📦 Option 1: Deploy via Portainer Stack

### Step 1: Prepare Files

1. **Upload project to server**:
   ```bash
   # On your PC, zip the project
   zip -r wa-bot.zip . -x "node_modules/*" "logs/*" ".git/*"
   
   # Copy to server
   scp wa-bot.zip user@homeserver:/home/user/
   
   # On server, extract
   unzip wa-bot.zip -d /home/user/wa-bot
   cd /home/user/wa-bot
   ```

2. **Configure environment**:
   ```bash
   # Copy example to .env
   cp .env.example .env
   
   # Edit with your values
   nano .env
   ```

3. **Update these values in .env**:
   ```bash
   EVOLUTION_API_URL=http://evolution-api:8080  # Use Docker service name
   EVOLUTION_API_KEY=your-actual-api-key
   EVOLUTION_INSTANCE_NAME=your-instance-name
   ADMINS=62882000300327,110157572870214  # Your admin numbers
   ```

### Step 2: Find Evolution API Network

```bash
# List networks
docker network ls

# Inspect Evolution API container
docker inspect evolution-api | grep NetworkMode
# OR
docker inspect evolution-api | grep -A 10 Networks
```

**Common network names**:
- `evolution-network`
- `evolution_default`
- `evolution_evolution-network`

### Step 3: Update docker-compose.yml

Edit `docker-compose.yml`:
```yaml
networks:
  evolution-network:
    external: true
    name: YOUR_ACTUAL_NETWORK_NAME  # Replace with actual name
```

### Step 4: Deploy in Portainer

1. **Go to Portainer UI**: `http://homeserver:9000`

2. **Navigate**: `Stacks` → `+ Add Stack`

3. **Configure Stack**:
   - **Name**: `wa-bot`
   - **Build method**: `Repository` or `Upload`

4. **If using Repository**:
   - Git repository: Your repo URL
   - Reference: `main`
   - Compose path: `docker-compose.yml`

5. **If using Upload**:
   - Copy content of `docker-compose.yml`
   - Paste into web editor

6. **Environment Variables** (optional, if not using .env file):
   - Add all variables from `.env` as Stack environment variables

7. **Deploy**: Click `Deploy the stack`

---

## 🐳 Option 2: Deploy via Portainer Container

### Step 1: Build Image

**On your server**:
```bash
cd /home/user/wa-bot

# Build image
docker build -t wa-bot:latest .

# Verify
docker images | grep wa-bot
```

### Step 2: Create Container in Portainer

1. **Go to Portainer**: `http://homeserver:9000`

2. **Navigate**: `Containers` → `+ Add Container`

3. **Configure**:
   - **Name**: `wa-group-bot`
   - **Image**: `wa-bot:latest`

4. **Network**:
   - Click `Network` tab
   - Select your Evolution API network (e.g., `evolution-network`)

5. **Volumes**:
   - Click `Volumes` tab
   - Add:
     - `/home/user/wa-bot/admins.json` → `/app/admins.json`
     - `/home/user/wa-bot/logs` → `/app/logs`

6. **Environment Variables**:
   - Click `Env` tab
   - Add all from `.env`:
     ```
     NODE_ENV=production
     EVOLUTION_API_URL=http://evolution-api:8080
     EVOLUTION_API_KEY=xxx
     EVOLUTION_INSTANCE_NAME=xxx
     BOT_PORT=3000
     ADMINS=62882000300327,110157572870214
     # ... (all others)
     ```

7. **Restart Policy**:
   - Click `Restart policy` tab
   - Select: `Unless stopped`

8. **Port Mapping** (if needed):
   - Click `Publish a new network port`
   - Host: `3000`, Container: `3000`

9. **Deploy**: Click `Deploy the container`

---

## ⚙️ Configure Evolution API Webhook

### Method 1: Via Evolution API Dashboard

1. Go to Evolution API dashboard
2. Select your instance
3. Go to Webhook settings
4. Set URL: `http://wa-group-bot:3000/webhook`
5. Save

### Method 2: Via API

```bash
curl -X POST https://api.mrsnapz.site/webhook/set/your-instance \
  -H "apikey: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://wa-group-bot:3000/webhook",
    "webhook_by_events": false,
    "events": ["MESSAGES_UPSERT"]
  }'
```

**IMPORTANT**: Use Docker service name (`wa-group-bot`) not `localhost`!

---

## ✅ Verification

### 1. Check Container Status

**In Portainer**:
- Container status should be `running`
- Green dot indicator

**Or via CLI**:
```bash
docker ps | grep wa-bot
```

### 2. Check Logs

**In Portainer**:
- Click container name
- Click `Logs` tab
- Look for:
  ```
  ✅ Bot initialized successfully!
  Rate limiter initialized: 10 requests per 60000ms
  ```

**Or via CLI**:
```bash
docker logs wa-group-bot -f
```

### 3. Check Health

```bash
# From server
curl http://localhost:3000/health

# Expected response:
{"status":"ok","bot":"running"}
```

### 4. Test Bot

Send message to bot:
```
/cekid
```

Expected: Bot responds with your ID info ✅

---

## 🔧 Troubleshooting

### Container Won't Start

**Check logs**:
```bash
docker logs wa-group-bot
```

**Common issues**:
- Missing .env variables
- Wrong network name
- Port already in use

**Fix**:
```bash
# Stop and remove container
docker stop wa-group-bot
docker rm wa-group-bot

# Fix issue, then redeploy
```

### Bot Not Receiving Messages

**Check webhook URL**:
```bash
# Should be: http://wa-group-bot:3000/webhook
# NOT: http://localhost:3000/webhook
```

**Check network**:
```bash
# Both containers should be on same network
docker inspect wa-group-bot | grep NetworkMode
docker inspect evolution-api | grep NetworkMode
```

**Test connectivity**:
```bash
# From Evolution API container to bot
docker exec evolution-api curl http://wa-group-bot:3000/health
```

### Admins.json Not Persisting

**Check volume mount**:
```bash
docker inspect wa-group-bot | grep -A 10 Mounts
```

**Should show**:
```json
{
  "Type": "bind",
  "Source": "/home/user/wa-bot/admins.json",
  "Destination": "/app/admins.json"
}
```

**Fix**: Recreate container with correct volume mounts

### Rate Limiter False Positives

**Adjust limits** in `.env`:
```bash
RATE_LIMIT_MAX_REQUESTS=20  # Increase limit
RATE_LIMIT_WINDOW_MS=60000  # Keep window
```

Then restart container.

---

## 🔄 Updates & Maintenance

### Update Bot Code

**Stack method**:
1. Update code in repository
2. In Portainer: Stack → `wa-bot` → `Pull and redeploy`

**Container method**:
```bash
cd /home/user/wa-bot
git pull  # or copy new files
docker build -t wa-bot:latest .
docker stop wa-group-bot
docker rm wa-group-bot
# Redeploy via Portainer
```

### View Logs

```bash
# Last 100 lines
docker logs wa-group-bot --tail 100

# Follow/live logs
docker logs wa-group-bot -f

# Logs with timestamps
docker logs wa-group-bot -t
```

### Backup

```bash
# Backup admins list
cp /home/user/wa-bot/admins.json /home/user/backups/admins-$(date +%Y%m%d).json

# Backup logs
tar -czf /home/user/backups/logs-$(date +%Y%m%d).tar.gz /home/user/wa-bot/logs/
```

### Restart Container

**Via Portainer**: Container → `Restart`

**Via CLI**:
```bash
docker restart wa-group-bot
```

---

## 📊 Monitoring

### Resource Usage

```bash
# CPU & Memory
docker stats wa-group-bot

# Or in Portainer:
# Container → Stats
```

### Health Check Status

```bash
docker inspect wa-group-bot | grep -A 10 Health
```

---

## 🔒 Security Best Practices

1. ✅ **Change default secrets**:
   ```bash
   WEBHOOK_SECRET=your-unique-secret-here  # Uncomment in .env
   ```

2. ✅ **Limit network exposure**:
   - Don't expose port 3000 externally if not needed
   - Keep bot on internal Docker network only

3. ✅ **Regular updates**:
   - Update dependencies: `npm update`
   - Update base image: rebuild with latest Node.js

4. ✅ **Monitor logs**:
   - Watch for unauthorized webhook attempts
   - Watch for rate limit violations

---

## 🎯 Quick Reference

### Essential Commands

```bash
# View logs
docker logs wa-group-bot -f

# Restart
docker restart wa-group-bot

# Stop
docker stop wa-group-bot

# Remove (be careful!)
docker rm wa-group-bot

# Health check
curl http://localhost:3000/health

# Network check
docker network inspect evolution-network
```

### Files Location

```
/home/user/wa-bot/
├── Dockerfile
├── docker-compose.yml
├── .env (create from .env.example)
├── admins.json (auto-created)
├── logs/ (auto-created)
└── ... (source files)
```

---

## ✨ Done!

Your WhatsApp bot is now running in Docker, deployed via Portainer, on the same network as Evolution API! 🎉

**Next steps**:
- Test all commands
- Monitor logs for errors
- Set up backups
- Enable webhook secret for production
- Adjust rate limits as needed

For issues, check logs first: `docker logs wa-group-bot -f`
