import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadPackageJson() {
  try {
    const pkgPath = path.join(__dirname, "..", "..", "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return pkg;
  } catch {
    return { version: "0.0.0" };
  }
}

const pkg = loadPackageJson();

export const config = {
  version: pkg.version,
  shellTimeout: 30_000,        // 30 seconds
  maxToolCallsPerStep: 20,
  conversationHistoryLimit: 200,
  llm: {
    model: process.env.LLM_MODEL || "gpt-4o-mini",
    temperature: parseFloat(process.env.LLM_TEMPERATURE || "0.7"),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || "4096", 10),
  },
};

export function loadConfig() {
  // Load .env if dotenv is available
  try {
    const dotenv = await import("dotenv");
    dotenv.config();
  } catch {
    // dotenv optional
  }

  // Override from environment
  if (process.env.SHELL_TIMEOUT) config.shellTimeout = parseInt(process.env.SHELL_TIMEOUT, 10);
  if (process.env.MAX_TOOL_CALLS) config.maxToolCallsPerStep = parseInt(process.env.MAX_TOOL_CALLS, 10);

  return config;
}
