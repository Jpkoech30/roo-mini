/**
 * Browser automation tool using Playwright.
 *
 * Provides a persistent browser singleton that can be opened,
 * navigated, clicked, filled, and screenshotted across tool calls.
 *
 * Tools:
 * - browser_open       — Launch a browser instance
 * - browser_navigate   — Navigate to a URL
 * - browser_click      — Click an element by CSS selector
 * - browser_fill       — Fill an input field
 * - browser_screenshot — Capture a screenshot (base64 data URI)
 * - browser_get_text   — Get text content from an element or page
 * - browser_get_html   — Get HTML content
 * - browser_evaluate   — Run JavaScript in page context
 * - browser_close      — Close the browser
 */

import { chromium } from "playwright";

// ─── Singleton browser state ───
let _browser = null;
let _context = null;
let _page = null;

/**
 * Get or create the browser page singleton.
 * Auto-opens browser if not already open.
 */
async function getPage() {
  if (_page && _page.isClosed && !_page.isClosed()) {
    return _page;
  }

  if (!_browser || !_browser.isConnected()) {
    _browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  if (!_context) {
    _context = await _browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
  }

  _page = await _context.newPage();
  return _page;
}

/**
 * Clean up and close the browser.
 */
async function cleanup() {
  try {
    if (_page) { await _page.close().catch(() => {}); _page = null; }
    if (_context) { await _context.close().catch(() => {}); _context = null; }
    if (_browser) { await _browser.close().catch(() => {}); _browser = null; }
  } catch { /* best effort */ }
}

// ═══════════════════════════════════════════
//  Tool Implementations
// ═══════════════════════════════════════════

/**
 * browser_open — Launch a new browser instance (or reuse existing one).
 * If already open, this is a no-op.
 */
export async function browserOpen(_cwd, args) {
  try {
    const page = await getPage();
    return `✅ Browser ${_browser && _browser.isConnected() ? "already open" : "launched"}.`;
  } catch (err) {
    return `❌ Failed to open browser: ${err.message}`;
  }
}

/**
 * browser_navigate — Navigate to a URL and wait for the page to load.
 */
export async function browserNavigate(_cwd, args) {
  if (!args.url || typeof args.url !== "string")
    {return "❌ Missing or invalid 'url' (string required).";}

  try {
    const page = await getPage();
    const timeout = args.timeout || 30000;
    await page.goto(args.url, { waitUntil: "networkidle", timeout });
    const title = await page.title();
    const url = page.url();
    return `✅ Navigated to: ${url}\n   Title: ${title}`;
  } catch (err) {
    return `❌ Navigation failed: ${err.message}`;
  }
}

/**
 * browser_click — Click an element identified by CSS selector.
 * Waits for the element to be visible before clicking.
 */
export async function browserClick(_cwd, args) {
  if (!args.selector || typeof args.selector !== "string")
    {return "❌ Missing or invalid 'selector' (CSS selector string required).";}

  try {
    const page = await getPage();
    const timeout = args.timeout || 5000;
    await page.waitForSelector(args.selector, { state: "visible", timeout });
    await page.click(args.selector);
    return `✅ Clicked: ${args.selector}`;
  } catch (err) {
    return `❌ Click failed on "${args.selector}": ${err.message}`;
  }
}

/**
 * browser_fill — Fill an input field identified by CSS selector.
 */
export async function browserFill(_cwd, args) {
  if (!args.selector || typeof args.selector !== "string")
    {return "❌ Missing or invalid 'selector' (CSS selector string required).";}
  if (args.value === undefined || args.value === null)
    {return "❌ Missing 'value' (string to fill required).";}

  try {
    const page = await getPage();
    const timeout = args.timeout || 5000;
    await page.waitForSelector(args.selector, { state: "visible", timeout });
    await page.fill(args.selector, String(args.value));
    return `✅ Filled "${args.selector}" with "${String(args.value).slice(0, 100)}"`;
  } catch (err) {
    return `❌ Fill failed on "${args.selector}": ${err.message}`;
  }
}

/**
 * browser_screenshot — Take a screenshot of the current page.
 * Returns a base64 data URI that can be viewed or saved.
 */
export async function browserScreenshot(_cwd, args) {
  try {
    const page = await getPage();
    const fullPage = args.full_page === true;

    const screenshot = await page.screenshot({
      type: "png",
      fullPage,
    });

    const base64 = screenshot.toString("base64");
    const dataUri = `data:image/png;base64,${base64}`;

    // Return first 200 chars of the data URI + dimensions
    const dimensions = page.viewportSize();
    const dimStr = dimensions ? `${dimensions.width}x${dimensions.height}` : "unknown";
    const sizeKB = Math.round(screenshot.length / 1024);

    return `✅ Screenshot taken (${sizeKB}KB, ${dimStr}${fullPage ? ", full page" : ""})\n${dataUri.slice(0, 200)}...`;
  } catch (err) {
    return `❌ Screenshot failed: ${err.message}`;
  }
}

/**
 * browser_get_text — Get visible text content from a selector or the whole page.
 */
export async function browserGetText(_cwd, args) {
  try {
    const page = await getPage();

    if (args.selector) {
      await page.waitForSelector(args.selector, { state: "attached", timeout: 5000 }).catch(() => {});
      const text = await page.textContent(args.selector).catch(() => null);
      if (text === null) {return `❌ Element not found: "${args.selector}"`;}
      return text.trim();
    }

    // Get all text from the page
    const bodyText = await page.evaluate(() => document.body?.innerText || "");
    return bodyText.trim().slice(0, 5000) || "(no text content)";
  } catch (err) {
    return `❌ Get text failed: ${err.message}`;
  }
}

/**
 * browser_get_html — Get outer HTML from a selector or the whole page.
 */
export async function browserGetHtml(_cwd, args) {
  try {
    const page = await getPage();

    if (args.selector) {
      const html = await page.innerHTML(args.selector).catch(() => null);
      if (html === null) {return `❌ Element not found: "${args.selector}"`;}
      return html.slice(0, 5000);
    }

    const html = await page.content();
    return html.slice(0, 5000);
  } catch (err) {
    return `❌ Get HTML failed: ${err.message}`;
  }
}

/**
 * browser_evaluate — Run JavaScript in the page context and return the result.
 */
export async function browserEvaluate(_cwd, args) {
  if (!args.code || typeof args.code !== "string")
    {return "❌ Missing or invalid 'code' (JavaScript string required).";}

  try {
    const page = await getPage();
    const result = await page.evaluate(args.code);
    const formatted = typeof result === "object" ? JSON.stringify(result, null, 2).slice(0, 3000) : String(result).slice(0, 3000);
    return `✅ Evaluation result:\n${formatted}`;
  } catch (err) {
    return `❌ Evaluation failed: ${err.message}`;
  }
}

/**
 * browser_get_url — Get the current page URL.
 */
export async function browserGetUrl(_cwd, args) {
  try {
    const page = await getPage();
    return `📍 ${page.url()}`;
  } catch (err) {
    return `❌ Failed to get URL: ${err.message}`;
  }
}

/**
 * browser_close — Close the browser and clean up resources.
 */
export async function browserClose(_cwd, args) {
  try {
    await cleanup();
    return "✅ Browser closed.";
  } catch (err) {
    return `❌ Failed to close browser: ${err.message}`;
  }
}
