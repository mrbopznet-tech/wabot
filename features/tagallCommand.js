const logger = require('../utils/logger');
const config = require('../config');
const adminManager = require('../utils/adminManager');

module.exports = {
    name: 'tagall',
    enabled: config.features.tagall.enabled,
    commands: config.features.tagall.commands,

    /**
     * Handle incoming message
     */
    async handleMessage(message, api) {
        if (!this.enabled) return;

        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const fromJid = message.key.remoteJid;
        const senderJid = message.key.participant || message.key.remoteJid;

        // Check if message is a tagall command
        const isCommand = this.commands.some(cmd => text.trim().startsWith(cmd));
        if (!isCommand) return;

        // Only work in groups
        if (!fromJid.endsWith('@g.us')) {
            await api.sendText(fromJid, '⚠️ Command ini hanya bisa digunakan di grup!');
            return;
        }

        logger.info(`Tagall command triggered in ${fromJid} by ${senderJid}`);

        // Check if admin only
        if (config.features.tagall.adminOnly) {
            // Check bot admin OR group admin
            const isBotAdmin = adminManager.isAdmin(senderJid);
            const isGroupAdmin = await this.isGroupAdmin(senderJid, fromJid, api);

            if (!isBotAdmin && !isGroupAdmin) {
                await api.sendText(fromJid, '⚠️ Hanya admin yang bisa menggunakan command ini!');
                logger.warn(`Non-admin ${senderJid} tried to use tagall`);
                return;
            }
        }

        try {
            // Get all group participants
            const participants = await api.getGroupParticipants(fromJid);

            if (!participants || participants.length === 0) {
                await api.sendText(fromJid, '❌ Gagal mendapatkan daftar member.');
                return;
            }

            // Extract custom message (text after command)
            const commandUsed = this.commands.find(cmd => text.trim().startsWith(cmd));
            const customMessage = text.substring(commandUsed.length).trim();

            // Create mentions (prefer phoneNumber over id for LID users)
            const participantIds = participants.map(p => p.phoneNumber || p.id);

            // Hidden Tag Implementation:
            // We pass participantIds to sendMentions, but we DO NOT include them in the text body.
            // This creates a "Ghost Mention" or "Hidetag".

            // Build message
            const finalMessage = customMessage
                ? customMessage
                : '📢 *Perhatian semua!*';

            // Send message with mentions
            await api.sendMentions(fromJid, finalMessage, participantIds);

            logger.info(`Tagged all ${participantIds.length} members in ${fromJid}`);
        } catch (error) {
            logger.error(`Failed to tagall in ${fromJid}:`, error);
            await api.sendText(fromJid, '❌ Gagal mention semua member. Coba lagi nanti.');
        }
    },

    /**
     * Check if user is group admin
     */
    async isGroupAdmin(userJid, groupJid, api) {
        try {
            const isGroupAdmin = await api.isGroupAdmin(groupJid, userJid);
            if (isGroupAdmin) {
                const phoneNumber = userJid.split('@')[0].replace(/:\d+/, '');
                logger.info(`User ${phoneNumber} is a group admin`);
            }
            return isGroupAdmin;
        } catch (error) {
            logger.error('Failed to check group admin status:', error);
            return false;
        }
    }
};
