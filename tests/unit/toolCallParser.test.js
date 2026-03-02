const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    buildToolCallingPrompt,
    buildToolHistory,
    parseToolCalls,
    formatToolCallResponse,
    formatToolCallStreamChunks,
} = require('../../lib/toolCallParser');

const SAMPLE_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'exec',
            description: 'Execute a shell command',
            parameters: {
                type: 'object',
                properties: { command: { type: 'string' } },
                required: ['command'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'read_file',
            description: 'Read a file from disk',
            parameters: {
                type: 'object',
                properties: { path: { type: 'string' } },
                required: ['path'],
            },
        },
    },
];

// ──────────────────────────────────────────────────────────────────
// buildToolCallingPrompt
// ──────────────────────────────────────────────────────────────────
describe('buildToolCallingPrompt', () => {
    it('includes tool names and descriptions', () => {
        const prompt = buildToolCallingPrompt(SAMPLE_TOOLS, []);
        assert.ok(prompt.includes('Tool: exec'));
        assert.ok(prompt.includes('Execute a shell command'));
        assert.ok(prompt.includes('Tool: read_file'));
    });

    it('includes format instructions with <tool_call> tags', () => {
        const prompt = buildToolCallingPrompt(SAMPLE_TOOLS, []);
        assert.ok(prompt.includes('<tool_call>'));
        assert.ok(prompt.includes('</tool_call>'));
    });

    it('includes tool parameters as JSON', () => {
        const prompt = buildToolCallingPrompt(SAMPLE_TOOLS, []);
        assert.ok(prompt.includes('"command"'));
        assert.ok(prompt.includes('"path"'));
    });

    it('includes tool history when assistant had tool_calls', () => {
        const messages = [
            { role: 'user', content: 'list files' },
            {
                role: 'assistant',
                tool_calls: [{
                    id: 'call_abc',
                    type: 'function',
                    function: { name: 'exec', arguments: '{"command":"ls"}' },
                }],
            },
            { role: 'tool', tool_call_id: 'call_abc', content: 'file1.txt\nfile2.txt' },
        ];
        const prompt = buildToolCallingPrompt(SAMPLE_TOOLS, messages);
        assert.ok(prompt.includes('You called tool "exec"'));
        assert.ok(prompt.includes('file1.txt'));
    });

    it('returns prompt without history section when no tool messages', () => {
        const prompt = buildToolCallingPrompt(SAMPLE_TOOLS, [
            { role: 'user', content: 'hello' },
        ]);
        assert.ok(!prompt.includes('Previous tool interactions'));
    });
});

// ──────────────────────────────────────────────────────────────────
// buildToolHistory
// ──────────────────────────────────────────────────────────────────
describe('buildToolHistory', () => {
    it('returns null when no tool messages', () => {
        assert.equal(buildToolHistory([{ role: 'user', content: 'hi' }]), null);
    });

    it('formats assistant tool_calls', () => {
        const result = buildToolHistory([{
            role: 'assistant',
            tool_calls: [{
                function: { name: 'exec', arguments: '{"command":"pwd"}' },
            }],
        }]);
        assert.ok(result.includes('You called tool "exec"'));
        assert.ok(result.includes('pwd'));
    });

    it('formats tool results', () => {
        const result = buildToolHistory([{
            role: 'tool',
            tool_call_id: 'call_123',
            content: '/home/user',
        }]);
        assert.ok(result.includes('Tool result (call_123)'));
        assert.ok(result.includes('/home/user'));
    });
});

