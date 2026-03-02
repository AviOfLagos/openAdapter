const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    parseRetryAfter,
    checkTextForRateLimit,
    sendRateLimitResponse,
} = require('../../src/lib/rateLimiter');

describe('parseRetryAfter', () => {
    it('returns 60000 default when no match', () => {
        assert.equal(parseRetryAfter('something went wrong'), 60_000);
    });

    it('parses seconds', () => {
        assert.equal(parseRetryAfter('try again in 30 seconds'), 30_000);
    });

    it('parses minutes', () => {
        assert.equal(parseRetryAfter('try again in 5 minutes'), 300_000);
    });

    it('parses hours', () => {
        assert.equal(parseRetryAfter('try again in 2 hours'), 7_200_000);
    });

    it('is case insensitive', () => {
        assert.equal(parseRetryAfter('Try Again In 10 Minutes'), 600_000);
    });

    it('works when embedded in longer text', () => {
        assert.equal(
            parseRetryAfter("You've hit the limit. Please try again in 15 minutes."),
            900_000,
        );
    });
});

describe('checkTextForRateLimit', () => {
    it('returns null for null input', () => {
        assert.equal(checkTextForRateLimit(null), null);
    });

    it('returns null for empty string', () => {
        assert.equal(checkTextForRateLimit(''), null);
    });

    it('returns null for normal response text', () => {
        assert.equal(checkTextForRateLimit('Here is a helpful answer about JavaScript.'), null);
    });

    it('detects "usage limit reached"', () => {
        const result = checkTextForRateLimit('usage limit reached');
        assert.equal(result.isRateLimit, true);
    });

    it('detects "too many requests"', () => {
        const result = checkTextForRateLimit('too many requests');
        assert.equal(result.isRateLimit, true);
    });

    it('detects straight apostrophe variant', () => {
        const result = checkTextForRateLimit("you've reached your usage limit");
        assert.notEqual(result, null);
        assert.equal(result.isRateLimit, true);
    });

    it('detects "you\'ve hit the message limit"', () => {
        const result = checkTextForRateLimit("you've hit the message limit");
        assert.notEqual(result, null);
        assert.equal(result.isRateLimit, true);
    });

    it('detects "free messages have run out"', () => {
        const result = checkTextForRateLimit('Your free messages have run out');
        assert.equal(result.isRateLimit, true);
    });

    it('detects "claude.ai is at capacity"', () => {
        const result = checkTextForRateLimit('claude.ai is at capacity');
        assert.equal(result.isRateLimit, true);
    });

    it('detects "temporarily unavailable"', () => {
        const result = checkTextForRateLimit('The service is temporarily unavailable');
        assert.equal(result.isRateLimit, true);
    });

    it('extracts retry time when present', () => {
        const result = checkTextForRateLimit('rate limit. try again in 5 minutes');
        assert.equal(result.retryAfterMs, 300_000);
    });

    it('uses default retry when no time specified', () => {
        const result = checkTextForRateLimit('too many requests');
        assert.equal(result.retryAfterMs, 60_000);
    });
});

describe('sendRateLimitResponse', () => {
    function mockRes() {
        const r = {
            statusCode: null, headers: {}, body: null,
            status(code) { r.statusCode = code; return r; },
            set(k, v) { r.headers[k] = v; return r; },
            json(body) { r.body = body; return r; },
        };
        return r;
    }

    it('sets 429 status', () => {
        const res = mockRes();
        sendRateLimitResponse(res, 'limit hit', 60_000);
        assert.equal(res.statusCode, 429);
    });

    it('sets Retry-After header in seconds', () => {
        const res = mockRes();
        sendRateLimitResponse(res, 'limit', 90_000);
        assert.equal(res.headers['Retry-After'], '90');
    });

    it('rounds Retry-After up', () => {
        const res = mockRes();
        sendRateLimitResponse(res, 'limit', 1500);
        assert.equal(res.headers['Retry-After'], '2');
    });

    it('body has correct error type and code', () => {
        const res = mockRes();
        sendRateLimitResponse(res, 'msg', 60_000);
        assert.equal(res.body.error.type, 'rate_limit_error');
        assert.equal(res.body.error.code, 'rate_limit_exceeded');
    });

    it('body includes the custom message', () => {
        const res = mockRes();
        sendRateLimitResponse(res, 'custom msg', 60_000);
        assert.ok(res.body.error.message.includes('custom msg'));
    });
});
