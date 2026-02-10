const axios = require('axios');
const logger = require('./logger');

class EvolutionAPI {
    constructor(apiUrl, apiKey, instanceName) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
        this.instanceName = instanceName;
        this.client = axios.create({
            baseURL: apiUrl,
            headers: {
                'apikey': apiKey,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Send text message
     */
    async sendText(to, text) {
        try {
            const payload = {
                number: to,
                text: text
            };
            logger.debug(`Sending message to ${to}:`, JSON.stringify(payload));

            const response = await this.client.post(`/message/sendText/${this.instanceName}`, payload);
            logger.info(`Message sent to ${to}`);
            return response.data;
        } catch (error) {
            const errorDetails = error.response?.data || error.message;
            logger.error(`Failed to send message to ${to}:`, JSON.stringify(errorDetails, null, 2));
            throw error;
        }
    }

    /**
     * Send message with mentions
     */
    async sendMentions(to, text, mentions) {
        try {
            const response = await this.client.post(`/message/sendText/${this.instanceName}`, {
                number: to,
                text: text,
                options: {
                    mentions: mentions
                }
            });
            logger.info(`Message with mentions sent to ${to}`);
            return response.data;
        } catch (error) {
            logger.error(`Failed to send mentions to ${to}:`, error.message);
            throw error;
        }
    }

    /**
     * Get group participants
     */
    async getGroupParticipants(groupId) {
        try {
            const response = await this.client.get(`/group/participants/${this.instanceName}`, {
                params: { groupJid: groupId }
            });
            logger.info(`Participants API Response for ${groupId}: ${JSON.stringify(response.data).substring(0, 200)}...`);

            // Handle various Evolution API response formats
            if (Array.isArray(response.data)) return response.data;
            if (Array.isArray(response.data?.data)) return response.data.data;
            if (Array.isArray(response.data?.participants)) return response.data.participants;

            return [];
        } catch (error) {
            logger.error(`Failed to get group participants for ${groupId}:`, error.message);
            throw error;
        }
    }

    /**
     * Get group metadata
     */
    async getGroupMetadata(groupId) {
        try {
            const response = await this.client.get(`/group/metadata/${this.instanceName}`, {
                params: { groupJid: groupId }
            });
            return response.data;
        } catch (error) {
            logger.error(`Failed to get group metadata for ${groupId}:`, error.message);
            throw error;
        }
    }

    /**
     * Check if user is group admin
     */
    async isGroupAdmin(groupId, userId) {
        try {
            const participants = await this.getGroupParticipants(groupId);
            const user = participants.find(p => p.id === userId);
            return user && (user.admin === 'admin' || user.admin === 'superadmin');
        } catch (error) {
            logger.error(`Failed to check admin status:`, error.message);
            return false;
        }
    }

    /**
     * Send typing indicator
     * Note: This may not be supported by all Evolution API versions
     */
    async sendTyping(to, duration = 3000) {
        try {
            // Try Evolution API v2 endpoint for presence/typing
            await this.client.post(`/chat/sendPresence/${this.instanceName}`, {
                number: to,
                presence: 'composing',
                delay: duration
            });
            logger.debug(`Typing indicator sent to ${to}`);
        } catch (error) {
            // Typing is optional - don't log error, just skip silently
            // This prevents log spam if Evolution API doesn't support this feature
            logger.debug(`Typing indicator not sent to ${to} (feature may not be supported)`);
            // Don't throw, typing is optional
        }
    }

    /**
     * Set webhook URL
     */
    async setWebhook(webhookUrl) {
        try {
            const response = await this.client.post(`/webhook/set/${this.instanceName}`, {
                webhook: {
                    enabled: true,
                    url: webhookUrl,
                    webhookByEvents: true,
                    events: [
                        'QRCODE_UPDATED',
                        'MESSAGES_UPSERT',
                        'MESSAGES_UPDATE',
                        'GROUP_PARTICIPANTS_UPDATE',
                        'GROUP_UPDATE',
                        'CONNECTION_UPDATE'
                    ]
                }
            });
            logger.info(`Webhook set to ${webhookUrl}`);
            return response.data;
        } catch (error) {
            logger.error(`Failed to set webhook:`, error.message);
            throw error;
        }
    }


}

module.exports = EvolutionAPI;
