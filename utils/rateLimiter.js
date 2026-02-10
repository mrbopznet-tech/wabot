const logger = require('./logger');

/**
 * Rate Limiter
 * Prevents spam by limiting commands per user per time window
 */
class RateLimiter {
    constructor(maxRequests = 10, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.userHistory = new Map(); // userId -> [timestamps]

        // Cleanup old entries every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);

        logger.info(`Rate limiter initialized: ${maxRequests} requests per ${windowMs}ms`);
    }

    /**
     * Check if user is rate limited
     * @param {string} userId - User identifier (JID)
     * @returns {Object} { isLimited: boolean, retryAfter: number }
     */
    check(userId) {
        const now = Date.now();
        const userRequests = this.userHistory.get(userId) || [];

        // Filter requests within current window
        const recentRequests = userRequests.filter(timestamp => {
            return now - timestamp < this.windowMs;
        });

        // Check if limit exceeded
        if (recentRequests.length >= this.maxRequests) {
            const oldestRequest = Math.min(...recentRequests);
            const retryAfter = Math.ceil((oldestRequest + this.windowMs - now) / 1000);

            logger.warn(`Rate limit exceeded for ${userId}: ${recentRequests.length}/${this.maxRequests} requests`);

            return {
                isLimited: true,
                retryAfter: retryAfter
            };
        }

        // Add current request
        recentRequests.push(now);
        this.userHistory.set(userId, recentRequests);

        return {
            isLimited: false,
            retryAfter: 0,
            remaining: this.maxRequests - recentRequests.length
        };
    }

    /**
     * Reset rate limit for specific user
     * @param {string} userId - User identifier
     */
    reset(userId) {
        this.userHistory.delete(userId);
        logger.info(`Rate limit reset for ${userId}`);
    }

    /**
     * Clean up old entries from memory
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [userId, timestamps] of this.userHistory.entries()) {
            const recentRequests = timestamps.filter(timestamp => {
                return now - timestamp < this.windowMs;
            });

            if (recentRequests.length === 0) {
                this.userHistory.delete(userId);
                cleaned++;
            } else {
                this.userHistory.set(userId, recentRequests);
            }
        }

        if (cleaned > 0) {
            logger.debug(`Rate limiter cleanup: removed ${cleaned} inactive users`);
        }
    }

    /**
     * Get current status for user
     * @param {string} userId - User identifier
     * @returns {Object} { requests: number, resetAt: Date }
     */
    getStatus(userId) {
        const now = Date.now();
        const userRequests = this.userHistory.get(userId) || [];

        const recentRequests = userRequests.filter(timestamp => {
            return now - timestamp < this.windowMs;
        });

        if (recentRequests.length === 0) {
            return {
                requests: 0,
                remaining: this.maxRequests,
                resetAt: null
            };
        }

        const oldestRequest = Math.min(...recentRequests);
        const resetAt = new Date(oldestRequest + this.windowMs);

        return {
            requests: recentRequests.length,
            remaining: Math.max(0, this.maxRequests - recentRequests.length),
            resetAt: resetAt
        };
    }

    /**
     * Destroy rate limiter and cleanup interval
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.userHistory.clear();
        logger.info('Rate limiter destroyed');
    }
}

module.exports = RateLimiter;
