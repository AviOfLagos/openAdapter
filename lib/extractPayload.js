const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

/**
 * Creates an extractPayload function with injected dependencies.
 *
 * @param {object} deps
 * @param {object} deps.sessionState  Shared mutable state (needs .lastSystemContextHash)
 * @param {string} deps.tempDir       Directory for temporary file uploads
 * @param {Function} deps.appendLog   Logging function
 * @returns {Function} extractPayload(messages) => { textPrompt, filesToUpload } | null
 */
function createExtractPayload({ sessionState, tempDir, appendLog }) {
    return function extractPayload(messages) {
        const latestMessage = messages.filter(m => m.role === 'user').pop();
        const systemMessages = messages.filter(m => m.role === 'system');
        if (!latestMessage) return null;

        // Collect tool-related messages for tool calling context replay
        const toolMessages = messages.filter(
            m => m.role === 'tool' || (m.role === 'assistant' && m.tool_calls)
        );

        let textPrompt = "";
        const filesToUpload = [];

        // Deduplicate system context using hash stored in sessionState
        if (systemMessages.length > 0) {
            const fullSystemText = systemMessages.map(m => m.content).join('\n\n');
            const contextHash = crypto.createHash('md5').update(fullSystemText).digest('hex');
            if (contextHash !== sessionState.lastSystemContextHash) {
                appendLog(`[server] System context changed (hash: ${contextHash.slice(0, 8)}), uploading new attachment.`);
                const filename = `system_context_${contextHash.slice(0, 8)}.md`;
                const filepath = path.join(tempDir, filename);
                fs.writeFileSync(filepath, fullSystemText);
                filesToUpload.push(filepath);
                sessionState.lastSystemContextHash = contextHash;
                textPrompt += "[SYSTEM NOTE: Please read the attached 'system_context' file for your core instructions, available tools, and current workspace file contents like HEARTBEAT.md before responding.]\n\n";
            } else {
                appendLog('[server] System context unchanged, skipping duplicate upload.');
            }
        }

        // Handle string format
        if (typeof latestMessage.content === 'string') {
            textPrompt += latestMessage.content;
        }
        // Handle array of objects format (multimodal / OpenClaw)
        else if (Array.isArray(latestMessage.content)) {
            for (const part of latestMessage.content) {
                if (part.type === 'text') {
                    textPrompt += part.text + "\n";
                } else if (part.type === 'image_url') {
                    const urlMatch = part.image_url?.url?.match(/^data:(.*?);base64,(.*)$/);
                    if (urlMatch) {
                        const mimeType = urlMatch[1];
                        const base64Data = urlMatch[2];
                        const ext = mime.extension(mimeType) || 'bin';
                        const filename = `upload_${crypto.randomBytes(4).toString('hex')}.${ext}`;
                        const filepath = path.join(tempDir, filename);
                        fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
                        filesToUpload.push(filepath);
                    }
                } else if (part.type === 'file_url') {
                    const urlMatch = part.file_url?.url?.match(/^data:(.*?);base64,(.*)$/);
                    if (urlMatch) {
                        const mimeType = urlMatch[1];
                        const base64Data = urlMatch[2];
                        const ext = mime.extension(mimeType) || 'txt';
                        const filename = `file_${crypto.randomBytes(4).toString('hex')}.${ext}`;
                        const filepath = path.join(tempDir, filename);
                        fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
                        filesToUpload.push(filepath);
                    }
                }
            }
        }

        // --- OpenClaw Cleanups ---
        textPrompt = textPrompt.replace(/^System:.*$/gm, '');
        textPrompt = textPrompt.replace(/^\[.*?\]\s*/gm, '');

        // Check if text itself is huge (> 15000 chars), convert to attachment
        if (textPrompt.length > 15000) {
            appendLog(`[server] Prompt is very large (${textPrompt.length} chars), converting to file.`);
            const filename = `long_context_${crypto.randomBytes(4).toString('hex')}.txt`;
            const filepath = path.join(tempDir, filename);
            fs.writeFileSync(filepath, textPrompt);
            filesToUpload.push(filepath);
            textPrompt = "Please read the attached context document and acknowledge.";
        }

        return { textPrompt: textPrompt.trim(), filesToUpload, toolMessages };
    };
}

module.exports = { createExtractPayload };
