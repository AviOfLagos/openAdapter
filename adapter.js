const { chromium } = require("playwright");
const path = require("path");

// --- Config ---
const CLAUDE_URL = "https://claude.ai/new";
const USER_DATA_DIR = path.join(__dirname, ".browser-profile");
const MAX_TIMEOUT_MS = 120_000;
const STABLE_INTERVAL_MS = 3000;
const POLL_MS = 500;

// --- Selectors (hardcoded, update if Claude UI changes) ---
// Each key has a primary + fallbacks tried in order.
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
    'div.font-claude-response',
    'div[class*="font-claude-response"]',
    'div.font-claude-message',
    'div[class*="font-claude-message"]',
    'div[data-testid*="message"]:not([data-testid="user-message"])',
  ],
};

/**
 * Try each selector in a chain, return the first match.
 */
async function findElement(page, chainKey) {
  const selectors = SELECTOR_CHAINS[chainKey];
  for (const sel of selectors) {
    const el = await page.$(sel);
    if (el) return { el, selector: sel };
  }
  return { el: null, selector: selectors[0] };
}

/**
 * Try each selector in a chain, return all matches from the first one that hits.
 */
async function findAllElements(page, chainKey) {
  const selectors = SELECTOR_CHAINS[chainKey];
  for (const sel of selectors) {
    const els = await page.$$(sel);
    if (els.length > 0) return { els, selector: sel };
  }
  return { els: [], selector: selectors[0] };
}

/**
 * Wait for any selector in a chain to appear.
 */
async function waitForAny(page, chainKey, opts = {}) {
  const selectors = SELECTOR_CHAINS[chainKey];
  const timeout = opts.timeout || 30_000;
  const combined = selectors.join(", ");
  return page.waitForSelector(combined, { timeout, ...opts });
}

async function main() {
  // --- Parse CLI args ---
  const prompt = process.argv.slice(2).join(" ").trim();
  if (!prompt) {
    console.error("Usage: node adapter.js <prompt>");
    console.error('Example: node adapter.js "Explain recursion simply"');
    process.exit(1);
  }

  let context;
  let page;

  try {
    // --- Launch persistent browser ---
    console.error("[adapter] Launching browser...");
    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: false,
      viewport: { width: 1280, height: 900 },
      args: ["--disable-blink-features=AutomationControlled"],
    });

    page = context.pages()[0] || (await context.newPage());

    // --- Navigate to Claude ---
    console.error("[adapter] Navigating to Claude...");
    await page.goto(CLAUDE_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // --- Wait for the page to be interactive ---
    console.error("[adapter] Waiting for prompt input...");
    // --- Wait for the page to be interactive ---
    console.error("[adapter] Waiting for prompt input...");
    await page.waitForTimeout(2000); // Wait for potential redirects to settle
    try {
      await waitForAny(page, "promptInput", { timeout: 30_000, state: "visible" });
    } catch (err) {
      console.error(`[adapter] Current URL: ${page.url()}`);
      throw new Error(`Timeout waiting for prompt input. Current URL: ${page.url()}`);
    }

    // --- If a previous generation is still running, wait for it ---
    const { el: existingStop } = await findElement(page, "stopButton");
    if (existingStop) {
      console.error("[adapter] Previous generation in progress, waiting...");
      const stopSelectors = SELECTOR_CHAINS.stopButton.join(", ");
      await page.waitForSelector(stopSelectors, {
        state: "detached",
        timeout: MAX_TIMEOUT_MS,
      });
      await page.waitForTimeout(1000);
    }

    // --- Count existing assistant messages before we send ---
    const { els: prevMessages, selector: respSelector } = await findAllElements(page, "responseBlocks");
    const prevMessageCount = prevMessages.length;
    console.error(`[adapter] Found ${prevMessageCount} existing assistant messages (using: ${respSelector})`);

    // --- Insert prompt ---
    console.error("[adapter] Inserting prompt...");
    const { el: inputEl, selector: inputSel } = await findElement(page, "promptInput");
    if (!inputEl) {
      throw new Error(
        "Prompt input element not found. Tried: " +
        SELECTOR_CHAINS.promptInput.join(", ")
      );
    }
    console.error(`[adapter] Using input selector: ${inputSel}`);
    await inputEl.click();
    await inputEl.fill(prompt);

    // Small pause to let UI register the input
    await page.waitForTimeout(300);

    // --- Submit ---
    console.error("[adapter] Submitting...");
    const { el: sendBtn } = await findElement(page, "sendButton");
    if (sendBtn) {
      await sendBtn.click();
    } else {
      // Fallback: press Enter
      console.error("[adapter] Send button not found, pressing Enter...");
      await page.keyboard.press("Enter");
    }

    // --- Wait for generation to start ---
    console.error("[adapter] Waiting for generation to start...");
    try {
      const stopSelectors = SELECTOR_CHAINS.stopButton.join(", ");
      await page.waitForSelector(stopSelectors, { timeout: 15_000 });
    } catch {
      // Stop button may not appear for very fast responses
      const { els: currentMessages } = await findAllElements(page, "responseBlocks");
      if (currentMessages.length <= prevMessageCount) {
        await page.waitForTimeout(3000);
      }
    }

    // --- Wait for generation to complete and stream ---
    console.error("[adapter] Waiting for generation to complete...");
    const finalResponseText = await waitForCompletion(page, prevMessageCount);

    if (!finalResponseText) {
      throw new Error("Failed to extract assistant response from DOM");
    }

    // Send the final confirmation block
    console.log(`JSON_FINAL:${JSON.stringify({ text: finalResponseText })}`);
    console.error(`[adapter] Done. Generated ${finalResponseText.length} characters.`);
  } catch (err) {
    console.error(`[adapter] Error: ${err.message}`);
    process.exit(1);
  } finally {
    if (context) {
      await context.close();
    }
  }
}

