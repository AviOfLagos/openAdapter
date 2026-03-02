const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { htmlToMarkdown } = require('./lib/htmlToMd');
const { checkRateLimit, sendRateLimitResponse } = require('./lib/rateLimiter');
const { state: sessionState, isPageAlive, recoverSession, getOrInitPage } = require('./lib/sessionManager');
const { createExtractPayload } = require('./lib/extractPayload');
const {
    stats: requestStats,
    trackRequest,
    getHealth,
    getStatus,
    restartSession,
    triggerRecovery,
    forceNewChat,
    getLogs,
    clearLogs,
    getConfig,
} = require('./lib/managementController');

const app = express();
// Increase parsing limits for base64 images/files
app.use(express.json({ limit: '100mb' }));
app.use(cors());

// --- Payload Logging Middleware ---
const LOG_FILE = path.join(__dirname, "..", "logs.txt");
function appendLog(str) {
    console.log(str);
    try { fs.appendFileSync(LOG_FILE, str + "\n"); } catch (e) { }
}

app.use((req, res, next) => {
    appendLog(`\n=== [INCOMING REQUEST] ${req.method} ${req.url} ===`);
    if (req.body) {
        appendLog(JSON.stringify(req.body, null, 2));
    }
    appendLog("=========================================\n");

    // Intercept res.json to log outgoing responses
    const originalJson = res.json;
    res.json = function (body) {
        appendLog(`\n=== [OUTGOING RESPONSE] ===`);
        appendLog(JSON.stringify(body, null, 2));
        appendLog("===========================\n");
        return originalJson.call(this, body);
    };
    next();
});

const PORT = process.env.PORT || 3001;
const MAX_TIMEOUT_MS = 180_000;
const STABLE_INTERVAL_MS = 30000;
const POLL_MS = 500;
const TEMP_DIR = path.join(__dirname, '..', 'temp_uploads');
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

// Ensure temp dir exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Generate a stable isGenerating flag (not in sessionState — request-scoped)
let isGenerating = false;

const extractPayload = createExtractPayload({ sessionState, tempDir: TEMP_DIR, appendLog });

// ──────────────────────────────────────────────────────────────────
// Management API Authentication (optional)
// ──────────────────────────────────────────────────────────────────
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || null;

function adminAuth(req, res, next) {
    // If no API key is set, allow all requests (for local use)
    if (!ADMIN_API_KEY) {
        return next();
    }

    const authHeader = req.headers.authorization;
    const providedKey = authHeader?.replace(/^Bearer\s+/i, '');

    if (providedKey === ADMIN_API_KEY) {
        return next();
    }

    res.status(401).json({
        error: {
            message: 'Unauthorized - invalid or missing API key',
            type: 'authentication_error',
        },
    });
}

// ──────────────────────────────────────────────────────────────────
// Management API Endpoints
// ──────────────────────────────────────────────────────────────────
app.get('/admin/health', adminAuth, (req, res) => getHealth(req, res));
app.get('/admin/status', adminAuth, (req, res) => getStatus(req, res));
app.post('/admin/session/restart', adminAuth, (req, res) => restartSession(req, res, appendLog));
app.post('/admin/session/recover', adminAuth, (req, res) => triggerRecovery(req, res, appendLog));
app.post('/admin/session/new-chat', adminAuth, (req, res) => forceNewChat(req, res, appendLog));
app.get('/admin/logs', adminAuth, (req, res) => getLogs(req, res));
app.delete('/admin/logs', adminAuth, (req, res) => clearLogs(req, res, appendLog));
app.get('/admin/config', adminAuth, (req, res) => getConfig(req, res));

// ──────────────────────────────────────────────────────────────────
// Selector chains  (used throughout for robust element finding)
// ──────────────────────────────────────────────────────────────────
const SELECTOR_CHAINS = {
    promptInput: [
        'div[contenteditable="true"]',
        'div[role="textbox"]',
        '[contenteditable="true"][translate="no"]',
        'fieldset div[contenteditable="true"]',
    ],
    sendButton: [
        'button[aria-label*="Send"]',
        'button[data-testid="send-button"]',
    ],
    stopButton: [
        'button[aria-label*="Stop"]',
        'button[data-testid="stop-button"]',
    ],
    responseBlocks: [
        'div[data-testid*="message"]:not([data-testid="user-message"])',
        'div.font-claude-response',
        'div[class*="font-claude-response"]',
        'div.font-claude-message',
        'div[class*="font-claude-message"]',
    ],
    fileInput: [
        'input[type="file"]'
    ],
};

// DOM Helpers
async function findElement(page, chainKey) {
    const selectors = SELECTOR_CHAINS[chainKey];
    for (const sel of selectors) {
        const el = await page.$(sel);
        if (el) return { el, selector: sel };
    }
    return { el: null, selector: selectors[0] };
}

