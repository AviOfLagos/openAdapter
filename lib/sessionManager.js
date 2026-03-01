/**
 * lib/sessionManager.js
 *
 * Manages the Playwright browser lifecycle and implements multi-tier
 * session recovery when the Claude tab becomes unresponsive.
 *
 * Recovery levels:
 *  L0 – isPageAlive()   : Simple JS eval test
 *  L1 – reloadPage()    : page.reload()
 *  L2 – newChat()       : navigate to CLAUDE_URL (fresh conversation)
 *  L3 – restartBrowser(): close context + re-launch full Playwright
 *  L4 – FATAL           : return false so caller can send 503
 */

const { chromium } = require('playwright');
const path = require('path');

const CLAUDE_URL = 'https://claude.ai/new';
const USER_DATA_DIR = path.join(__dirname, '..', '.browser-profile');
const HEALTH_TIMEOUT_MS = 5_000; // Max time for a "is the page alive?" check

/**
 * Shared mutable state — exported so server.js can set/reset.
 * We use a plain object so mutations are visible to both sides.
 */
const state = {
    browserContext: null,
    activePage: null,
    lastSystemContextHash: null,
    sessionLastUsed: 0,
};

/** Launch a fresh Playwright persistent context */
async function launchBrowser(log) {
    log('[sessionManager] Launching new browser context...');
    const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: false,
        viewport: { width: 1280, height: 900 },
        args: ['--disable-blink-features=AutomationControlled'],
    });

    ctx.on('close', () => {
        log('[sessionManager] Browser context closed externally. Will re-init on next request.');
        state.browserContext = null;
        state.activePage = null;
        state.lastSystemContextHash = null;
    });

    const page = ctx.pages()[0] || (await ctx.newPage());

    // Suppress common noisy console errors from Claude's own JS
    page.on('pageerror', () => { });

    state.browserContext = ctx;
    state.activePage = page;
    return page;
}

/**
 * Navigate to Claude and wait for the input box to appear.
 * @param {import('playwright').Page} page
 */
async function navigateToClaude(page, log) {
    log('[sessionManager] Navigating to Claude...');
    await page.goto(CLAUDE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);
    const url = page.url();
    if (url.includes('login') || url.includes('signin')) {
        log('[sessionManager] WARNING: Redirected to login page — user needs to re-authenticate.');
    }
}

/**
 * L0 — Quick liveness probe.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function isPageAlive(page) {
    if (!page) return false;
    try {
        await Promise.race([
            page.evaluate(() => 1 + 1),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), HEALTH_TIMEOUT_MS)),
        ]);
        return true;
    } catch {
        return false;
    }
}

/**
 * Multi-tier session recovery.
 *
 * @param {Function} log  Logging function (e.g., appendLog from server.js)
 * @returns {Promise<import('playwright').Page | null>}  Recovered page or null if fatal
 */
async function recoverSession(log) {
    log('[sessionManager] Starting session recovery...');

    // ── Level 1: Reload ──────────────────────────────────────────────────────
    if (state.activePage) {
        try {
            log('[sessionManager] L1: Attempting page reload...');
            await state.activePage.reload({ waitUntil: 'domcontentloaded', timeout: 15_000 });
            await state.activePage.waitForTimeout(2000);
            if (await isPageAlive(state.activePage)) {
                log('[sessionManager] L1 recovery succeeded.');
                return state.activePage;
            }
        } catch (e) {
            log('[sessionManager] L1 failed: ' + e.message);
        }
    }

    // ── Level 2: Navigate to new chat ────────────────────────────────────────
    if (state.activePage) {
        try {
            log('[sessionManager] L2: Navigating to new chat...');
            state.lastSystemContextHash = null; // Force re-send of system context
            await navigateToClaude(state.activePage, log);
            if (await isPageAlive(state.activePage)) {
                log('[sessionManager] L2 recovery succeeded.');
                return state.activePage;
            }
        } catch (e) {
            log('[sessionManager] L2 failed: ' + e.message);
        }
    }

    // ── Level 3: Full browser restart ────────────────────────────────────────
    try {
        log('[sessionManager] L3: Closing browser and restarting...');
        if (state.browserContext) {
            try { await state.browserContext.close(); } catch { }
        }
        state.browserContext = null;
        state.activePage = null;
        state.lastSystemContextHash = null;

        const page = await launchBrowser(log);
        await navigateToClaude(page, log);
        if (await isPageAlive(page)) {
            log('[sessionManager] L3 recovery succeeded.');
            return page;
        }
    } catch (e) {
        log('[sessionManager] L3 failed: ' + e.message);
    }

    // ── Level 4: Fatal ───────────────────────────────────────────────────────
    log('[sessionManager] L4: All recovery attempts failed. Returning null (503).');
    return null;
}

/**
 * Get or initialise the browser, with automatic recovery.
 * This is the main entry point used by server.js.
 *
 * @param {Function} log
 * @param {number}   sessionTimeoutMs
 * @returns {Promise<import('playwright').Page>}
 */
async function getOrInitPage(log, sessionTimeoutMs = 3_600_000) {
    // ── happy path: existing session ────────────────────────────────────────
    if (state.browserContext && state.activePage) {
        // Session timeout → new conversation
        if (Date.now() - state.sessionLastUsed > sessionTimeoutMs) {
            log('[sessionManager] Session timed out. Starting new chat.');
            state.lastSystemContextHash = null;
            await navigateToClaude(state.activePage, log);
        }
        state.sessionLastUsed = Date.now();
        return state.activePage;
    }

    // ── cold start ───────────────────────────────────────────────────────────
    log('[sessionManager] No active session — cold start.');
    const page = await launchBrowser(log);
    await navigateToClaude(page, log);
    state.sessionLastUsed = Date.now();
    return page;
}

module.exports = { state, isPageAlive, recoverSession, getOrInitPage };
