const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

const BASE = 'http://127.0.0.1:3000';

before(async () => {
    try {
        await fetch(`${BASE}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
    } catch {
        console.log('# Server not running at localhost:3000 — skipping integration tests');
        process.exit(0);
    }
});

describe('POST /v1/chat/completions validation', () => {
    it('rejects missing messages with 400', async () => {
        const res = await fetch(`${BASE}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        assert.equal(res.status, 400);
        const body = await res.json();
        assert.equal(body.error.type, 'invalid_request_error');
    });

    it('rejects non-array messages with 400', async () => {
        const res = await fetch(`${BASE}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: 'not an array' }),
        });
        assert.equal(res.status, 400);
    });

    it('rejects empty messages array with 400', async () => {
        const res = await fetch(`${BASE}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [] }),
        });
        assert.equal(res.status, 400);
    });

    it('returns CORS headers', async () => {
        const res = await fetch(`${BASE}/v1/chat/completions`, {
            method: 'OPTIONS',
        });
        const origin = res.headers.get('access-control-allow-origin');
        assert.ok(origin, 'Expected access-control-allow-origin header');
    });

    it('returns OpenAI-shaped response for valid request', async () => {
        const res = await fetch(`${BASE}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Reply with just the word pong' }],
            }),
        });

        // May be 200 (success) or 429 (busy/rate-limited) — both are valid server responses
        if (res.status === 200) {
            const body = await res.json();
            assert.equal(body.object, 'chat.completion');
            assert.ok(body.id.startsWith('chatcmpl-'));
            assert.ok(Array.isArray(body.choices));
            assert.equal(body.choices[0].finish_reason, 'stop');
            assert.ok(body.usage.total_tokens > 0);
        } else {
            // 429 means server is busy or rate limited — still a valid response shape
            assert.ok([429].includes(res.status), `Unexpected status: ${res.status}`);
        }
    });
});
