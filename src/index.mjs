/**
 * Roo-Mini CLI — interactive REPL with spinner, history, aliases, and piping.
 *
 * Features:
 * - Animated spinner during agent thinking
 * - Multi-line input support
 * - Command aliases (:q, :h, :c, :m:code)
 * - Tab completion + command history
 * - Persistent mode across restarts
 * - Stdin piping (echo "prompt" | npm start)
 * - Graceful shutdown (SIGINT + SIGTERM)
 */

import { runAgent } from "./agent/loop.mjs";
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import * as UI from "./ui/printer.mjs";
import fs from "fs/promises";
import path from "path";
import { Buffer } from 'node:buffer';

const MEMORY_DIR = ".roo-memory";
const MODE_FILE = "currentMode";
const HISTORY_FILE = ".roo_history";

// ─── Persistent mode ───
async function loadSavedMode(defaultMode) {
  try {
    const data = await fs.readFile(path.join(process.cwd(), MEMORY_DIR, MODE_FILE), "utf-8");
    const trimmed = data.trim();
    if (["code", "architect", "ask", "orchestrator"].includes(trimmed)) {return trimmed;}
  } catch { /* file doesn't exist yet, use default */ }
  return defaultMode;
}

async function saveMode(mode) {
  try {
    const dir = path.join(process.cwd(), MEMORY_DIR);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, MODE_FILE), mode, "utf-8");
  } catch { /* best effort */ }
}

// ─── Tab completion ───
const COMMANDS = [
  "mode:code", "mode:architect", "mode:ask",
  "clear", "help", "exit", "quit",
  ":h", ":q", ":c", ":m:code", ":m:architect", ":m:ask",
];

function completer(line) {
  const hits = COMMANDS.filter(c => c.startsWith(line.toLowerCase()));
  return [hits.length ? hits : COMMANDS, line];
}

// ─── Graceful shutdown ───
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    console.log(`\n⚠️ ${signal} received again. Force exit.`);
    process.exit(1);
  }
  isShuttingDown = true;
  console.log(`\n\n⚠️ ${signal} received. Shutting down gracefully...`);

  // Save conversation memory
  try {
    const { saveConversation, loadConversation } = await import("./memory/conversationMemory.mjs");
    const history = await loadConversation();
    if (history.length) {await saveConversation(history);}
  } catch { /* best effort */ }

  // Clean up MCP server processes
  try {
    const { resetMCP } = await import("./mcp/client.mjs");
    resetMCP();
  } catch { /* best effort */ }

  console.log("👋 Goodbye!");
  process.exit(0);
}

function setupShutdown() {
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
}

// ─── Stdin piping detection ───
function isPipedInput() {
  return !input.isTTY;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of input) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8").trim();
}

// ─── Multi-line input collector ───
async function readMultiLine(rl) {
  const lines = [];
  while (true) {
    const line = await rl.question("");
    if (!line.trim()) {break;}
    lines.push(line);
  }
  return lines.join("\n");
}

// ─── Command parser ───
const ALIASES = {
  ":h": "help",
  ":q": "exit",
  ":c": "clear",
  ":m:code": "mode:code",
  ":m:architect": "mode:architect",
  ":m:ask": "mode:ask",
};

function expandAlias(input) {
  return ALIASES[input.toLowerCase()] || input;
}

// ─── CLI ───
const args = process.argv.slice(2);
const verbose = args.includes("--verbose") || args.includes("-v");
const modeArg = args.find(a => a.startsWith("--mode="));
const mode = modeArg ? modeArg.split("=")[1] : "code";
const promptFromArgs = args.filter(a => !a.startsWith("-")).join(" ");

