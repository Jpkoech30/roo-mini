import OpenAI from "openai";
import { config } from "./index.mjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Load .env at module level BEFORE accessing config, since loadConfig() hasn't run yet
try {
  const dotenv = await import("dotenv");
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });
  dotenv.config(); // also try cwd
} catch { /* dotenv optional */ }

let activeApiKey = process.env.API_KEY || process.env.OPENAI_API_KEY || config.apiKey;
let activeBaseUrl = process.env.API_BASE_URL || process.env.OPENAI_BASE_URL || config.apiBaseUrl;
let activeModel = process.env.MODEL || process.env.LLM_MODEL || config.model;

try {
  const profilesPath = path.join(process.cwd(), ".roo-profiles.json");
  if (fs.existsSync(profilesPath)) {
    const profiles = JSON.parse(fs.readFileSync(profilesPath, "utf-8"));
    const profileName = process.env.ROO_PROFILE || profiles.default || "default";
    const profile = profiles.profiles?.[profileName];
    if (profile) {
      activeApiKey = profile.apiKey || activeApiKey;
      activeBaseUrl = profile.baseUrl || activeBaseUrl;
      activeModel = profile.model || activeModel;
      console.log(`Using provider profile: "${profileName}" (${profile.name || profileName})`);
    }
  }
} catch { /* ignore */ }

if (!activeApiKey) {
  console.error("No API key found. Set API_KEY in .env or add it to .roo-profiles.json");
  process.exit(1);
}

export const client = new OpenAI({
  apiKey: activeApiKey,
  baseURL: activeBaseUrl,
  timeout: 30000,
  maxRetries: 0,
});

export function getModel() {
  return activeModel;
}

export function getSummaryModel() {
  return config.summaryModel;
}
