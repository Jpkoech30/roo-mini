/**
 * Shell execution tool with cross-platform danger detection.
 *
 * Supports optional working directory (cwd), configurable timeout,
 * shell selection, and environment variables.
 */

import { exec, spawn } from "child_process";
import { promisify } from "util";
import path from "path";
import { config } from "../../config/index.mjs";

const execAsync = promisify(exec);

// ─── Platform detection ───
const IS_WINDOWS = process.platform === "win32";

// ─── Dangerous command patterns — normalized for robust matching ───
const DANGEROUS_PATTERNS = [
  // ── Unix / cross-platform ──
  { pattern: /\brm\s*[-/]+\s*rf\b/, description: "recursive force delete" },
  { pattern: /\bmkfs\.\w+/, description: "filesystem format" },
  { pattern: /\bdd\s+if=/, description: "disk write (dd)" },
  { pattern: />\s*\/dev\/(sd|nvme|hd)/, description: "direct device write" },
  { pattern: /\bchmod\s+777\b/, description: "dangerous permissions (777)" },
  { pattern: /(curl|wget)\b.*\s*\|\s*(bash|sh|zsh)\b/, description: "pipe-from-web execution" },
  { pattern: /\bmv\s+\/[^\s]+\s+\/[^\s]+/, description: "moving system files" },
  { pattern: /\bdpkg\s+--purge\b/, description: "package purge" },
  { pattern: /\brpm\s+-e\b/, description: "package erase" },
  { pattern: /\bpasswd\b/, description: "password change" },
  // Environment variable expansions
  { pattern: /\$home\b/, description: "HOME directory reference" },
  { pattern: /\$\{home\}/, description: "HOME directory reference" },
  { pattern: /\$user\b/, description: "user reference" },
  // Encoded execution
  { pattern: /\bbase64\s+-d\s*\|/, description: "base64-decoded execution" },
  { pattern: /\|\s*base64\s+-d/, description: "base64-decoded execution" },
  { pattern: /\|\s*base64\s+--decode/, description: "base64-decoded execution" },
  // Shell built-in abuse
  { pattern: /\bexec\s+\//, description: "exec to absolute path" },
  { pattern: /\bsource\s+\//, description: "source absolute path" },
  // Privilege escalation
  { pattern: /\bsudo\s+(rm|mkfs|dd|shutdown|reboot)\b/, description: "privileged destructive operation" },
  { pattern: /\bsu\s+-/, description: "switch user" },
  // Network pivoting
  { pattern: /\bssh\s+[^@]+@/, description: "SSH to remote host" },
];

// ─── Windows-specific dangerous patterns ───
const WINDOWS_DANGEROUS_PATTERNS = [
  { pattern: /\bdel\s+[/\\][fFsSqQ]/, description: "force/quiet delete files (Windows)" },
  { pattern: /\brmdir\s+[/\\][sSqQ]/, description: "recursive directory delete (Windows)" },
  { pattern: /\bformat\s+\w:[/\\]?/, description: "disk format (Windows)" },
  { pattern: /\bdiskpart\b/, description: "disk partition tool" },
  { pattern: /\breg\s+delete\b/, description: "registry delete" },
  { pattern: /\btakeown\b/, description: "file ownership takeover" },
  { pattern: /\bicacls\s+\/grant\b.*[Ff]\b/, description: "full access permission grant" },
  { pattern: /\bnet\s+user\s+\/add\b/, description: "user account creation" },
  { pattern: /\bsc\s+delete\b/, description: "service deletion" },
  { pattern: /\bpowershell\s+.*remove-item\s+/i, description: "PowerShell Remove-Item" },
  { pattern: /\bpowershell\s+.*rm\s+/i, description: "PowerShell rm alias" },
  { pattern: /\bwmic\s+.*delete\b/i, description: "WMIC delete operation" },
  { pattern: /\bcipher\s+\/w:/, description: "disk wipe (cipher /w)" },
];

/**
 * Get the full set of danger patterns for the current platform.
 */
function getDangerPatterns() {
  if (IS_WINDOWS) {
    return [...DANGEROUS_PATTERNS, ...WINDOWS_DANGEROUS_PATTERNS];
  }
  return DANGEROUS_PATTERNS;
}

/**
 * Normalize a command for pattern matching (collapse whitespace, lowercase).
 */
function normalize(cmd) {
  return cmd.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Check if a command contains dangerous patterns.
 * Normalizes the command first to catch spacing bypasses.
 * @param {string} command - Raw command string
 * @returns {{dangerous: boolean, message: string}|null}
 */
function checkDangerous(command) {
  const patterns = getDangerPatterns();
  const normalized = normalize(command);

  for (const { pattern, description } of patterns) {
    if (pattern.test(normalized)) {
      return {
        dangerous: true,
        message: `⛔ COMMAND BLOCKED: "${command}" — matches ${description} (/${pattern.source}/). This operation is not allowed for safety reasons.`
      };
    }
  }
  return null;
}

/**
 * Resolve the working directory for a shell command.
 * @param {string} defaultCwd - Default working directory (from executor)
 * @param {string} [userCwd] - Optional user-specified relative path
 * @returns {string} Resolved absolute working directory
 */
function resolveCwd(defaultCwd, userCwd) {
  if (!userCwd || typeof userCwd !== "string") {return defaultCwd;}
  // Resolve relative to the default cwd (project root)
  return path.resolve(defaultCwd, userCwd);
}

/**
 * Execute a shell command.
 *
 * @param {string} cwd - Default working directory (from executeTool dispatcher)
 * @param {object} args - Tool arguments
 * @param {string} args.command - The shell command to run (required)
 * @param {string} [args.cwd] - Optional working directory relative to project root
 * @param {number} [args.timeout] - Optional timeout in milliseconds
 * @param {string} [args.description] - Optional description of the command
 * @returns {Promise<string>} Result string
 */
export async function executeShell(cwd, args) {
  if (!args.command || typeof args.command !== "string") {
    return "❌ Missing or invalid 'command'.";
  }

  // Danger detection — blocks dangerous commands
  const danger = checkDangerous(args.command);
  if (danger) {
    return danger.message;
  }

  // Resolve parameters
  const resolvedCwd = resolveCwd(cwd, args.cwd);
  const timeout = (typeof args.timeout === "number" && args.timeout > 0)
    ? args.timeout
    : config.shellTimeout;
  const description = args.description || "";

  // Build exec options
  const execOptions = {
    cwd: resolvedCwd,
    timeout,
    maxBuffer: 10 * 1024 * 1024, // 10MB max output buffer
  };

  const startTime = Date.now();

  try {
    const { stdout, stderr } = await execAsync(args.command, execOptions);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    let result = `✅ Command executed in ${duration}s`;

    if (description) {result += ` — ${description}`;}
    if (stdout) {result += `\n${stdout}`;}
    if (stderr) {
      result += `\n⚠️ Stderr:\n${stderr}`;
    }

    // If no stdout and no stderr, add a note
    if (!stdout && !stderr) {
      result += "\n(no output)";
    }

    return result;
  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const exitCode = err.code || err.status || "unknown";
    const stderrMsg = err.stderr ? `\nStderr: ${err.stderr}` : "";
    const signalMsg = err.signal ? `\nKilled by: ${err.signal}` : "";

    let result = `❌ Command failed (exit code: ${exitCode}, duration: ${duration}s)`;
    if (description) {result += ` — ${description}`;}
    result += `\nCommand: ${args.command}`;
    result += `\nCwd: ${resolvedCwd}`;
    if (stderrMsg) {result += stderrMsg;}
    if (signalMsg) {result += signalMsg;}

    // Include partial stdout if available (useful for timeouts)
    if (err.stdout) {
      result += `\nPartial output:\n${err.stdout}`;
    }

    // Include the error message too
    if (err.message && !err.message.includes(err.stderr || "")) {
      result += `\nError: ${err.message}`;
    }

    return result;
  }
}