async function findAllElements(page, chainKey) {
    const selectors = SELECTOR_CHAINS[chainKey];
    for (const sel of selectors) {
        const els = await page.$$(sel);
        if (els.length > 0) return { els, selector: sel };
    }
    return { els: [], selector: selectors[0] };
}

async function waitForAny(page, chainKey, opts = {}) {
    const selectors = SELECTOR_CHAINS[chainKey];
    const combined = selectors.join(', ');
    return page.waitForSelector(combined, { timeout: opts.timeout || 30_000, ...opts });
}

/**
 * Extract the latest Claude response as rich Markdown.
 * Uses page.evaluate() to run the htmlToMarkdown converter in-browser
 * for accurate table / checklist / code-block conversion.
 * Falls back to innerText() if evaluate fails.
 */
async function extractLatestResponse(page, prevMessageCount) {
    const { els: blocks } = await findAllElements(page, 'responseBlocks');
    if (blocks.length <= prevMessageCount) return null;
    const latest = blocks[blocks.length - 1];

    try {
        // Run the in-browser DOM→Markdown converter
        const md = await page.evaluate(htmlToMarkdown, latest);
        if (md && md.trim()) return md.trim();
    } catch (e) {
        appendLog(`[server] htmlToMarkdown eval failed (${e.message}), falling back to innerText`);
    }
    // Fallback
    return (await latest.innerText()).trim();
}


async function waitForCompletion(page, prevMessageCount, onChunk = null) {
    const deadline = Date.now() + MAX_TIMEOUT_MS;
    let lastContent = "";
    let lastChangeTime = Date.now();

    while (Date.now() < deadline) {
        let currentContent = await extractLatestResponse(page, prevMessageCount) || "";

        // Stream the diff if a callback is provided
        if (currentContent && currentContent.length > lastContent.length) {
            if (onChunk) {
                const diff = currentContent.slice(lastContent.length);
                onChunk(diff);
            }
            lastContent = currentContent;
            lastChangeTime = Date.now();
        }

        const { el: stopBtn } = await findElement(page, "stopButton");
        if (!stopBtn) {
            const { els: currentMessages } = await findAllElements(page, "responseBlocks");
            if (currentMessages.length > prevMessageCount) {
                await page.waitForTimeout(500);
                // Do one final read to catch anything emitted right at the end
                currentContent = await extractLatestResponse(page, prevMessageCount) || "";
                if (currentContent && currentContent.length > lastContent.length && onChunk) {
                    onChunk(currentContent.slice(lastContent.length));
                }
                return currentContent;
            }
        }

        if (currentContent && (Date.now() - lastChangeTime > STABLE_INTERVAL_MS)) {
            console.log("[server] Generation stabilized after long pause, assuming complete.");
            return currentContent; // Return stability instead of generic void
        }

        await page.waitForTimeout(POLL_MS);
    }
    console.warn("[server] WARNING: Generation timeout reached.");
    return lastContent;
}

