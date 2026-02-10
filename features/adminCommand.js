const adminManager = require('../utils/adminManager');
const logger = require('../utils/logger');

/**
 * Admin Management Commands
 * Allows admins to manage other admins
 */
module.exports = {
    name: 'adminCommands',
    description: 'Manage bot administrators',
    enabled: true,

    async handleMessage(message, api) {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const fromJid = message.key.remoteJid;
        const senderJid = message.key.participant || message.key.remoteJid;

        // Check if sender is admin
        if (!adminManager.isAdmin(senderJid)) {
            // Only show error for admin commands, not for /cekid
            if (!text.toLowerCase().startsWith('/cekid')) {
                return;
            }
        }

        // /cekid - Show sender's WhatsApp ID (available to everyone)
        if (text.toLowerCase().startsWith('/cekid')) {
            const phone = adminManager.extractPhoneFromJid(senderJid);
            const isAdmin = adminManager.isAdmin(senderJid);
            const isSuperAdmin = adminManager.isSuperAdmin(senderJid);

            let role = 'User';
            if (isSuperAdmin) role = '👑 Super Admin';
            else if (isAdmin) role = '⭐ Admin';

            const response = `📱 *ID WhatsApp Anda*\n\n` +
                `JID: \`${senderJid}\`\n` +
                `Phone: \`${phone}\`\n` +
                `Role: ${role}`;

            await api.sendText(fromJid, response);
            logger.info(`/cekid command executed by ${phone}`);
            return;
        }

        // Below commands require admin permission
        if (!adminManager.isAdmin(senderJid)) {
            return;
        }

        // /listadmin - List all admins
        if (text.toLowerCase().startsWith('/listadmin')) {
            const admins = adminManager.getAllAdmins();

            if (admins.length === 0) {
                await api.sendText(fromJid, '📋 Tidak ada admin terdaftar');
                return;
            }

            let response = `👥 *Daftar Admin Bot*\n\n`;
            admins.forEach((admin, index) => {
                const icon = admin.type === 'Super Admin' ? '👑' : '⭐';
                response += `${index + 1}. ${icon} ${admin.phone}\n`;
                response += `   ${admin.type}\n`;
                response += `   \`${admin.jid}\`\n\n`;
            });

            response += `_Total: ${admins.length} admin_`;
            await api.sendText(fromJid, response);
            logger.info(`/listadmin command executed by ${senderJid}`);
            return;
        }

        // /addadmin - Add new admin
        if (text.toLowerCase().startsWith('/addadmin')) {
            // Check if replying to a message
            if (message.quotedMsg && message.quotedMsg.participant) {
                const targetJid = message.quotedMsg.participant;
                const result = adminManager.addAdmin(targetJid);

                logger.info(`Admin add attempt by ${senderJid}: ${result.message}`);
                await api.sendText(fromJid, result.message);
                return;
            }

            // Extract JID/phone from command
            const args = text.split(/\s+/);
            if (args.length < 2) {
                await api.sendText(fromJid,
                    `❌ *Format salah!*\n\n` +
                    `Cara 1: Reply pesan user dengan caption:\n` +
                    `\`/addadmin\`\n\n` +
                    `Cara 2: Kirim dengan ID:\n` +
                    `\`/addadmin <phone/jid>\`\n\n` +
                    `Contoh:\n` +
                    `\`/addadmin 628123456789\`\n` +
                    `\`/addadmin 628123456789@s.whatsapp.net\``
                );
                return;
            }

            const targetJid = args[1];
            const result = adminManager.addAdmin(targetJid);

            logger.info(`Admin add attempt by ${senderJid}: ${result.message}`);
            await api.sendText(fromJid, result.message);
            return;
        }

        // /deladmin - Remove admin
        if (text.toLowerCase().startsWith('/deladmin')) {
            // Check if replying to a message
            if (message.quotedMsg && message.quotedMsg.participant) {
                const targetJid = message.quotedMsg.participant;
                const result = adminManager.removeAdmin(targetJid);

                logger.info(`Admin remove attempt by ${senderJid}: ${result.message}`);
                await api.sendText(fromJid, result.message);
                return;
            }

            // Extract JID/phone from command
            const args = text.split(/\s+/);
            if (args.length < 2) {
                await api.sendText(fromJid,
                    `❌ *Format salah!*\n\n` +
                    `Cara 1: Reply pesan admin yang mau dihapus dengan caption:\n` +
                    `\`/deladmin\`\n\n` +
                    `Cara 2: Kirim dengan ID:\n` +
                    `\`/deladmin <phone/jid>\`\n\n` +
                    `Contoh:\n` +
                    `\`/deladmin 628123456789\`\n` +
                    `\`/deladmin 628123456789@s.whatsapp.net\`\n\n` +
                    `⚠️ Super Admin tidak bisa dihapus`
                );
                return;
            }

            const targetJid = args[1];
            const result = adminManager.removeAdmin(targetJid);

            logger.info(`Admin remove attempt by ${senderJid}: ${result.message}`);
            await api.sendText(fromJid, result.message);
            return;
        }
    }
};
