/**
 * Terminal UI — Roo Code Webview Style
 *
 * Messages shown as colored boxes/cards with clean layout.
 * Colors enhance UX, not just for decoration.
 */

import chalk from "chalk";
import boxen from "boxen";

// ─── Spinner ───
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/**
 * Creates an animated spinner that prints to stderr.
 */
export function createSpinner(text) {
  let frame = 0;
  let interval = null;

  function render() {
    const f = SPINNER_FRAMES[frame % SPINNER_FRAMES.length];
    process.stderr.write(`\r${chalk.cyan(f)} ${text}`);
    frame++;
  }

  process.stderr.write("\r\x1b[K");
  render();
  interval = setInterval(render, 80);

  return {
    stop(msg) {
      if (interval) {clearInterval(interval);}
      process.stderr.write("\r\x1b[K");
      if (msg) {console.log(chalk.dim(msg));}
    },
    update(newText) {
      text = newText;
    },
  };
}

// ─── Card Colors ───
const COLORS = {
  user: { border: "cyan", title: chalk.bold.cyan },
  assistant: { border: "green", title: chalk.bold.green },
  tool: { border: "yellow", title: chalk.bold.yellow },
  error: { border: "red", title: chalk.bold.red },
  success: { border: "green", title: chalk.bold.green },
};

// ─── Typewriter Effect ───

const BASE_SPEED = parseInt(process.env.TYPEWRITER_SPEED || "12", 10);

/**
 * Get a human-like typing delay for a character, varying by context.
 * Fast for common chars, slower for punctuation, pauses at sentence breaks.
 */
function getCharDelay(char, _nextChar) {
  // Base multiplier from env
  const base = BASE_SPEED;

  // Punctuation pauses
  if (char === '\n') {return base * 10;}      // 120ms — newline pause
  if (char === '.' || char === '!' || char === '?') {return base * 7;}  // 84ms — sentence end
  if (char === ',' || char === ';' || char === ':') {return base * 4;}  // 48ms — clause pause

  // Word gaps
  if (char === ' ') {return base * 3;}         // 36ms — word gap (Shift key between words)

  // Slow chars (require shift or are deliberate)
  if (/[A-Z]/.test(char)) {return base * 2;}   // 24ms — capital letter
  if ('(){}[]'.includes(char)) {return base * 2;} // brackets
  if ('+-*/=%><&|'.includes(char)) {return base * 1.5;} // operators

  // Fast chars (common, no shift)
  return base;  // 12ms — normal
}

/**
 * Write text to stdout with a human-like typewriter effect.
 * Writes PLAIN text with character delays — no formatting, no \r rewrites.
 * Formatting happens AFTER the full message is received (in the box).
 */
export async function typewriterWrite(text) {
  if (!text) {return;}
  if (BASE_SPEED <= 0) {
    process.stdout.write(text);
    return;
  }
  for (let i = 0; i < text.length; i++) {
    process.stdout.write(text[i]);
    const delay = getCharDelay(text[i], text[i + 1]);
    await new Promise(r => setTimeout(r, delay));
  }
}

// ─── Content Formatter ───

/**
 * Add visual decorations to message content.
 * Highlights: code blocks, file paths, numbers, inline code.
 */