app.post('/v1/chat/completions', async (req, res) => {
    if (isGenerating) {
        return res.status(429).json({ error: { message: 'Adapter is busy with another request. Please wait.', type: 'rate_limit_error' } });
    }

    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: { message: 'Invalid request', type: 'invalid_request_error' } });
    }

    const payload = extractPayload(messages);
    if (!payload || (!payload.textPrompt && payload.filesToUpload.length === 0)) {
        return res.status(400).json({ error: { message: 'Empty prompt', type: 'invalid_request_error' } });
    }

    const { textPrompt, filesToUpload } = payload;
    appendLog(`[server] Processing prompt (${textPrompt.length} chars) with ${filesToUpload.length} attachments`);

    isGenerating = true;

    try {
        // ── Get/recover page ───────────────────────────────────────────────
        let page = await getOrInitPage(appendLog, SESSION_TIMEOUT_MS);

        // Health check: if page is dead, attempt multi-tier recovery
        if (!(await isPageAlive(page))) {
            appendLog('[server] Page health check failed. Starting recovery...');
            page = await recoverSession(appendLog);
            if (!page) {
                return res.status(503).json({
                    error: {
                        message: 'Claude browser session could not be recovered. Please restart the adapter.',
                        type: 'server_error',
                        code: 'session_recovery_failed',
                    }
                });
            }
        }

        // Wait for input
        const inputHandle = await waitForAny(page, "promptInput", { timeout: 15_000, state: "visible" });
        const { el: inputEl } = await findElement(page, "promptInput");

        // Upload files if any
        if (filesToUpload.length > 0) {
            console.log(`[server] Uploading ${filesToUpload.length} files...`);
            const { el: fileInput } = await findElement(page, "fileInput");
            if (fileInput) {
                await fileInput.setInputFiles(filesToUpload);
                // Wait for uploads to process visibly in UI (rough estimate)
                await page.waitForTimeout(1000 * filesToUpload.length);
            } else {
                console.warn("[server] Could not find file input element.");
            }
        }

        // Insert prompt
        const { els: prevMessages } = await findAllElements(page, "responseBlocks");
        const prevCount = prevMessages.length;

        await inputEl.click();

        // Using evaluate is sometimes safer than fill() for contenteditable
        await page.evaluate(({ el, text }) => {
            el.innerText = text;
        }, { el: inputEl, text: textPrompt || "Please see attached file." });

        // Type a space to trigger react events, then enter to send
        await inputEl.type(' ');
        await page.waitForTimeout(300);

        const { el: sendBtn } = await findElement(page, "sendButton");
        if (sendBtn) {
            await sendBtn.click();
        } else {
            await page.keyboard.press("Enter");
        }

        // Wait for start
        await page.waitForTimeout(1000);

        // Setup basic variables
        const replyId = "chatcmpl-" + crypto.randomBytes(8).toString('hex');
        const replyFingerprint = "fp_" + crypto.randomBytes(6).toString('hex');
        const replyCreated = Math.floor(Date.now() / 1000);

        if (req.body.stream) {
            console.log("[server] Streaming response via SSE using real-time listener...");
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
        }

        let fullGeneratedText = "";

        // Wait for completion and handle real-time chunking
        console.log("[server] Waiting for response and streaming...");
        fullGeneratedText = await waitForCompletion(page, prevCount, (chunkText) => {
            if (req.body.stream) {
                const streamChunk = {
                    id: replyId,
                    object: "chat.completion.chunk",
                    created: replyCreated,
                    model: "claude-3-5-sonnet",
                    system_fingerprint: replyFingerprint,
                    choices: [{ index: 0, delta: { role: "assistant", content: chunkText }, logprobs: null, finish_reason: null }]
                };
                res.write(`data: ${JSON.stringify(streamChunk)}\n\n`);
            }
        });

        const responseText = fullGeneratedText || await extractLatestResponse(page, prevCount);

        if (!responseText) {
            throw new Error('Failed to extract response text.');
        }

        // ── Rate limit check ───────────────────────────────────────────────
        const rateLimitResult = await checkRateLimit(page, responseText);
        if (rateLimitResult) {
            // Clean up temp files
            for (const file of filesToUpload) { try { fs.unlinkSync(file); } catch { } }
            trackRequest(false, true);
            sendRateLimitResponse(res, rateLimitResult.message, rateLimitResult.retryAfterMs);
            return;
        }

        appendLog(`[server] Success (${responseText.length} chars)`);
        trackRequest(true, false);

        // Cleanup temp files
        for (const file of filesToUpload) {
            try { fs.unlinkSync(file); } catch (e) { }
        }

        const baseTokenCount = {
            prompt_tokens: Math.max(1, Math.floor(textPrompt.length / 4)),
            completion_tokens: Math.max(1, Math.floor(responseText.length / 4)),
            total_tokens: Math.max(2, Math.floor((textPrompt.length + responseText.length) / 4))
        };

        if (req.body.stream) {
            // Send the finish chunk
            const finishChunk = {
                id: replyId,
                object: "chat.completion.chunk",
                created: replyCreated,
                model: "claude-3-5-sonnet",
                system_fingerprint: replyFingerprint,
                choices: [{ index: 0, delta: {}, logprobs: null, finish_reason: "stop" }],
                usage: baseTokenCount
            };
            res.write(`data: ${JSON.stringify(finishChunk)}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
            appendLog(`\n=== [OUTGOING STREAM RESPONSE SENT] ===\n`);
        } else {
            const response = {
                id: replyId,
                object: "chat.completion",
                created: replyCreated,
                model: "claude-3-5-sonnet",
                system_fingerprint: replyFingerprint,
                choices: [{ index: 0, message: { role: "assistant", content: responseText.trim() }, logprobs: null, finish_reason: "stop" }],
                usage: baseTokenCount
            };
            res.json(response);
            appendLog(`\n=== [OUTGOING RESPONSE] ===\n${JSON.stringify(response, null, 2)}\n===========================\n`);
        }
    } catch (err) {
        console.error(`[server] Error:`, err);
        trackRequest(false, false);
        res.status(500).json({ error: { message: `Gateway error: ${err.message}`, type: 'server_error' } });
    } finally {
        isGenerating = false;
    }
});

const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`Claude Local API Server listening at http://127.0.0.1:${PORT}`);
});

// Increase HTTP server limits to 10 minutes to prevent OpenClaw socket disconnects
// during long Claude generations.
server.setTimeout(600000);
server.keepAliveTimeout = 600000;
server.headersTimeout = 600000;
