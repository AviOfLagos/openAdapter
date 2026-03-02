/**
 * lib/managementController.js
 *
 * Remote management API endpoints for controlling the OpenAdapter server.
 * Provides health checks, session management, log access, and system control.
 */

const fs = require('fs');
const path = require('path');
const { state: sessionState, isPageAlive, recoverSession } = require('./sessionManager');

const LOG_FILE = path.join(__dirname, '..', 'logs.txt');

// Server stats tracking
const stats = {
    startTime: Date.now(),
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    rateLimitHits: 0,
    lastRequestTime: null,
    sessionRestarts: 0,
};

/**
 * Middleware to increment request counters
 */
function trackRequest(success = true, rateLimited = false) {
    stats.totalRequests++;
    stats.lastRequestTime = Date.now();
    if (success) stats.successfulRequests++;
    else stats.failedRequests++;
    if (rateLimited) stats.rateLimitHits++;
}

/**
 * GET /admin/health
 * Returns comprehensive health status
 */
async function getHealth(req, res) {
    const browserAlive = await isPageAlive(sessionState.activePage);
    const uptime = Date.now() - stats.startTime;

    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: {
            ms: uptime,
            human: formatUptime(uptime),
        },
        browser: {
            alive: browserAlive,
            contextExists: !!sessionState.browserContext,
            pageExists: !!sessionState.activePage,
            lastUsed: sessionState.sessionLastUsed
                ? new Date(sessionState.sessionLastUsed).toISOString()
                : null,
            sessionAge: sessionState.sessionLastUsed
                ? Date.now() - sessionState.sessionLastUsed
                : null,
        },
        stats: {
            totalRequests: stats.totalRequests,
            successfulRequests: stats.successfulRequests,
            failedRequests: stats.failedRequests,
            rateLimitHits: stats.rateLimitHits,
            sessionRestarts: stats.sessionRestarts,
            lastRequestTime: stats.lastRequestTime
                ? new Date(stats.lastRequestTime).toISOString()
                : null,
        },
    };

    res.json(health);
}

/**
 * GET /admin/status
 * Returns simple status check (for monitoring tools)
 */
async function getStatus(req, res) {
    const browserAlive = await isPageAlive(sessionState.activePage);
    res.json({
        status: browserAlive ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        browser: browserAlive ? 'online' : 'offline',
    });
}

/**
 * POST /admin/session/restart
 * Force browser session restart
 */
async function restartSession(req, res, appendLog) {
    try {
        appendLog('[management] Admin requested session restart');
        stats.sessionRestarts++;

        // Close existing browser
        if (sessionState.browserContext) {
            try {
                await sessionState.browserContext.close();
            } catch (e) {
                appendLog('[management] Error closing browser: ' + e.message);
            }
        }

        // Reset session state
        sessionState.browserContext = null;
        sessionState.activePage = null;
        sessionState.lastSystemContextHash = null;
        sessionState.sessionLastUsed = 0;

        appendLog('[management] Session state cleared. Will reinitialize on next request.');

        res.json({
            success: true,
            message: 'Browser session cleared. New session will start on next request.',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        appendLog('[management] Session restart failed: ' + err.message);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
}

/**
 * POST /admin/session/recover
 * Trigger multi-tier session recovery
 */
async function triggerRecovery(req, res, appendLog) {
    try {
        appendLog('[management] Admin requested session recovery');
        const page = await recoverSession(appendLog);

        if (page) {
            res.json({
                success: true,
                message: 'Session recovery succeeded',
                timestamp: new Date().toISOString(),
            });
        } else {
            res.status(503).json({
                success: false,
                error: 'Session recovery failed at all levels',
                timestamp: new Date().toISOString(),
            });
        }
    } catch (err) {
        appendLog('[management] Session recovery error: ' + err.message);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
}

/**
 * POST /admin/session/new-chat
 * Force navigation to new chat (preserves browser)
 */
async function forceNewChat(req, res, appendLog) {
    try {
        if (!sessionState.activePage) {
            return res.status(400).json({
                success: false,
                error: 'No active browser session',
            });
        }

        appendLog('[management] Admin requested new chat navigation');
        sessionState.lastSystemContextHash = null;

        await sessionState.activePage.goto('https://claude.ai/new', {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
        });

        sessionState.sessionLastUsed = Date.now();

        res.json({
            success: true,
            message: 'Navigated to new chat',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        appendLog('[management] New chat navigation failed: ' + err.message);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
}

/**
 * GET /admin/logs
 * Retrieve recent log entries
 */
function getLogs(req, res) {
    try {
        const lines = parseInt(req.query.lines) || 100;

        if (!fs.existsSync(LOG_FILE)) {
            return res.json({
                logs: [],
                message: 'Log file does not exist yet',
            });
        }

        const logContent = fs.readFileSync(LOG_FILE, 'utf-8');
        const logLines = logContent.split('\n').filter(line => line.trim());
        const recentLogs = logLines.slice(-lines);

        res.json({
            totalLines: logLines.length,
            returned: recentLogs.length,
            logs: recentLogs,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
}

/**
 * DELETE /admin/logs
 * Clear log file
 */
function clearLogs(req, res, appendLog) {
    try {
        if (fs.existsSync(LOG_FILE)) {
            fs.unlinkSync(LOG_FILE);
        }

        appendLog('[management] Log file cleared by admin');

        res.json({
            success: true,
            message: 'Logs cleared',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
}

/**
 * GET /admin/config
 * Get current server configuration
 */
function getConfig(req, res) {
    res.json({
        port: 3000,
        timeouts: {
            maxTimeout: 180000,
            stableInterval: 30000,
            sessionTimeout: 3600000,
            pollInterval: 500,
        },
        limits: {
            largePromptThreshold: 15000,
            maxPayloadSize: '100mb',
        },
        paths: {
            tempDir: path.join(__dirname, '..', 'temp_uploads'),
            browserProfile: path.join(__dirname, '..', '.browser-profile'),
            logFile: LOG_FILE,
        },
    });
}

/**
 * Helper: Format uptime in human-readable format
 */
function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

module.exports = {
    stats,
    trackRequest,
    getHealth,
    getStatus,
    restartSession,
    triggerRecovery,
    forceNewChat,
    getLogs,
    clearLogs,
    getConfig,
};