function formatContent(text) {
  if (!text) {return text;}

  // Process line by line for code blocks
  const lines = text.split("\n");
  let inCodeBlock = false;
  const result = [];

  for (const line of lines) {
    // Code block fences
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      if (inCodeBlock) {
        const lang = line.trim().slice(3);
        result.push(chalk.blue(`┌─ ${lang || "code"} ─────────────────────────────┐`));
      } else {
        result.push(chalk.blue(`└──────────────────────────────────────────┘`));
      }
      continue;
    }

    if (inCodeBlock) {
      // Code inside blocks — dim with slight indent
      result.push(chalk.dim(`  ${line}`));
      continue;
    }

    // Format regular lines
    let formatted = line;

    // Color file paths (words with dots like file.mjs, src/path/file.ext)
    formatted = formatted.replace(
      /([\w.-]+\/)?[\w.-]+\.\w{1,4}(?=\s|$|[,.!?:;])/g,
      (match) => chalk.cyan(match)
    );

    // Color inline `code` backtick blocks
    formatted = formatted.replace(
      /`([^`]+)`/g,
      (_, code) => chalk.yellow(code)
    );

    // Color quoted strings "like this"
    formatted = formatted.replace(
      /"([^"']+)"/g,
      (_, str) => chalk.green(`"${str}"`)
    );

    // Color markdown headers
    if (/^#{1,3}\s/.test(formatted)) {
      formatted = chalk.bold(formatted);
    }

    // Color bold markdown **text**
    formatted = formatted.replace(
      /\*\*([^*]+)\*\*/g,
      (_, bold) => chalk.bold(bold)
    );

    result.push(formatted);
  }

  return result.join("\n");
}

// ─── Header / Welcome Banner ───

export function printHeader() {
  const version = process.env.npm_package_version || "1.0.0";
  const mode = process.env.ROO_MODE || "code";
  const toolCount = process.env.ROO_TOOL_COUNT || "~35";

  console.log(
    boxen(
      chalk.bold.cyan("🤖 ROO-MINI") +
      chalk.gray(` v${version}`) +
      chalk.gray(` · ${toolCount} tools`) +
      chalk.gray(` · mode: ${mode}`) +
      `\n${chalk.dim(":h help · :q exit · :c clear · Tab ↑↓")}`,
      {
        padding: { top: 1, bottom: 1, left: 2, right: 2 },
        borderColor: "cyan",
        borderStyle: "round",
        margin: { bottom: 1 },
      }
    )
  );
}

// ─── User Message Box ───

export function printUserMessage(content) {
  console.log(
    boxen(formatContent(content), {
      padding: { top: 1, bottom: 1, left: 2, right: 2 },
      borderColor: "cyan",
      borderStyle: "round",
      margin: { top: 1, bottom: 0 },
      title: chalk.bold.cyan(" You "),
      titleAlignment: "left",
    })
  );
}

// ─── Assistant Message Box ───

export function printAssistantMessage(content) {
  console.log(
    boxen(formatContent(content), {
      padding: { top: 1, bottom: 1, left: 2, right: 2 },
      borderColor: "green",
      borderStyle: "round",
      margin: { top: 1, bottom: 0 },
      title: chalk.bold.green(" Assistant "),
      titleAlignment: "left",
    })
  );
}

// ─── Tool Call Card ───

const SILENT_TOOLS = ["read_file", "list_files", "search_in_file", "search_files_glob", "show_memory"];

/**
 * Strip ANSI escape sequences from a string.
 */
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

export function printToolCard(toolName, args = {}, result = "", verbose = false) {
  // Skip silent tools in non-verbose mode
  if (SILENT_TOOLS.includes(toolName) && !verbose) {return;}

  // Clean the result: strip ANSI, take first line only, truncate
  const cleanResult = result ? stripAnsi(result).split("\n")[0].slice(0, 100).trim() : "";

  // Format args as key: value pairs (1-2 lines max)
  const argLines = Object.entries(args)
    .filter(([_, v]) => v !== undefined && v !== null)
    .slice(0, 3) // max 3 args
    .map(([k, v]) => {
      const val = typeof v === "string" && v.length > 60 ? v.slice(0, 60) + "..." : String(v);
      return `${chalk.dim(k)}: ${chalk.white(val)}`;
    });

  const content = [
    chalk.yellow(toolName),
    ...argLines.map(l => `  ${l}`),
    cleanResult ? `${chalk.dim("→")} ${cleanResult}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  console.log(
    boxen(content, {
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      borderColor: "yellow",
      borderStyle: "round",
      margin: { top: 0, bottom: 0 },
    })
  );
}

// ─── Tool Narrative (compact, non-verbose) ───