// ──────────────────────────────────────────────────────────────────
// parseToolCalls
// ──────────────────────────────────────────────────────────────────
describe('parseToolCalls', () => {
    it('extracts a single tool call', () => {
        const text = '<tool_call>\n{"name": "exec", "arguments": {"command": "ls"}}\n</tool_call>';
        const { toolCalls, textContent } = parseToolCalls(text, SAMPLE_TOOLS);
        assert.equal(toolCalls.length, 1);
        assert.equal(toolCalls[0].function.name, 'exec');
        assert.equal(JSON.parse(toolCalls[0].function.arguments).command, 'ls');
        assert.equal(textContent, null);
    });

    it('extracts multiple tool calls', () => {
        const text = `<tool_call>
{"name": "exec", "arguments": {"command": "ls"}}
</tool_call>
<tool_call>
{"name": "read_file", "arguments": {"path": "/etc/hosts"}}
</tool_call>`;
        const { toolCalls } = parseToolCalls(text, SAMPLE_TOOLS);
        assert.equal(toolCalls.length, 2);
        assert.equal(toolCalls[0].function.name, 'exec');
        assert.equal(toolCalls[1].function.name, 'read_file');
    });

    it('extracts text content outside tool call blocks', () => {
        const text = 'Let me check that for you.\n<tool_call>\n{"name": "exec", "arguments": {"command": "ls"}}\n</tool_call>';
        const { toolCalls, textContent } = parseToolCalls(text, SAMPLE_TOOLS);
        assert.equal(toolCalls.length, 1);
        assert.equal(textContent, 'Let me check that for you.');
    });

    it('returns empty toolCalls for plain text response', () => {
        const text = 'Here is a normal response with no tool calls.';
        const { toolCalls, textContent } = parseToolCalls(text, SAMPLE_TOOLS);
        assert.equal(toolCalls.length, 0);
        assert.equal(textContent, 'Here is a normal response with no tool calls.');
    });

    it('skips malformed JSON inside tool_call blocks', () => {
        const text = '<tool_call>\n{not valid json}\n</tool_call>\n<tool_call>\n{"name": "exec", "arguments": {"command": "ls"}}\n</tool_call>';
        const { toolCalls } = parseToolCalls(text, SAMPLE_TOOLS);
        assert.equal(toolCalls.length, 1);
        assert.equal(toolCalls[0].function.name, 'exec');
    });

    it('skips tool calls with unrecognized names', () => {
        const text = '<tool_call>\n{"name": "nonexistent_tool", "arguments": {}}\n</tool_call>';
        const { toolCalls } = parseToolCalls(text, SAMPLE_TOOLS);
        assert.equal(toolCalls.length, 0);
    });

    it('allows any tool name when tools list is null', () => {
        const text = '<tool_call>\n{"name": "anything", "arguments": {}}\n</tool_call>';
        const { toolCalls } = parseToolCalls(text, null);
        assert.equal(toolCalls.length, 1);
    });

    it('generates unique IDs for each tool call', () => {
        const text = `<tool_call>\n{"name": "exec", "arguments": {"command": "a"}}\n</tool_call>
<tool_call>\n{"name": "exec", "arguments": {"command": "b"}}\n</tool_call>`;
        const { toolCalls } = parseToolCalls(text, SAMPLE_TOOLS);
        assert.notEqual(toolCalls[0].id, toolCalls[1].id);
        assert.ok(toolCalls[0].id.startsWith('call_'));
        assert.ok(toolCalls[1].id.startsWith('call_'));
    });

    it('handles missing arguments gracefully', () => {
        const text = '<tool_call>\n{"name": "exec"}\n</tool_call>';
        const { toolCalls } = parseToolCalls(text, SAMPLE_TOOLS);
        assert.equal(toolCalls.length, 1);
        assert.equal(toolCalls[0].function.arguments, '{}');
    });

    it('skips blocks without a name field', () => {
        const text = '<tool_call>\n{"arguments": {"command": "ls"}}\n</tool_call>';
        const { toolCalls } = parseToolCalls(text, SAMPLE_TOOLS);
        assert.equal(toolCalls.length, 0);
    });
});

