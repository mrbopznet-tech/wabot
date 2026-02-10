const express = require('express');
const config = require('./config');
const logger = require('./utils/logger');
const EvolutionAPI = require('./utils/evolutionApi');
const RateLimiter = require('./utils/rateLimiter');

// Import features
const helpCommand = require('./features/helpCommand');
const tagallCommand = require('./features/tagallCommand');
const blastCommand = require('./features/blastCommand');
const adminCommand = require('./features/adminCommand');


class WhatsAppGroupBot {
    constructor() {
        this.api = new EvolutionAPI(
            config.evolution.apiUrl,
            config.evolution.apiKey,
            config.evolution.instanceName
        );

        // Initialize rate limiter
        const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10;
        const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000;
        this.rateLimiter = new RateLimiter(maxRequests, windowMs);

        this.features = [
            helpCommand,
            tagallCommand,
            blastCommand,
            adminCommand
        ];

        this.app = express();
        // Use text parser to get raw content, then parse manually
        this.app.use(express.text({ type: '*/*', limit: '50mb' }));

        // Custom middleware to parse JSON and handle malformed Evolution API data
        this.app.use((req, res, next) => {
            if (typeof req.body === 'string') {
                try {
                    // Try standard parse first
                    req.body = JSON.parse(req.body);
                } catch (e) {
                    // If failed, check if it's the "spread" format (looks like "{"0":"{","1":"\""...)
                    // This creates a valid JSON object but logically it's wrong.
                    // But if req.body is a string, it might just be the raw string needs parsing.
                    logger.warn('Failed to parse body as JSON, treating as raw string');
                }
            }
            next();
        });
    }

    /**
     * Initialize bot
     */
    async initialize() {
        logger.info('🤖 Initializing WhatsApp Group Manager Bot...');

        // Setup webhook endpoint
        this.setupWebhook();

        // Initialize features
        await this.initializeFeatures();

        // Start Express server
        this.startServer();

        // Auto-setup webhook with Evolution API (if enabled)
        if (config.bot.autoRegisterWebhook) {
            await this.registerWebhook();
        } else {
            logger.info('⏭️  Auto webhook registration disabled');
        }

        logger.info('✅ Bot initialized successfully!');
        logger.info(`📱 Instance: ${config.evolution.instanceName}`);
        logger.info(`🔗 Webhook: http://localhost:${config.bot.port}${config.bot.webhookPath}`);
    }

