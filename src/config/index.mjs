/**
 * Central configuration module.
 * All tunable parameters loaded from environment with sensible defaults.
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

export const config = {
  // ── API / Provider ──
  apiKey: process.env.API_KEY || process.env.DEEPSEEK_API_KEY || "",
  apiBaseUrl: process.env.API_BASE_URL || "https://api.deepseek.com/v1",
  model: process.env.MODEL_NAME || process.env.API_MODEL || "deepseek-chat",
  apiTimeout: parseInt(process.env.API_TIMEOUT || "60000", 10),

  // ── Agent Loop ──
  maxRetries: parseInt(process.env.MAX_RETRIES || "5", 10),
  maxMessagesBeforeSummary: parseInt(process.env.MAX_MESSAGES_BEFORE_SUMMARY || "20", 10),
  maxIterations: parseInt(process.env.MAX_ITERATIONS || "50", 10),

  // ── Retry Backoff ──
  backoffBaseMs: parseInt(process.env.BACKOFF_BASE_MS || "1000", 10),
  backoffMaxMs: parseInt(process.env.BACKOFF_MAX_MS || "30000", 10),

  // ── Summarization ──
  summaryModel: process.env.SUMMARY_MODEL || process.env.MODEL_NAME || "deepseek-chat",
  summaryMaxTokens: parseInt(process.env.SUMMARY_MAX_TOKENS || "300", 10),
  summaryTemperature: parseFloat(process.env.SUMMARY_TEMPERATURE || "0.3"),

  // ── Results ──
  toolResultMaxChars: parseInt(process.env.TOOL_RESULT_MAX_CHARS || "500", 10),
};
