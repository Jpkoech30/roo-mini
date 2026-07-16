#!/usr/bin/env node

/**
 * Google Workspace MCP Server — Gmail, Calendar, Drive, Search.
 * JSON-RPC over stdio.
 *
 * Auth:
 *   - Search: GOOGLE_API_KEY + GOOGLE_CSE_ID (no OAuth needed)
 *   - Workspace: OAuth 2.0 via googleapis, tokens cached in .roo-memory/
 */

import { createInterface } from "readline";
import { google } from "googleapis";
import fs from "fs/promises";
import path from "path";

const rl = createInterface({ input: process.stdin });
rl.on("line", async (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  try {
    const result = await handleMethod(msg.method, msg.params);
    respond(msg.id, { result });
  } catch (err) {
    respond(msg.id, { error: { message: err.message } });
  }
});
function respond(id, body) {
  process.stdout.write(JSON.stringify({ ...body, id, jsonrpc: "2.0" }) + "\n");
}

// ─── OAuth ───

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.readonly",
];
const TOKEN_PATH = path.join(process.cwd(), ".roo-memory", "google-tokens.json");
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

async function getAuth() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars");
  }
  const oauth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, "urn:ietf:wg:oauth:2.0:oob");

  // Try cached tokens
  try {
    const data = await fs.readFile(TOKEN_PATH, "utf-8");
    oauth.setCredentials(JSON.parse(data));
    return oauth;
  } catch { /* no cached tokens */ }

  // Need new auth — output URL and wait for code
  const url = oauth.generateAuthUrl({ access_type: "offline", scope: SCOPES });
  return new Promise((resolve, reject) => {
    process.stdout.write(`\n🔐 Open this URL to authorize Google Workspace:\n${url}\n👤 Paste the authorization code: `);
    const onData = async (chunk) => {
      const code = chunk.toString().trim();
      process.stdin.removeListener("data", onData);
      process.stdin.pause();
      try {
        const { tokens } = await oauth.getToken(code);
        await fs.mkdir(path.dirname(TOKEN_PATH), { recursive: true });
        await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
        oauth.setCredentials(tokens);
        resolve(oauth);
      } catch (err) {
        reject(new Error(`Auth failed: ${err.message}`));
      }
    };
    process.stdin.resume();
    process.stdin.on("data", onData);
  });
}

// ─── Tool Handlers ───

const SEARCH_API_KEY = process.env.GOOGLE_API_KEY;
const CSE_ID = process.env.GOOGLE_CSE_ID;

