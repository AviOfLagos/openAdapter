/**
 * tests/integration/management.test.js
 *
 * Integration tests for management API endpoints.
 * Requires the server to be running at http://127.0.0.1:3000
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const BASE_URL = 'http://127.0.0.1:3000';

describe('Management API Integration', () => {
    describe('GET /admin/health', () => {
        it('should return health status with all expected fields', async () => {
            const res = await fetch(`${BASE_URL}/admin/health`);
            assert.strictEqual(res.status, 200);

            const data = await res.json();
            assert.ok(data.status);
            assert.ok(data.timestamp);
            assert.ok(data.uptime);
            assert.ok(data.browser);
            assert.ok(data.stats);

            // Check uptime structure
            assert.ok(typeof data.uptime.ms === 'number');
            assert.ok(typeof data.uptime.human === 'string');

            // Check browser structure
            assert.ok(typeof data.browser.alive === 'boolean');
            assert.ok(typeof data.browser.contextExists === 'boolean');

            // Check stats structure
            assert.ok(typeof data.stats.totalRequests === 'number');
            assert.ok(typeof data.stats.successfulRequests === 'number');
            assert.ok(typeof data.stats.failedRequests === 'number');
        });
    });

    describe('GET /admin/status', () => {
        it('should return simple status check', async () => {
            const res = await fetch(`${BASE_URL}/admin/status`);
            assert.strictEqual(res.status, 200);

            const data = await res.json();
            assert.ok(data.status);
            assert.ok(['healthy', 'degraded'].includes(data.status));
            assert.ok(data.timestamp);
            assert.ok(['online', 'offline'].includes(data.browser));
        });
    });

    describe('GET /admin/config', () => {
        it('should return server configuration', async () => {
            const res = await fetch(`${BASE_URL}/admin/config`);
            assert.strictEqual(res.status, 200);

            const data = await res.json();
            assert.strictEqual(data.port, 3000);
            assert.ok(data.timeouts);
            assert.ok(data.limits);
            assert.ok(data.paths);

            // Verify expected timeout values
            assert.strictEqual(data.timeouts.maxTimeout, 180000);
            assert.strictEqual(data.timeouts.sessionTimeout, 3600000);
        });
    });

    describe('GET /admin/logs', () => {
        it('should return logs with default limit', async () => {
            const res = await fetch(`${BASE_URL}/admin/logs`);
            assert.strictEqual(res.status, 200);

            const data = await res.json();
            assert.ok(Array.isArray(data.logs));
            assert.ok(typeof data.totalLines === 'number');
            assert.ok(typeof data.returned === 'number');
        });

        it('should respect lines query parameter', async () => {
            const res = await fetch(`${BASE_URL}/admin/logs?lines=10`);
            assert.strictEqual(res.status, 200);

            const data = await res.json();
            assert.ok(data.logs.length <= 10);
        });
    });

    describe('POST /admin/session/new-chat', () => {
        it('should accept new chat request', async () => {
            const res = await fetch(`${BASE_URL}/admin/session/new-chat`, {
                method: 'POST',
            });

            // Should either succeed or fail with proper error
            assert.ok([200, 400, 500].includes(res.status));

            const data = await res.json();
            assert.ok(typeof data.success === 'boolean');

            if (res.status === 200) {
                assert.strictEqual(data.success, true);
                assert.ok(data.message);
            }
        });
    });
});