/**
 * Wait for generation to complete.
 * Primary: stop button disappears.
 * Fallback: content stabilizes for STABLE_INTERVAL_MS.
 */
async function waitForCompletion(page, prevMessageCount) {
  const deadline = Date.now() + MAX_TIMEOUT_MS;
  let lastContent = "";
  let lastChangeTime = Date.now();
  let latestMessageIndex = -1;

  // First, find the index of the message we are waiting for
  while (true) {
    const { els: currentMessages } = await findAllElements(page, "responseBlocks");
    if (currentMessages.length > prevMessageCount) {
      latestMessageIndex = currentMessages.length - 1;
      break;
    }
    if (Date.now() > deadline) {
      console.error("[adapter] WARNING: Timeout waiting for new message block.");
      return "";
    }
    await page.waitForTimeout(100);
  }

  while (Date.now() < deadline) {
    const { els: currentMessages } = await findAllElements(page, "responseBlocks");
    if (currentMessages.length > latestMessageIndex) {
      const latestMsg = currentMessages[latestMessageIndex];
      const currentContent = (await latestMsg.innerText()).trim();

      if (currentContent && currentContent.length > lastContent.length) {
        // Calculate the new chunk by slicing off the part we already know
        // Note: innerText can sometimes reformat whitespace mildly, so exact string diffing 
        // is safer with length slice assuming append-only generation, but let's just 
        // send the new suffix.
        const newChunk = currentContent.slice(lastContent.length);
        lastContent = currentContent;
        lastChangeTime = Date.now();

        // Output chunk to stdout so server.js can stream it
        console.log(`JSON_CHUNK:${JSON.stringify({ text: newChunk })}`);
      }
    }

    // Check if stop button is gone
    const { el: stopBtn } = await findElement(page, "stopButton");
    if (!stopBtn) {
      console.error("[adapter] Stop button gone, assuming generation complete.");
      await page.waitForTimeout(500);
      return lastContent;
    }

    if (Date.now() - lastChangeTime > STABLE_INTERVAL_MS) {
      console.error("[adapter] Content stabilized, assuming generation complete.");
      return lastContent;
    }

    await page.waitForTimeout(POLL_MS);
  }

  console.error("[adapter] WARNING: Timeout reached. Returning partial content.");
  return lastContent;
}

/**
 * Extract the latest assistant response text from the DOM.
 */
async function extractLatestResponse(page, prevMessageCount) {
  const { els: blocks } = await findAllElements(page, "responseBlocks");

  if (blocks.length <= prevMessageCount) {
    return null;
  }

  const latest = blocks[blocks.length - 1];
  const text = await latest.innerText();
  return text.trim();
}

main();
