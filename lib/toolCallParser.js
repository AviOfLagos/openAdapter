/**
 * lib/toolCallParser.js
 *
 * Enables tool calling through Claude's web UI by:
 * 1. Injecting tool definitions into the prompt with XML output format instructions
 * 2. Parsing <tool_call> XML blocks from Claude's text response
 * 3. Converting parsed tool calls into OpenAI-format tool_calls responses
 */

const crypto = require('crypto');

/**
 * Build a prompt that instructs Claude to use tools via <tool_call> XML blocks.
 *
 * @param {Array} tools  OpenAI-format tools array
 * @param {Array} messages  Full message history (for tool call context replay)
 * @returns {string} Augmented prompt text to prepend
 */
function buildToolCallingPrompt(tools, messages) {
    const parts = [];

    // Tool definitions
    parts.push('You have access to the following tools:\n');
    for (const tool of tools) {
        const fn = tool.function || tool;
        parts.push(`Tool: ${fn.name}`);
        if (fn.description) parts.push(`Description: ${fn.description}`);
        parts.push(`Parameters: ${JSON.stringify(fn.parameters)}`);
        parts.push('');
    }

    // Format instructions
    parts.push('When you need to call a tool, output EXACTLY this format:');
    parts.push('');
    parts.push('<tool_call>');
    parts.push('{"name": "tool_name", "arguments": {"param1": "value1"}}');
    parts.push('</tool_call>');
    parts.push('');
    parts.push('You may call multiple tools by using multiple <tool_call> blocks.');
    parts.push('If you do not need to call any tool, respond normally without <tool_call> tags.');
    parts.push('Do NOT include any explanation or commentary alongside tool call blocks.');
    parts.push('');

    // Replay tool call history from previous messages
    const toolHistory = buildToolHistory(messages);
    if (toolHistory) {
        parts.push('--- Previous tool interactions ---');
        parts.push(toolHistory);
        parts.push('--- End of tool interactions ---');
        parts.push('');
    }

    return parts.join('\n');
}

/**
 * Convert assistant tool_calls and tool result messages into readable context.
 *
 * @param {Array} messages  Full message history
 * @returns {string|null} Tool history text, or null if none
 */
function buildToolHistory(messages) {
    const parts = [];

    for (const msg of messages) {
        if (msg.role === 'assistant' && msg.tool_calls) {
            for (const tc of msg.tool_calls) {
                const fn = tc.function || {};
                let args = fn.arguments;
                if (typeof args === 'string') {
                    try { args = JSON.parse(args); } catch { /* keep as string */ }
                }
                parts.push(`You called tool "${fn.name}" with arguments: ${JSON.stringify(args)}`);
            }
        } else if (msg.role === 'tool') {
            const id = msg.tool_call_id || 'unknown';
            parts.push(`Tool result (${id}): ${msg.content}`);
        }
    }

    return parts.length > 0 ? parts.join('\n') : null;
}

/**
 * Parse <tool_call> XML blocks from Claude's response text.
 *
 * @param {string} responseText  Raw response from Claude
 * @param {Array|null} tools  Available tools (for name validation), or null to skip validation
 * @returns {{ toolCalls: Array, textContent: string|null }}
 */
function parseToolCalls(responseText, tools) {
    const regex = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g;
    const toolCalls = [];
    let match;

    while ((match = regex.exec(responseText)) !== null) {
        try {
            const parsed = JSON.parse(match[1]);
            if (!parsed.name) continue;

            // Validate tool name if tools list provided
            if (tools && tools.length > 0) {
                const validNames = tools.map(t => (t.function || t).name);
                if (!validNames.includes(parsed.name)) continue;
            }

            toolCalls.push({
                id: 'call_' + crypto.randomBytes(12).toString('hex'),
                type: 'function',
                function: {
                    name: parsed.name,
                    arguments: JSON.stringify(parsed.arguments || {}),
                },
            });
        } catch {
            // Malformed JSON inside <tool_call> — skip this block
            continue;
        }
    }

    // Extract text content outside of <tool_call> blocks
    const textContent = responseText
        .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
        .trim() || null;

    return { toolCalls, textContent };
}

/**
 * Build an OpenAI-format non-streaming response with tool calls.
 */
function formatToolCallResponse({ toolCalls, textContent, replyId, replyCreated, replyFingerprint, promptTokens, completionTokens }) {
    return {
        id: replyId,
        object: 'chat.completion',
        created: replyCreated,
        model: 'claude-3-5-sonnet',
        system_fingerprint: replyFingerprint,
        choices: [{
            index: 0,
            message: {
                role: 'assistant',
                content: textContent,
                tool_calls: toolCalls,
            },
            logprobs: null,
            finish_reason: 'tool_calls',
        }],
        usage: {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: promptTokens + completionTokens,
        },
    };
}

/**
 * Build SSE chunks for a streaming tool call response.
 * Returns an array of JSON objects to be sent as `data: ${JSON.stringify(chunk)}\n\n`.
 */
function formatToolCallStreamChunks({ toolCalls, textContent, replyId, replyCreated, replyFingerprint, promptTokens, completionTokens }) {
    const chunks = [];

    // If there's text content, send it first
    if (textContent) {
        chunks.push({
            id: replyId,
            object: 'chat.completion.chunk',
            created: replyCreated,
            model: 'claude-3-5-sonnet',
            system_fingerprint: replyFingerprint,
            choices: [{
                index: 0,
                delta: { role: 'assistant', content: textContent },
                logprobs: null,
                finish_reason: null,
            }],
        });
    }

    // Emit each tool call
    for (let i = 0; i < toolCalls.length; i++) {
        const tc = toolCalls[i];

        // Tool call start: id, name, empty arguments
        chunks.push({
            id: replyId,
            object: 'chat.completion.chunk',
            created: replyCreated,
            model: 'claude-3-5-sonnet',
            system_fingerprint: replyFingerprint,
            choices: [{
                index: 0,
                delta: {
                    tool_calls: [{
                        index: i,
                        id: tc.id,
                        type: 'function',
                        function: { name: tc.function.name, arguments: '' },
                    }],
                },
                logprobs: null,
                finish_reason: null,
            }],
        });

        // Tool call arguments
        chunks.push({
            id: replyId,
            object: 'chat.completion.chunk',
            created: replyCreated,
            model: 'claude-3-5-sonnet',
            system_fingerprint: replyFingerprint,
            choices: [{
                index: 0,
                delta: {
                    tool_calls: [{
                        index: i,
                        function: { arguments: tc.function.arguments },
                    }],
                },
                logprobs: null,
                finish_reason: null,
            }],
        });
    }

    // Finish chunk
    chunks.push({
        id: replyId,
        object: 'chat.completion.chunk',
        created: replyCreated,
        model: 'claude-3-5-sonnet',
        system_fingerprint: replyFingerprint,
        choices: [{
            index: 0,
            delta: {},
            logprobs: null,
            finish_reason: 'tool_calls',
        }],
        usage: {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: promptTokens + completionTokens,
        },
    });

    return chunks;
}

module.exports = {
    buildToolCallingPrompt,
    buildToolHistory,
    parseToolCalls,
    formatToolCallResponse,
    formatToolCallStreamChunks,
};
