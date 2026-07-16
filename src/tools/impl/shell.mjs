/**
 * Shell execution tool with danger detection.
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/** Known dangerous command patterns — normalized for robust matching. */
const DANGEROUS_PATTERNS = [
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
  { pattern: /\|base64\s+-d/, description: "base64-decoded execution" },
  { pattern: /\|base64\s+--decode/, description: "base64-decoded execution" },
  // Shell built-in abuse
  { pattern: /\bexec\s+\//, description: "exec to absolute path" },
  { pattern: /\bsource\s+\//, description: "source absolute path" },
  // Privilege escalation
  { pattern: /\bsudo\s+(rm|mkfs|dd|shutdown|reboot)\b/, description: "privileged destructive operation" },
  { pattern: /\bsu\s+-/, description: "switch user" },
  // Network pivoting
  { pattern: /\bssh\s+[^@]+@/, description: "SSH to remote host" },
];

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
  const normalized = normalize(command);

  for (const { pattern, description } of DANGEROUS_PATTERNS) {
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
 * Execute a shell command.
 * Performs danger detection before running. Dangerous commands are BLOCKED, not just warned.
 */
export async function executeShell(cwd, args) {
  if (!args.command || typeof args.command !== "string")
    {return "❌ Missing or invalid 'command'.";}

  // Danger detection — blocks dangerous commands
  const danger = checkDangerous(args.command);
  if (danger) {
    return danger.message;
  }

  try {
    const { stdout, stderr } = await execAsync(args.command, { cwd, timeout: 30000 });
    if (stderr) {return `⚠️ Stderr:\n${stderr}\n\nOutput:\n${stdout || "(no output)"}`;}
    return `✅ Command executed:\n${stdout || "(no output)"}`;
  } catch (err) {
    return `❌ Command failed: ${err.message}`;
  }
}
