const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createExtractPayload } = require('../../lib/extractPayload');

let extractPayload, tempDir, sessionState;

beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oa-test-'));
    sessionState = { lastSystemContextHash: null };
    extractPayload = createExtractPayload({
        sessionState, tempDir, appendLog: () => {},
    });
});

afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('extractPayload', () => {
    it('returns null when no user messages', () => {
        assert.equal(extractPayload([{ role: 'system', content: 'ctx' }]), null);
    });

    it('handles simple string user message', () => {
        const result = extractPayload([{ role: 'user', content: 'hello' }]);
        assert.equal(result.textPrompt, 'hello');
        assert.equal(result.filesToUpload.length, 0);
    });

    it('uses the last user message when multiple exist', () => {
        const result = extractPayload([
            { role: 'user', content: 'first' },
            { role: 'user', content: 'second' },
        ]);
        assert.equal(result.textPrompt, 'second');
    });

    it('creates file for system context on first call', () => {
        const result = extractPayload([
            { role: 'system', content: 'Be helpful' },
            { role: 'user', content: 'hi' },
        ]);
        assert.equal(result.filesToUpload.length, 1);
        assert.ok(fs.existsSync(result.filesToUpload[0]));
        const content = fs.readFileSync(result.filesToUpload[0], 'utf-8');
        assert.equal(content, 'Be helpful');
    });

    it('deduplicates identical system context', () => {
        const msgs = [
            { role: 'system', content: 'Be helpful' },
            { role: 'user', content: 'hi' },
        ];
        extractPayload(msgs);
        const result = extractPayload(msgs);
        assert.equal(result.filesToUpload.length, 0);
    });

    it('re-uploads when system context changes', () => {
        extractPayload([
            { role: 'system', content: 'version 1' },
            { role: 'user', content: 'hi' },
        ]);
        const result = extractPayload([
            { role: 'system', content: 'version 2' },
            { role: 'user', content: 'hi' },
        ]);
        assert.equal(result.filesToUpload.length, 1);
    });

    it('handles array content with text parts', () => {
        const result = extractPayload([{
            role: 'user',
            content: [{ type: 'text', text: 'part a' }, { type: 'text', text: 'part b' }],
        }]);
        assert.ok(result.textPrompt.includes('part a'));
        assert.ok(result.textPrompt.includes('part b'));
    });

    it('handles base64 image_url', () => {
        const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB';
        const result = extractPayload([{
            role: 'user',
            content: [{
                type: 'image_url',
                image_url: { url: `data:image/png;base64,${tinyPng}` },
            }],
        }]);
        assert.equal(result.filesToUpload.length, 1);
        assert.ok(result.filesToUpload[0].endsWith('.png'));
        assert.ok(fs.existsSync(result.filesToUpload[0]));
    });

    it('handles base64 file_url (OpenClaw extension)', () => {
        const base64Text = Buffer.from('hello world').toString('base64');
        const result = extractPayload([{
            role: 'user',
            content: [{
                type: 'file_url',
                file_url: { url: `data:text/plain;base64,${base64Text}` },
            }],
        }]);
        assert.equal(result.filesToUpload.length, 1);
        assert.ok(fs.existsSync(result.filesToUpload[0]));
        const content = fs.readFileSync(result.filesToUpload[0], 'utf-8');
        assert.equal(content, 'hello world');
    });

    it('strips OpenClaw "System:" lines', () => {
        const result = extractPayload([{
            role: 'user',
            content: 'System: WhatsApp connected.\nHello there',
        }]);
        assert.ok(!result.textPrompt.includes('System:'));
        assert.ok(result.textPrompt.includes('Hello there'));
    });

    it('strips bracketed timestamps', () => {
        const result = extractPayload([{
            role: 'user',
            content: '[Sun 2026-03-01 08:40 GMT+1] hi',
        }]);
        assert.equal(result.textPrompt, 'hi');
    });

    it('converts large prompts (>15000 chars) to file attachment', () => {
        const bigText = 'x'.repeat(16_000);
        const result = extractPayload([{ role: 'user', content: bigText }]);
        assert.equal(result.filesToUpload.length, 1);
        assert.ok(result.textPrompt.includes('attached context'));
    });

    it('returns empty prompt for empty content array', () => {
        const result = extractPayload([{ role: 'user', content: [] }]);
        assert.equal(result.textPrompt, '');
    });
});
