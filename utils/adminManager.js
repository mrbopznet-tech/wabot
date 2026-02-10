const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const config = require('../config');

const ADMINS_FILE = path.join(__dirname, '..', 'admins.json');

/**
 * Admin Manager
 * Handles admin list storage and validation
 * Supports both super admins (from .env) and dynamic admins (from JSON)
 */
class AdminManager {
    constructor() {
        this.superAdmins = config.admins || [];
        this.dynamicAdmins = this.loadDynamicAdmins();
    }

    /**
     * Load dynamic admins from JSON file
     */
    loadDynamicAdmins() {
        try {
            if (fs.existsSync(ADMINS_FILE)) {
                const data = fs.readFileSync(ADMINS_FILE, 'utf8');
                const parsed = JSON.parse(data);
                return parsed.admins || [];
            }
            return [];
        } catch (error) {
            logger.error('Failed to load admins.json:', error.message);
            return [];
        }
    }

    /**
     * Save dynamic admins to JSON file
     */
    saveDynamicAdmins() {
        try {
            const data = {
                admins: this.dynamicAdmins,
                lastUpdated: new Date().toISOString()
            };
            fs.writeFileSync(ADMINS_FILE, JSON.stringify(data, null, 2));
            logger.info('Admin list saved to admins.json');
            return true;
        } catch (error) {
            logger.error('Failed to save admins.json:', error.message);
            return false;
        }
    }

    /**
     * Extract phone number from JID
     * Examples: 
     * - 628xxx@s.whatsapp.net -> 628xxx
     * - 628xxx@lid -> 628xxx
     * - 628xxx -> 628xxx
     */
    extractPhoneFromJid(jid) {
        if (!jid) return null;
        return jid.split('@')[0];
    }

    /**
     * Normalize JID format
     * Ensures consistent format for comparison
     */
    normalizeJid(jid) {
        if (!jid) return null;

        // If already has @, keep it
        if (jid.includes('@')) {
            return jid;
        }

        // If just phone number, add @s.whatsapp.net
        return `${jid}@s.whatsapp.net`;
    }

    /**
     * Check if user is admin (super OR dynamic)
     * Accepts JID or phone number
     */
    isAdmin(jid) {
        const phone = this.extractPhoneFromJid(jid);
        const normalizedJid = this.normalizeJid(jid);

        // Check super admins (phone only, from .env)
        if (this.superAdmins.includes(phone)) {
            return true;
        }

        // Check dynamic admins (supports both JID and phone)
        return this.dynamicAdmins.some(admin => {
            const adminPhone = this.extractPhoneFromJid(admin);
            const adminNormalized = this.normalizeJid(admin);

            return adminPhone === phone || adminNormalized === normalizedJid;
        });
    }

    /**
     * Check if user is super admin (cannot be removed)
     */
    isSuperAdmin(jid) {
        const phone = this.extractPhoneFromJid(jid);
        return this.superAdmins.includes(phone);
    }

    /**
     * Add new admin to dynamic list
     * Returns: { success: boolean, message: string }
     */
    addAdmin(jid) {
        const normalizedJid = this.normalizeJid(jid);
        const phone = this.extractPhoneFromJid(jid);

        // Check if already admin
        if (this.isAdmin(normalizedJid)) {
            return {
                success: false,
                message: `${phone} sudah menjadi admin`
            };
        }

        // Add to dynamic list
        this.dynamicAdmins.push(normalizedJid);

        // Save to file
        if (this.saveDynamicAdmins()) {
            logger.info(`New admin added: ${normalizedJid}`);
            return {
                success: true,
                message: `✅ ${phone} berhasil ditambahkan sebagai admin`
            };
        } else {
            // Rollback if save failed
            this.dynamicAdmins = this.dynamicAdmins.filter(a => a !== normalizedJid);
            return {
                success: false,
                message: '❌ Gagal menyimpan admin baru'
            };
        }
    }

    /**
     * Remove admin from dynamic list
     * Returns: { success: boolean, message: string }
     */
    removeAdmin(jid) {
        const normalizedJid = this.normalizeJid(jid);
        const phone = this.extractPhoneFromJid(jid);

        // Cannot remove super admin
        if (this.isSuperAdmin(normalizedJid)) {
            return {
                success: false,
                message: `❌ ${phone} adalah Super Admin dan tidak bisa dihapus`
            };
        }

        // Check if admin exists
        if (!this.isAdmin(normalizedJid)) {
            return {
                success: false,
                message: `❌ ${phone} bukan admin`
            };
        }

        // Remove from dynamic list
        const beforeLength = this.dynamicAdmins.length;
        this.dynamicAdmins = this.dynamicAdmins.filter(admin => {
            const adminPhone = this.extractPhoneFromJid(admin);
            return adminPhone !== phone;
        });

        // Check if actually removed
        if (this.dynamicAdmins.length === beforeLength) {
            return {
                success: false,
                message: `❌ Gagal menghapus admin ${phone}`
            };
        }

        // Save to file
        if (this.saveDynamicAdmins()) {
            logger.info(`Admin removed: ${normalizedJid}`);
            return {
                success: true,
                message: `✅ ${phone} berhasil dihapus dari admin`
            };
        } else {
            // Rollback if save failed
            this.dynamicAdmins.push(normalizedJid);
            return {
                success: false,
                message: '❌ Gagal menyimpan perubahan'
            };
        }
    }

    /**
     * Get all admins (super + dynamic)
     * Returns formatted list
     */
    getAllAdmins() {
        const all = [];

        // Add super admins
        this.superAdmins.forEach(phone => {
            all.push({
                jid: `${phone}@s.whatsapp.net`,
                phone: phone,
                type: 'Super Admin'
            });
        });

        // Add dynamic admins
        this.dynamicAdmins.forEach(jid => {
            const phone = this.extractPhoneFromJid(jid);
            // Skip if already in super admins
            if (!this.superAdmins.includes(phone)) {
                all.push({
                    jid: jid,
                    phone: phone,
                    type: 'Admin'
                });
            }
        });

        return all;
    }
}

// Export singleton instance
module.exports = new AdminManager();
