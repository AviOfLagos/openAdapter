/**
 * tests/unit/managementController.test.js
 *
 * Unit tests for the management controller module.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
    stats,
    trackRequest,
} = require('../../src/lib/managementController');

describe('managementController', () => {
    describe('trackRequest', () => {
        it('should increment totalRequests on any request', () => {
            const before = stats.totalRequests;
            trackRequest(true, false);
            assert.strictEqual(stats.totalRequests, before + 1);
        });

        it('should increment successfulRequests on success', () => {
            const before = stats.successfulRequests;
            trackRequest(true, false);
            assert.strictEqual(stats.successfulRequests, before + 1);
        });

        it('should increment failedRequests on failure', () => {
            const before = stats.failedRequests;
            trackRequest(false, false);
            assert.strictEqual(stats.failedRequests, before + 1);
        });

        it('should increment rateLimitHits when rate limited', () => {
            const before = stats.rateLimitHits;
            trackRequest(false, true);
            assert.strictEqual(stats.rateLimitHits, before + 1);
        });

        it('should update lastRequestTime', () => {
            const before = Date.now();
            trackRequest(true, false);
            assert.ok(stats.lastRequestTime >= before);
        });
    });
});