async function main() {
  setupShutdown();

  // ── Piped input mode ──
  if (isPipedInput()) {
    const pipedPrompt = await readStdin();
    if (pipedPrompt) {
      console.log(`💬 Running piped input: "${pipedPrompt.slice(0, 80)}${pipedPrompt.length > 80 ? "..." : ""}" (mode: ${mode})`);
      const spinner = UI.createSpinner("Thinking...");
      const startTime = Date.now();
      try {
        await runAgent(pipedPrompt, verbose, mode);
      } finally {
        spinner.stop();
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(chalk.dim(`⏱️ ${elapsed}s`));
      }
    }
    return;
  }

  // ── One-shot mode ──
  if (promptFromArgs) {
    console.log(`💬 Running: "${promptFromArgs}" (mode: ${mode})`);
    const startTime = Date.now();
    try {
      await runAgent(promptFromArgs, verbose, mode);
    } finally {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(chalk.dim(`⏱️ ${elapsed}s`));
    }
    return;
  }

  // ── Interactive REPL ──
  const rl = readline.createInterface({
    input,
    output,
    completer,
    historySize: 100,
  });

  // History persistence
  try {
    const historyPath = path.join(process.cwd(), MEMORY_DIR, HISTORY_FILE);
    const historyData = await fs.readFile(historyPath, "utf-8").catch(() => "");
    if (historyData) {
      rl.history = historyData.split("\n").filter(Boolean).slice(-100);
    }
    rl.on("close", async () => {
      try {
        const dir = path.join(process.cwd(), MEMORY_DIR);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(historyPath, rl.history.join("\n"), "utf-8");
      } catch { /* best effort */ }
    });
  } catch { /* best effort */ }

  // Set env vars for the welcome banner
  const initialMode = await loadSavedMode(mode);
  process.env.ROO_MODE = initialMode;
  process.env.ROO_TOOL_COUNT = "35";

  UI.printHeader();

  let currentMode = initialMode;
  if (verbose) {console.log(chalk.yellow("🔍 Verbose mode ON"));}

  while (true) {
    try {
      // Show prompt
      const raw = await rl.question(chalk.dim("\n─── ") + chalk.bold("You") + chalk.dim(" ───\n  "));
      let trimmed = raw.trim();
      if (!trimmed) {continue;}

      // Expand aliases
      trimmed = expandAlias(trimmed);

      // Add to history
      if (rl.history[0] !== trimmed) {
        rl.history = rl.history.filter(h => h !== trimmed);
        rl.history.unshift(trimmed);
      }

      // Exit
      if (["exit", "quit", "q"].includes(trimmed.toLowerCase())) {
        console.log("👋 Goodbye!");
        rl.close();
        break;
      }

      // Multi-line mode: if prompt ends with \, collect more lines
      if (trimmed.endsWith("\\")) {
        trimmed = trimmed.slice(0, -1) + "\n" + await readMultiLine(rl);
      }

      // Mode switching (supports both "mode:code" and natural "change to architect mode")
      const modeSwitchRegex = /(?:change|switch|set|go)\s+(?:to\s+)?(?:mode\s+)?(code|architect|ask|orchestrator)\s*(?:mode)?\b/i;
      const modeMatch = trimmed.match(modeSwitchRegex);
      if (trimmed.startsWith("mode:") || trimmed.startsWith(":m:") || modeMatch) {
        const newMode = modeMatch ? modeMatch[1].toLowerCase() : trimmed.includes(":") ? trimmed.split(":")[1].trim() : "";
        if (["code", "architect", "ask", "orchestrator"].includes(newMode)) {
          currentMode = newMode;
          await saveMode(currentMode);
          console.log(chalk.green(`✅ Switched to ${currentMode} mode (saved)`));
        } else {
          console.log(chalk.red("❌ Invalid mode. Try: code, architect, ask, orchestrator"));
        }
        continue;
      }

      // Clear screen (keeps conversation intact)
      if (["clear", "cls"].includes(trimmed.toLowerCase())) {
        process.stdout.write("\x1Bc"); // ANSI escape: clear entire terminal
        UI.printHeader();
        continue;
      }

      // Clear memory (wipes conversation history)
      if (["clear:memory", "clear:all"].includes(trimmed.toLowerCase())) {
        const { clearConversation } = await import("./memory/conversationMemory.mjs");
        await clearConversation();
        process.stdout.write("\x1Bc");
        UI.printHeader();
        console.log(chalk.green("🧹 Memory cleared. Fresh start."));
        continue;
      }

      // Help
      if (trimmed.toLowerCase() === "help") {
        UI.printHelp(currentMode);
        continue;
      }

      // Run agent — stop spinner before agent prints output
      UI.createSpinner(`Thinking...`).stop("");
      const startTime = Date.now();
      await runAgent(trimmed, verbose, currentMode);
    } catch (error) {
      UI.printError(error.message);
      if (verbose) {console.error(error);}
    }
  }
}

// Import chalk for the module-level functions
import chalk from "chalk";

main().catch(err => {
  console.error(chalk.red(`💥 Fatal: ${err.message}`));
  process.exit(1);
});