const TOOLS = {
  google_search: {
    schema: { type: "object", properties: { query: { type: "string" }, num: { type: "integer" } }, required: ["query"] },
    handler: async (args) => {
      if (!SEARCH_API_KEY || !CSE_ID) {throw new Error("Set GOOGLE_API_KEY and GOOGLE_CSE_ID");}
      const url = `https://www.googleapis.com/customsearch/v1?key=${SEARCH_API_KEY}&cx=${CSE_ID}&q=${encodeURIComponent(args.query)}&num=${args.num || 5}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.items) {return "❌ No results.";}
      return data.items.map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}\n   ${r.link}`).join("\n\n");
    },
  },

  gmail_list: {
    schema: { type: "object", properties: { maxResults: { type: "integer" } } },
    handler: async (args) => {
      const auth = await getAuth();
      const gmail = google.gmail({ version: "v1", auth });
      const res = await gmail.users.messages.list({ userId: "me", maxResults: args.maxResults || 10 });
      if (!res.data.messages?.length) {return "📭 No emails.";}
      const details = await Promise.all(res.data.messages.slice(0, 5).map(m =>
        gmail.users.messages.get({ userId: "me", id: m.id, format: "metadata", metadataHeaders: ["From", "Subject"] })
      ));
      return details.map(d => {
        const headers = d.data.payload.headers;
        const from = headers.find(h => h.name === "From")?.value || "?";
        const subject = headers.find(h => h.name === "Subject")?.value || "(no subject)";
        return `  • ${from} — ${subject}`;
      }).join("\n");
    },
  },

  gmail_send: {
    schema: { type: "object", properties: { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" } }, required: ["to", "subject", "body"] },
    handler: async (args) => {
      const auth = await getAuth();
      const gmail = google.gmail({ version: "v1", auth });
      const utf8Bytes = Buffer.from(
        `To: ${args.to}\nSubject: ${args.subject}\n\n${args.body}`
      );
      const res = await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw: utf8Bytes.toString("base64url") },
      });
      return `✅ Email sent: ${res.data.id}`;
    },
  },

  gmail_search: {
    schema: { type: "object", properties: { query: { type: "string" }, maxResults: { type: "integer" } }, required: ["query"] },
    handler: async (args) => {
      const auth = await getAuth();
      const gmail = google.gmail({ version: "v1", auth });
      const res = await gmail.users.messages.list({ userId: "me", q: args.query, maxResults: args.maxResults || 5 });
      if (!res.data.messages?.length) {return "📭 No emails found.";}
      return `🔍 Found ${res.data.messages.length} email(s) matching "${args.query}"`;
    },
  },

  calendar_list: {
    schema: { type: "object", properties: { maxResults: { type: "integer" } } },
    handler: async (args) => {
      const auth = await getAuth();
      const cal = google.calendar({ version: "v3", auth });
      const res = await cal.events.list({ calendarId: "primary", maxResults: args.maxResults || 10, singleEvents: true, orderBy: "startTime" });
      if (!res.data.items?.length) {return "📭 No upcoming events.";}
      return res.data.items.map(e => {
        const start = e.start?.dateTime || e.start?.date || "?";
        return `  • ${start} — ${e.summary}`;
      }).join("\n");
    },
  },

  calendar_create: {
    schema: { type: "object", properties: { summary: { type: "string" }, start: { type: "string" }, end: { type: "string" }, description: { type: "string" } }, required: ["summary", "start", "end"] },
    handler: async (args) => {
      const auth = await getAuth();
      const cal = google.calendar({ version: "v3", auth });
      const res = await cal.events.insert({
        calendarId: "primary",
        requestBody: { summary: args.summary, description: args.description, start: { dateTime: args.start }, end: { dateTime: args.end } },
      });
      return `✅ Created: ${res.data.htmlLink}`;
    },
  },

  drive_list: {
    schema: { type: "object", properties: { pageSize: { type: "integer" } } },
    handler: async (args) => {
      const auth = await getAuth();
      const drive = google.drive({ version: "v3", auth });
      const res = await drive.files.list({ pageSize: args.pageSize || 10, fields: "files(id,name,mimeType,size)" });
      if (!res.data.files?.length) {return "📭 No files.";}
      return res.data.files.map(f => `  • ${f.name} (${f.mimeType})${f.size ? ` — ${(f.size / 1024).toFixed(0)}KB` : ""}`).join("\n");
    },
  },

  drive_search: {
    schema: { type: "object", properties: { query: { type: "string" }, pageSize: { type: "integer" } }, required: ["query"] },
    handler: async (args) => {
      const auth = await getAuth();
      const drive = google.drive({ version: "v3", auth });
      const res = await drive.files.list({ q: `name contains '${args.query.replace(/'/g, "\\'")}'`, pageSize: args.pageSize || 10, fields: "files(id,name,mimeType)" });
      if (!res.data.files?.length) {return `📭 No files matching "${args.query}".`;}
      return res.data.files.map(f => `  • ${f.name} (${f.mimeType})`).join("\n");
    },
  },
};

// ─── Method Dispatcher ───

async function handleMethod(method, params) {
  if (method === "initialize") {return { protocolVersion: "0.1.0", capabilities: { tools: {} }, serverInfo: { name: "google-workspace-mcp", version: "1.0.0" } };}
  if (method === "tools/list") {return { tools: Object.entries(TOOLS).map(([n, t]) => ({ name: n, description: t.description || n, inputSchema: t.schema })) };}
  if (method === "tools/call") { const t = TOOLS[params.name]; if (!t) {throw new Error(`Unknown: ${params.name}`);} return { content: [{ type: "text", text: await t.handler(params.arguments || {}) }] }; }
  throw new Error(`Unknown: ${method}`);
}
