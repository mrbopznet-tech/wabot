const logger = require('../utils/logger');
const config = require('../config');

module.exports = {
    name: 'help',
    enabled: config.features.help.enabled,
    commands: config.features.help.commands,

    /**
     * Handle incoming message
     */
    async handleMessage(message, api) {
        // Check if message is a help command
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';

        if (!this.commands.some(cmd => text.trim().startsWith(cmd))) {
            return; // Not a help command
        }

        logger.info(`Help command triggered by ${message.key.remoteJid}`);

        const helpText = this.generateHelpText();

        try {
            await api.sendText(message.key.remoteJid, helpText);
            logger.info('Help message sent successfully');
        } catch (error) {
            logger.error('Failed to send help message:', error);
        }
    },

    /**
     * Generate help text
     */
    generateHelpText() {
        const lines = [
            '📋 *Daftar Command Bot*\n',
            '*Command untuk Semua Member:*',
            `${config.features.help.commands[0]} - Tampilkan bantuan ini`,
            `/cekid - Lihat ID WhatsApp Anda\n`
        ];

        // Add admin commands
        const adminCommands = [];

        if (config.features.tagall.enabled) {
            adminCommands.push(`${config.features.tagall.commands[0]} <pesan> - Mention semua member`);
        }

        adminCommands.push('/blast - Kirim pesan blast dengan template\n');

        adminCommands.push('*Admin Management:*');
        adminCommands.push('/listadmin - Lihat daftar admin');
        adminCommands.push('/addadmin <id> - Tambah admin baru');
        adminCommands.push('/deladmin <id> - Hapus admin');

        if (adminCommands.length > 0) {
            lines.push('*Command untuk Admin:*');
            lines.push(...adminCommands);
        }

        lines.push('\n_Bot by dev.mrsnapz.net_');

        return lines.join('\n');
    }
};