// ──────────────────────────────────────────────────────────────────
// formatToolCallResponse
// ──────────────────────────────────────────────────────────────────
describe('formatToolCallResponse', () => {
    const sampleToolCalls = [{
        id: 'call_test123',
        type: 'function',
        function: { name: 'exec', arguments: '{"command":"ls"}' },
    }];

    it('sets finish_reason to tool_calls', () => {
        const resp = formatToolCallResponse({
            toolCalls: sampleToolCalls, textContent: null,
            replyId: 'id', replyCreated: 123, replyFingerprint: 'fp',
            promptTokens: 10, completionTokens: 5,
        });
        assert.equal(resp.choices[0].finish_reason, 'tool_calls');
    });

    it('includes tool_calls in message', () => {
        const resp = formatToolCallResponse({
            toolCalls: sampleToolCalls, textContent: null,
            replyId: 'id', replyCreated: 123, replyFingerprint: 'fp',
            promptTokens: 10, completionTokens: 5,
        });
        assert.equal(resp.choices[0].message.tool_calls.length, 1);
        assert.equal(resp.choices[0].message.tool_calls[0].function.name, 'exec');
    });

    it('sets content to null when no text content', () => {
        const resp = formatToolCallResponse({
            toolCalls: sampleToolCalls, textContent: null,
            replyId: 'id', replyCreated: 123, replyFingerprint: 'fp',
            promptTokens: 10, completionTokens: 5,
        });
        assert.equal(resp.choices[0].message.content, null);
    });

    it('includes text content when present', () => {
        const resp = formatToolCallResponse({
            toolCalls: sampleToolCalls, textContent: 'Let me check.',
            replyId: 'id', replyCreated: 123, replyFingerprint: 'fp',
            promptTokens: 10, completionTokens: 5,
        });
        assert.equal(resp.choices[0].message.content, 'Let me check.');
    });

    it('includes usage stats', () => {
        const resp = formatToolCallResponse({
            toolCalls: sampleToolCalls, textContent: null,
            replyId: 'id', replyCreated: 123, replyFingerprint: 'fp',
            promptTokens: 100, completionTokens: 50,
        });
        assert.equal(resp.usage.total_tokens, 150);
    });
});

// ──────────────────────────────────────────────────────────────────
// formatToolCallStreamChunks
// ──────────────────────────────────────────────────────────────────
describe('formatToolCallStreamChunks', () => {
    const sampleToolCalls = [{
        id: 'call_test123',
        type: 'function',
        function: { name: 'exec', arguments: '{"command":"ls"}' },
    }];

    it('produces chunks ending with finish_reason tool_calls', () => {
        const chunks = formatToolCallStreamChunks({
            toolCalls: sampleToolCalls, textContent: null,
            replyId: 'id', replyCreated: 123, replyFingerprint: 'fp',
            promptTokens: 10, completionTokens: 5,
        });
        const last = chunks[chunks.length - 1];
        assert.equal(last.choices[0].finish_reason, 'tool_calls');
    });

    it('includes tool call start chunk with id and name', () => {
        const chunks = formatToolCallStreamChunks({
            toolCalls: sampleToolCalls, textContent: null,
            replyId: 'id', replyCreated: 123, replyFingerprint: 'fp',
            promptTokens: 10, completionTokens: 5,
        });
        const startChunk = chunks[0];
        const tc = startChunk.choices[0].delta.tool_calls[0];
        assert.equal(tc.id, 'call_test123');
        assert.equal(tc.function.name, 'exec');
    });

    it('includes tool call arguments chunk', () => {
        const chunks = formatToolCallStreamChunks({
            toolCalls: sampleToolCalls, textContent: null,
            replyId: 'id', replyCreated: 123, replyFingerprint: 'fp',
            promptTokens: 10, completionTokens: 5,
        });
        const argsChunk = chunks[1];
        const tc = argsChunk.choices[0].delta.tool_calls[0];
        assert.equal(tc.function.arguments, '{"command":"ls"}');
    });

    it('includes text content chunk before tool calls when present', () => {
        const chunks = formatToolCallStreamChunks({
            toolCalls: sampleToolCalls, textContent: 'Checking...',
            replyId: 'id', replyCreated: 123, replyFingerprint: 'fp',
            promptTokens: 10, completionTokens: 5,
        });
        assert.equal(chunks[0].choices[0].delta.content, 'Checking...');
        // Tool call start is the next chunk
        assert.ok(chunks[1].choices[0].delta.tool_calls);
    });

    it('handles multiple tool calls with correct indices', () => {
        const multiToolCalls = [
            { id: 'call_a', type: 'function', function: { name: 'exec', arguments: '{"command":"ls"}' } },
            { id: 'call_b', type: 'function', function: { name: 'read_file', arguments: '{"path":"/tmp"}' } },
        ];
        const chunks = formatToolCallStreamChunks({
            toolCalls: multiToolCalls, textContent: null,
            replyId: 'id', replyCreated: 123, replyFingerprint: 'fp',
            promptTokens: 10, completionTokens: 5,
        });
        // start_a, args_a, start_b, args_b, finish = 5 chunks
        assert.equal(chunks.length, 5);
        assert.equal(chunks[0].choices[0].delta.tool_calls[0].index, 0);
        assert.equal(chunks[2].choices[0].delta.tool_calls[0].index, 1);
    });
});
