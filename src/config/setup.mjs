#!/usr/bin/env node

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, "../../.env");

const SERVICES = [
  {
    title: "AI Provider",
    vars: [
      { key: "API_KEY", label: "API Key", placeholder: "sk-...", required: true },
      { key: "API_BASE_URL", label: "API Base URL", placeholder: "https://api.deepseek.com/v1", default: "https://api.deepseek.com/v1" },
      { key: "MODEL_NAME", label: "Model Name", placeholder: "deepseek-chat", default: "deepseek-chat" },
    ],
  },
  {
    title: "GitHub",
    vars: [
      { key: "GITHUB_TOKEN", label: "Personal Access Token", placeholder: "ghp_..." },
    ],
  },
  {
    title: "Google Workspace (Gmail, Calendar, Drive)",
    vars: [
      { key: "GOOGLE_CLIENT_EMAIL", label: "Service Account Email", placeholder: "...@...iam.gserviceaccount.com" },
      { key: "GOOGLE_PRIVATE_KEY", label: "Private Key", placeholder: "-----BEGIN PRIVATE KEY-----\\n..." },
      { key: "GOOGLE_DELEGATED_USER", label: "Delegated User Email", placeholder: "you@example.com" },
    ],
  },
  {
    title: "Jira",
    vars: [
      { key: "JIRA_EMAIL", label: "Email", placeholder: "user@company.com" },
      { key: "JIRA_API_TOKEN", label: "API Token", placeholder: "..." },
      { key: "JIRA_DOMAIN", label: "Domain", placeholder: "your-domain.atlassian.net" },
    ],
  },
  {
    title: "Slack",
    vars: [
      { key: "SLACK_BOT_TOKEN", label: "Bot Token", placeholder: "xoxb-..." },
      { key: "SLACK_APP_TOKEN", label: "App Token", placeholder: "xapp-..." },
    ],
  },
  {
    title: "PostgreSQL",
    vars: [
      { key: "POSTGRES_URL", label: "Connection URL", placeholder: "postgresql://user:pass@localhost:5432/db" },
    ],
  },
];

async function main() {
  console.log("Roo-Mini Setup Wizard\n");

  const rl = readline.createInterface({ input, output });
  const envVars = {};

  for (const service of SERVICES) {
    console.log(`\n--- ${service.title} ---`);
    for (const v of service.vars) {
      const existing = process.env[v.key];
      const prompt = existing
        ? `${v.label} [current: ${existing.slice(0, 20)}...] (Enter to keep): `
        : `${v.label}${v.required ? " (required)" : ""} [${v.placeholder}]: `;
      const answer = await rl.question(prompt);
      envVars[v.key] = answer.trim() || existing || v.default || "";
    }
  }

  let envContent = "";
  for (const [key, value] of Object.entries(envVars)) {
    if (value) {
      envContent += `${key}=${value}\n`;
    }
  }

  await fs.writeFile(ENV_PATH, envContent);
  console.log(`\nConfiguration written to ${ENV_PATH}`);
  rl.close();
}

main().catch(console.error);
