import { chromium } from "playwright";

let _browser = null;
let _context = null;
let _page = null;

async function getPage() {
  if (_page && !_page.isClosed()) return _page;
  if (!_browser || !_browser.isConnected()) {
    _browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  }
  if (!_context) {
    _context = await _browser.newContext({ viewport: { width: 1280, height: 720 } });
  }
  _page = await _context.newPage();
  return _page;
}

async function cleanup() {
  try {
    if (_page) { await _page.close().catch(() => {}); _page = null; }
    if (_context) { await _context.close().catch(() => {}); _context = null; }
    if (_browser) { await _browser.close().catch(() => {}); _browser = null; }
  } catch { /* best effort */ }
}

export async function browserOpen(_cwd, args) {
  const page = await getPage();
  if (args.url) await page.goto(args.url, { waitUntil: "domcontentloaded" });
  return `Browser opened${args.url ? ` at ${args.url}` : ""}.`;
}

export async function browserNavigate(_cwd, args) {
  if (!args.url) return "Missing 'url'.";
  const page = await getPage();
  await page.goto(args.url, { waitUntil: "domcontentloaded" });
  return `Navigated to ${args.url}.`;
}

export async function browserClick(_cwd, args) {
  if (!args.selector) return "Missing 'selector'.";
  const page = await getPage();
  await page.click(args.selector);
  return `Clicked ${args.selector}.`;
}

export async function browserFill(_cwd, args) {
  if (!args.selector || args.value === undefined) return "Missing 'selector' or 'value'.";
  const page = await getPage();
  await page.fill(args.selector, String(args.value));
  return `Filled ${args.selector} with "${args.value}".`;
}

export async function browserScreenshot(_cwd, args) {
  const page = await getPage();
  const buffer = await page.screenshot({ path: args.path || undefined, type: "png" });
  if (args.path) return `Screenshot saved to ${args.path}.`;
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export async function browserGetText(_cwd, args) {
  if (!args.selector) return "Missing 'selector'.";
  const page = await getPage();
  return (await page.textContent(args.selector)) || "(empty)";
}

export async function browserGetHTML(_cwd, args) {
  if (!args.selector) return "Missing 'selector'.";
  const page = await getPage();
  return (await page.innerHTML(args.selector)) || "(empty)";
}

export async function browserEvaluate(_cwd, args) {
  if (!args.script) return "Missing 'script'.";
  const page = await getPage();
  const result = await page.evaluate(args.script);
  return String(result);
}

export async function browserGetURL(_cwd, _args) {
  const page = await getPage();
  return page.url();
}

export async function browserClose(_cwd, _args) {
  await cleanup();
  return "Browser closed.";
}