    /**
     * Setup webhook endpoint
     */
    setupWebhook() {
        // Listen on webhook path and any subpaths (Evolution API v2 appends event names)
        const webhookPaths = [
            config.bot.webhookPath,
            `${config.bot.webhookPath}/*`
        ];

        this.app.all(webhookPaths, async (req, res) => {
            // Webhook secret validation
            const webhookSecret = process.env.WEBHOOK_SECRET;
            if (webhookSecret) {
                const providedSecret = req.headers['x-webhook-secret'];
                if (providedSecret !== webhookSecret) {
                    logger.warn(`Unauthorized webhook attempt from ${req.ip}`);
                    return res.status(401).json({ error: 'Unauthorized' });
                }
            }

            try {
                let body = req.body;

                // Helper to fix malformed data from Evolution API (spread string issue)
                const normalizeData = (d) => {
                    if (d && typeof d === 'object' && !Array.isArray(d) && d['0'] && d['1']) {
                        const keys = Object.keys(d).sort((a, b) => parseInt(a) - parseInt(b));
                        // Check if looks like indexed chars
                        if (keys[0] === '0') {
                            try {
                                const str = keys.map(k => d[k]).join('');
                                return JSON.parse(str);
                            } catch (e) {
                                logger.error('Failed to normalize data:', e);
                                return d;
                            }
                        }
                    }
                    return d;
                };

                // Normalize body if needed
                body = normalizeData(body);

                // Also try to normalize data field if body was fine but data is messed up
                if (body && body.data) {
                    body.data = normalizeData(body.data);
                }

                const { event, data } = body || {};

                logger.info(`Webhook received event: ${event}`);
                logger.info(`Content-Type: ${req.headers['content-type']}`);

                // Determine message content for logging
                const logData = (data && data.data) ? data.data : data;
                logger.info('Payload sample:', JSON.stringify(logData).substring(0, 100)); // Log first 100 chars

                // Handle different event types
                if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
                    await this.handleIncomingMessage(data);
                } else if (event === 'group-participants.update' || event === 'GROUP_PARTICIPANTS_UPDATE') {
                    await this.handleGroupUpdate(data);
                }

                res.sendStatus(200);
            } catch (error) {
                logger.error('Error handling webhook:', error);
                res.sendStatus(500);
            }
        });

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', bot: 'running' });
        });
    }

    /**
     * Handle incoming messages
     */
    async handleIncomingMessage(data) {
        // Evolution API v2 structure: data.data.messages or data.messages
        const message = data?.data?.messages?.[0] || data?.messages?.[0] || data;

        if (!message || !message.key) {
            logger.warn('Invalid message structure:', message);
            return;
        }

        const fromJid = message.key.remoteJid;
        const senderJid = message.key.participant || message.key.remoteJid;

        // Ignore messages from bot itself
        if (message.key.fromMe) {
            return;
        }

        // Rate limit check
        const rateLimitResult = this.rateLimiter.check(senderJid);
        if (rateLimitResult.isLimited) {
            logger.warn(`Rate limit exceeded for ${senderJid}, retry after ${rateLimitResult.retryAfter}s`);
            await this.api.sendText(fromJid,
                `⚠️ *Terlalu banyak request!*\n\n` +
                `Mohon tunggu ${rateLimitResult.retryAfter} detik sebelum mengirim command lagi.\n\n` +
                `_Anti-spam protection active_`
            );
            return;
        }

        // Log incoming message
        const messageText = message.message?.conversation || message.message?.extendedTextMessage?.text || '[media]';
        logger.info(`Message from ${senderJid}`);
        logger.debug(`Content: ${messageText}`);

        // Forward to all registered features
        for (const feature of this.features) {
            try {
                if (feature.handleMessage) {
                    await feature.handleMessage(message, this.api);
                }
            } catch (error) {
                logger.error(`Error in feature ${feature.name}:`, error);
            }
        }
    }

    /**
     * Handle group participant updates
     */
    async handleGroupUpdate(data) {
        logger.info(`Group update: ${data.action} in ${data.id}`);

        // Pass to features that handle group updates
        for (const feature of this.features) {
            if (feature.enabled && feature.handleGroupUpdate) {
                try {
                    await feature.handleGroupUpdate(data, this.api);
                } catch (error) {
                    logger.error(`Error in feature ${feature.name}:`, error);
                }
            }
        }
    }

    /**
     * Initialize all features
     */
    async initializeFeatures() {
        logger.info('Initializing features...');

        for (const feature of this.features) {
            if (feature.enabled) {
                logger.info(`✅ ${feature.name} enabled`);

                if (feature.initialize) {
                    try {
                        await feature.initialize(this.api);
                    } catch (error) {
                        logger.error(`Failed to initialize ${feature.name}:`, error);
                    }
                }
            } else {
                logger.info(`⏭️  ${feature.name} disabled`);
            }
        }
    }

    /**
     * Start Express server
     */
    startServer() {
        this.app.listen(config.bot.port, () => {
            logger.info(`🚀 Webhook server listening on port ${config.bot.port}`);
        });
    }

    /**
     * Register webhook with Evolution API
     */
    async registerWebhook() {
        // Use configured webhook URL or auto-generate with host.docker.internal
        // This fixes the "localhost" issue when Evolution API is in Docker
        const webhookUrl = config.bot.webhookUrl ||
            `http://host.docker.internal:${config.bot.port}${config.bot.webhookPath}`;

        try {
            logger.info('📡 Registering webhook with Evolution API...');
            logger.info(`   Webhook URL: ${webhookUrl}`);
            await this.api.setWebhook(webhookUrl);
            logger.info('✅ Webhook registered successfully!');
        } catch (error) {
            logger.warn('⚠️  Failed to register webhook automatically:', error.message);
            logger.warn('💡 TIP: If Evolution API is in Docker, make sure to use:');
            logger.warn(`   WEBHOOK_URL=http://host.docker.internal:${config.bot.port}${config.bot.webhookPath}`);
        }
    }

    /**
     * Cleanup on shutdown
     */
    async cleanup() {
        logger.info('Shutting down bot...');

        for (const feature of this.features) {
            if (feature.cleanup) {
                try {
                    await feature.cleanup();
                } catch (error) {
                    logger.error(`Error cleaning up ${feature.name}:`, error);
                }
            }
        }

        logger.info('Bot shutdown complete');
        process.exit(0);
    }
}

// Initialize and start bot
const bot = new WhatsAppGroupBot();

bot.initialize().catch(error => {
    logger.error('Failed to initialize bot:', error);
    process.exit(1);
});

// Handle shutdown signals
process.on('SIGINT', () => bot.cleanup());
process.on('SIGTERM', () => bot.cleanup());

module.exports = bot;