export function printToolNarrative(toolName, summary, verbose = false) {
  if (SILENT_TOOLS.includes(toolName) && !verbose) {return;}

  const icons = {
    read_file: "📖", write_file: "✏️", replace_in_file: "✏️",
    append_to_file: "✏️", apply_diff: "✏️", list_files: "📂",
    search_in_file: "🔍", search_files_glob: "🔎", execute_shell: "💻",
    move_file: "📦", delete_file: "🗑️", create_directory: "📁",
    clear_memory: "🧹", show_memory: "📋", update_project_memory: "💾",
    create_task: "📌", update_task: "📌", list_tasks: "📋",
    search_memory: "🔍", store_memory: "💾", get_memory: "📖",
  };
  const icon = icons[toolName] || "⚙️";
  const isError = summary.startsWith("❌");
  const status = isError ? chalk.red("✗") : chalk.green("✓");
  const color = isError ? chalk.red : chalk.dim;

  console.log(`  ${icon} ${chalk.yellow(toolName)} ${color(summary.slice(0, 80))} ${status}`);
}

// ─── Status Messages ───

export function printSuccess(msg) {
  console.log(chalk.green(`  ✓ ${msg}`));
}

export function printError(msg) {
  console.log(chalk.red(`  ✗ ${msg}`));
}

export function printWarning(msg) {
  console.log(chalk.yellow(`  ⚠ ${msg}`));
}

export function printInfo(msg) {
  console.log(chalk.dim(`  ${msg}`));
}

// ─── Session Summary ───

export function printSessionSummary(stats) {
  const parts = [];
  if (stats.tokens) {parts.push(`${(stats.tokens / 1000).toFixed(1)}k tokens`);}
  if (stats.cost) {parts.push(stats.cost < 0.01 ? "< $0.01" : `$${stats.cost.toFixed(4)}`);}
  if (stats.steps) {parts.push(`${stats.steps} step(s)`);}
  console.log(chalk.dim(`\n  ${parts.join(" · ")}`));
}

// ─── Final Answer Box ───

export function printFinalAnswer(answer) {
  console.log(
    boxen(chalk.green.bold("✓ ") + chalk.white(answer), {
      padding: { top: 1, bottom: 1, left: 2, right: 2 },
      borderColor: "green",
      borderStyle: "round",
      margin: { top: 1, bottom: 1 },
    })
  );
}

// ─── Stage Markers (for verbose) ───

export function printStep(iteration, max) {
  console.log(chalk.bold.blue(`\n▸ Step ${iteration}/${max}`));
}

export function printThought(thought) {
  console.log(chalk.italic.cyan(`  ${thought}`));
}

export function printToolAction(toolName, args) {
  console.log(`  ${chalk.magenta(toolName)} → ${chalk.gray(JSON.stringify(args))}`);
}

export function printToolResult(result) {
  const preview = result.length > 120 ? result.slice(0, 120) + "..." : result;
  console.log(chalk.dim(`     ${preview}`));
}

export function printFallback() {
  console.log(chalk.yellow("⚠ Max iterations reached."));
}

export function printHelp(currentMode) {
  const modes = ["code", "architect", "ask", "orchestrator"];
  const modeLines = modes.map(m =>
    chalk.dim(`  mode:${m}${currentMode === m ? "  ← current" : ""}`)
  ).join("\n");

  const help = boxen(
    chalk.bold("Commands\n\n") +
    chalk.dim("  help, :h          ") + "Show this help\n" +
    chalk.dim("  exit, :q, quit    ") + "Exit\n" +
    chalk.dim("  clear, :c         ") + "Clear memory\n\n" +
    chalk.bold("Modes\n\n") +
    modeLines + "\n\n" +
    chalk.bold("Keys\n\n") +
    chalk.dim("  ↑/↓  ") + "History\n" +
    chalk.dim("  Tab  ") + "Complete\n" +
    chalk.dim("  C-c  ") + "Cancel",
    { padding: 1, borderColor: "cyan", borderStyle: "round", margin: { top: 1, bottom: 1 } }
  );
  console.log(help);
}
