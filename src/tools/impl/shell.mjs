import { exec } from "child_process";
import { promisify } from "util";
import { config } from "../../config/index.mjs";

const execAsync = promisify(exec);
const IS_WINDOWS = process.platform === "win32";

const DANGEROUS_PATTERNS = [
  { pattern: /\brm\s*[-/]+\s*rf\b/, desc: "recursive force delete" },
  { pattern: /\bmkfs\.\w+/, desc: "filesystem format" },
  { pattern: /\bdd\s+if=/, desc: "disk write (dd)" },
  { pattern: />\s*\/dev\/(sd|nvme|hd)/, desc: "direct device write" },
  { pattern: /\bchmod\s+777\b/, desc: "dangerous permissions" },
  { pattern: /(curl|wget)\b.*\s*\|\s*(bash|sh|zsh)\b/, desc: "pipe-from-web execution" },
  { pattern: /\bpasswd\b/, desc: "password change" },
  { pattern: /\bexec\s+\//, desc: "exec to absolute path" },
  { pattern: /\bsource\s+\//, desc: "source absolute path" },
  { pattern: /\bsudo\b/, desc: "sudo command" },
];

function isDangerous(command) {
  for (const { pattern, desc } of DANGEROUS_PATTERNS) {
    if (pattern.test(command.toLowerCase())) {
      return desc;
    }
  }
  return null;
}

export async function executeShell(cwd, args) {
  if (!args.command || typeof args.command !== "string")
    return "Missing 'command' (string required).";

  const command = args.command.trim();
  const reason = isDangerous(command);
  if (reason) {
    return `Command blocked: ${reason}. Provide a safer alternative.`;
  }

  try {
    const shell = IS_WINDOWS ? "cmd.exe" : "/bin/bash";
    const shellFlag = IS_WINDOWS ? "/c" : "-c";
    const { stdout, stderr } = await execAsync(command, {
      cwd: cwd || process.cwd(),
      timeout: config.shellTimeout,
      maxBuffer: 1024 * 1024,
      shell: `${shell} ${shellFlag}`,
    });
    let result = "";
    if (stdout) result += stdout;
    if (stderr) result += `\n${stderr}`;
    return result.trim() || "(no output)";
  } catch (err) {
    return `Command failed (exit ${err.code || "?"}): ${err.stderr?.trim() || err.message}`;
  }
}
