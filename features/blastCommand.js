const logger = require('../utils/logger');
const config = require('../config');
const adminManager = require('../utils/adminManager');

module.exports = {
    name: 'blast',
    enabled: true,
    commands: ['/blast'],

    /**
     * Handle incoming message
     */
    async handleMessage(message, api) {
        if (!this.enabled) return;

        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const fromJid = message.key.remoteJid;
        const senderJid = message.key.participant || message.key.remoteJid;

        // Check if message is a blast command
        const isCommand = this.commands.some(cmd => text.trim().startsWith(cmd));
        if (!isCommand) return;

        logger.info(`Blast command triggered in ${fromJid} by ${senderJid}`);

        // Check if sender is admin
        if (!adminManager.isAdmin(senderJid)) {
            await api.sendText(fromJid, '⚠️ Hanya admin yang bisa menggunakan fitur blast!');
            logger.warn(`Non-admin ${senderJid} tried to use blast`);
            return;
        }

        try {
            // Parse blast message
            const blastData = this.parseBlastMessage(text);

            if (!blastData) {
                await api.sendText(fromJid, '❌ Format blast salah!\n\nContoh:\n/blast\n\npesan:\nHallo {nama} ini test pesan blast\n\ntarget:\nbop dev/62882000300327\nanna fiyaa/62881234578');
                return;
            }

            const { template, targets } = blastData;

            if (targets.length === 0) {
                await api.sendText(fromJid, '❌ Tidak ada target yang ditemukan!');
                return;
            }

            // Check maximum limit (anti-ban protection)
            const MAX_TARGETS = config.features.blast.maxTargets;
            if (targets.length > MAX_TARGETS) {
                await api.sendText(fromJid, `⚠️ Target melebihi batas maksimal!\n\n` +
                    `📊 Target: ${targets.length}\n` +
                    `🔒 Maksimal: ${MAX_TARGETS} per blast\n\n` +
                    `💡 Silakan kurangi target atau bagi menjadi beberapa blast untuk menghindari banned.`);
                return;
            }

            // Calculate estimated time
            const minTime = Math.ceil(targets.length * 5 / 60); // 5 seconds average
            const maxTime = Math.ceil(targets.length * 10 / 60); // 10 seconds average

            // Send confirmation
            await api.sendText(fromJid, `📤 Mengirim blast ke ${targets.length} kontak...\n\n` +
                `⏱️ Estimasi waktu: ${minTime}-${maxTime} menit\n` +
                `🛡️ Mode: Safe (delay 3-8 detik + typing)`);

            // Send messages to each target
            let successCount = 0;
            let failCount = 0;
            const failedContacts = [];

            for (const target of targets) {
                try {
                    // Replace {nama} placeholder with actual name
                    const personalizedMessage = template.replace(/\{nama\}/g, target.name);

                    // Format phone number to WhatsApp JID
                    const targetJid = this.formatPhoneToJid(target.phone);

                    // Random delay before message (3-8 seconds) - more natural
                    const randomDelay = this.getRandomDelay(config.features.blast.minDelay, config.features.blast.maxDelay);
                    await this.delay(randomDelay);

                    // Send message
                    await api.sendText(targetJid, personalizedMessage);
                    successCount++;

                    logger.info(`Blast sent to ${target.name} (${target.phone}) with ${randomDelay}ms delay`);
                } catch (error) {
                    failCount++;
                    failedContacts.push({ name: target.name, phone: target.phone });
                    logger.error(`Failed to send blast to ${target.name} (${target.phone}):`, error.message);
                }
            }

            // Build summary message
            let summary = `✅ Blast selesai!\n\n` +
                `✓ Berhasil: ${successCount}\n` +
                `✗ Gagal: ${failCount}\n` +
                `📊 Total: ${targets.length}`;

            // Add failed contacts list if any
            if (failedContacts.length > 0) {
                summary += `\n\n⚠️ *Kontak yang gagal:*\n`;
                failedContacts.forEach((contact, index) => {
                    summary += `${index + 1}. ${contact.name} / ${contact.phone}\n`;
                });
                summary += `\n💡 Silakan follow-up manual ke kontak di atas.`;
            }

            await api.sendText(fromJid, summary);

        } catch (error) {
            logger.error(`Failed to process blast command:`, error);
            await api.sendText(fromJid, '❌ Gagal menjalankan blast. Coba lagi nanti.');
        }
    },

    /**
     * Parse blast message format
     * Expected format:
     * /blast
     * 
     * pesan:
     * Hallo {nama} ini test pesan blast
     * 
     * target:
     * bop dev/62882000300327
     * anna fiyaa/62881234578
     */
    parseBlastMessage(text) {
        try {
            // Remove command from text
            const content = text.replace(/^\/blast/i, '').trim();

            // Split by "pesan:" and "target:"
            const pesanMatch = content.match(/pesan:\s*([\s\S]*?)(?=target:|$)/i);
            const targetMatch = content.match(/target:\s*([\s\S]*?)$/i);

            if (!pesanMatch || !targetMatch) {
                return null;
            }

            const template = pesanMatch[1].trim();
            const targetText = targetMatch[1].trim();

            if (!template || !targetText) {
                return null;
            }

            // Parse targets - flexible format support
            // Supports: "name/phone" or "name phone" or "name  phone" or "name\tphone"
            const targets = [];
            const lines = targetText.split('\n');

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                let name, phone;

                // Try to parse with / separator first
                if (trimmed.includes('/')) {
                    const parts = trimmed.split('/');
                    name = parts[0].trim();
                    phone = parts.slice(1).join('').trim(); // Handle multiple slashes
                    logger.debug(`Parsed with '/': name="${name}", phone="${phone}"`);
                } else {
                    // Parse with whitespace separator (space or tab)
                    // Replace multiple spaces/tabs with single space, then split
                    const normalized = trimmed.replace(/\s+/g, ' ');
                    const parts = normalized.split(' ');

                    if (parts.length >= 2) {
                        // Last part is phone, rest is name
                        phone = parts[parts.length - 1].trim();
                        name = parts.slice(0, -1).join(' ').trim();
                        logger.debug(`Parsed with space: name="${name}", phone="${phone}"`);
                    } else {
                        logger.warn(`Cannot parse line (not enough parts): "${trimmed}"`);
                    }
                }

                // Validate and add if both name and phone exist
                if (name && phone && this.isValidPhoneNumber(phone)) {
                    targets.push({ name, phone });
                    logger.info(`✓ Added target: ${name} / ${phone}`);
                } else if (name && phone) {
                    logger.warn(`✗ Invalid phone format for ${name}: ${phone}`);
                } else {
                    logger.warn(`✗ Failed to parse: name="${name}", phone="${phone}"`);
                }
            }

            return { template, targets };
        } catch (error) {
            logger.error('Failed to parse blast message:', error);
            return null;
        }
    },

    /**
     * Validate if string is a valid phone number
     */
    isValidPhoneNumber(phone) {
        // Remove all non-digit characters
        const digitsOnly = phone.replace(/\D/g, '');

        // Valid Indonesian phone: at least 8 digits
        return digitsOnly.length >= 8 && digitsOnly.length <= 15;
    },

    /**
     * Format phone number to WhatsApp JID (Indonesian format)
     * Handles: 08xxx, 628xxx, +628xxx, 8xxx
     */
    formatPhoneToJid(phone) {
        // Remove any non-digit characters (+, -, spaces, etc)
        let cleanPhone = phone.replace(/\D/g, '');

        // Normalize to 628xxx format
        if (cleanPhone.startsWith('08')) {
            // 08xxx -> 628xxx
            cleanPhone = '62' + cleanPhone.substring(1);
        } else if (cleanPhone.startsWith('8') && cleanPhone.length >= 9) {
            // 8xxx -> 628xxx (only if length suggests it's missing 62)
            cleanPhone = '62' + cleanPhone;
        } else if (!cleanPhone.startsWith('62')) {
            // If doesn't start with 62, add it
            cleanPhone = '62' + cleanPhone;
        }

        // Evolution API handles the @s.whatsapp.net automatically
        return cleanPhone;
    },

    /**
     * Get random delay between min and max (in milliseconds)
     */
    getRandomDelay(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
