/**
 * API client – works with any OpenAI-compatible provider.
 * Configure via .env or .roo-profiles.json: API_KEY, API_BASE_URL, API_MODEL.
 */

import OpenAI from "openai";
import { config } from "./index.mjs";
import fs from "fs";
import path from "path";

// ─── Provider profiles from .roo-profiles.json ───
let activeApiKey = config.apiKey;
let activeBaseUrl = config.apiBaseUrl;
let activeModel = config.model;

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
      console.log(`📋 Using provider profile: "${profileName}" (${profile.name || profileName})`);
    }
  }
} catch { /* ignore invalid profiles file */ }

if (!activeApiKey) {
  console.error("❌ No API key found. Set API_KEY in .env or add it to .roo-profiles.json");
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
