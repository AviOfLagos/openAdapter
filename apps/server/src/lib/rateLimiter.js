/**
 * lib/rateLimiter.js
 *
 * Detects Claude.ai rate limiting from DOM state and response text,
 * and formats the appropriate error response for OpenClaw/OpenAI clients.
 */

/** Patterns seen in Claude's UI when rate limited */
const RATE_LIMIT_PATTERNS = [
    /you[''']ve\s+reached\s+(your\s+)?(usage|message|free|daily)\s+limit/i,
    /you[''']ve\s+hit\s+(the\s+)?(usage|message|free|daily)\s+limit/i,
    /usage\s+limit\s+reached/i,
    /rate\s+limit/i,
    /free\s+messages?\s+(have\s+)?(run|ran)\s+out/i,
    /claude\.ai\s+is\s+at\s+capacity/i,
    /too\s+many\s+requests/i,
    /temporarily\s+unavailable/i,
    /try\s+again\s+in\s+(?:a\s+few\s+minutes?|(\d+)\s+(?:second|minute|hour))/i,
];

/** DOM selectors that Claude uses for error/rate-limit UI */
const RATE_LIMIT_SELECTORS = [
    '[data-testid="rate-limit-message"]',
    '[data-testid="usage-limit-message"]',
    'div.text-danger',
    'div[class*="error-banner"]',
    'div[class*="rate-limit"]',
    // Toast/alert containers
    'div[role="alert"]',
    'div[class*="toast"]',
];

/**
 * Attempts to parse a "try again in X minutes/seconds" from a message.
 * @param {string} text
 * @returns {number} milliseconds to wait, or 60000 as default
 */
function parseRetryAfter(text) {
    const match = text.match(/try\s+again\s+in\s+(\d+)\s+(second|minute|hour)/i);
    if (!match) return 60_000; // default 60 seconds
    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    if (unit.startsWith('second')) return amount * 1000;
    if (unit.startsWith('minute')) return amount * 60 * 1000;
    if (unit.startsWith('hour')) return amount * 60 * 60 * 1000;
    return 60_000;
}

/**
 * Check a response string for rate limit indicators.
 * @param {string} responseText
 * @returns {{ isRateLimit: true, message: string, retryAfterMs: number } | null}
 */
function checkTextForRateLimit(responseText) {
    if (!responseText) return null;
    for (const pattern of RATE_LIMIT_PATTERNS) {
        if (pattern.test(responseText)) {
            return {
                isRateLimit: true,
                message: responseText.trim(),
                retryAfterMs: parseRetryAfter(responseText),
            };
        }
    }
    return null;
}

/**
 * Inspect the page DOM for rate-limit banners / alerts.
 * @param {import('playwright').Page} page
 * @returns {Promise<{ isRateLimit: true, message: string, retryAfterMs: number } | null>}
 */
async function checkDomForRateLimit(page) {
    try {
        for (const selector of RATE_LIMIT_SELECTORS) {
            const elements = await page.$$(selector);
            for (const el of elements) {
                const text = (await el.innerText()).trim();
                if (!text) continue;
                const match = RATE_LIMIT_PATTERNS.some(p => p.test(text));
                if (match) {
                    return {
                        isRateLimit: true,
                        message: text,
                        retryAfterMs: parseRetryAfter(text),
                    };
                }
            }
        }
    } catch (e) {
        // Page may be in a bad state; don't crash the caller
        console.error('[rateLimiter] DOM check failed:', e.message);
    }
    return null;
}

/**
 * Full rate-limit check: DOM first, then response text.
 * @param {import('playwright').Page} page
 * @param {string} responseText
 * @returns {Promise<{ isRateLimit: true, message: string, retryAfterMs: number } | null>}
 */
async function checkRateLimit(page, responseText) {
    const domResult = await checkDomForRateLimit(page);
    if (domResult) return domResult;
    return checkTextForRateLimit(responseText);
}

/**
 * Builds an OpenAI-format rate-limit error body + the appropriate
 * Express response headers/status.
 *
 * @param {object} params
 * @param {import('express').Response} params.res
 * @param {string} params.message  Human-readable rate limit message
 * @param {number} params.retryAfterMs  Milliseconds to wait
 */
function sendRateLimitResponse(res, message, retryAfterMs) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    console.warn(`[rateLimiter] Claude rate limited. Retry after ${retryAfterSec}s.`);
    res.status(429)
        .set('Retry-After', String(retryAfterSec))
        .json({
            error: {
                message: `Claude rate limit reached. ${message || 'Please wait before sending more messages.'}`,
                type: 'rate_limit_error',
                code: 'rate_limit_exceeded',
                retry_after_seconds: retryAfterSec,
            }
        });
}

module.exports = { parseRetryAfter, checkTextForRateLimit, checkRateLimit, sendRateLimitResponse };
