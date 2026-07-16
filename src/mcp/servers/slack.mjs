#!/usr/bin/env node

/**
 * Slack MCP Server — read channels, send messages, search.
 * Requires: SLACK_TOKEN (xoxb-... or xoxp-...)
 */

import { createInterface } from "readline";

const TOKEN = process.env.SLACK_TOKEN;
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
async function slack(method, path, body) {
  const res = await fetch(`https://slack.com/api${path}`, {
    method, headers: { "Authorization": `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await res.json();
  if (!d.ok) {throw new Error(`Slack: ${d.error}`);}
  return d;
}

const TOOLS = {
  slack_channels: {
    schema: { type: "object", properties: {} },
    handler: async () => {
      const d = await slack("GET", "/conversations.list?types=public_channel,private_channel&limit=20");
      return d.channels.map(c => `  #${c.name}${c.is_member ? " (member)" : ""}${c.topic?.value ? ` — ${c.topic.value}` : ""}`).join("\n");
    },
  },
  slack_read: {
    schema: { type: "object", properties: { channel: { type: "string" }, limit: { type: "integer" } }, required: ["channel"] },
    handler: async (a) => {
      const d = await slack("GET", `/conversations.history?channel=${a.channel}&limit=${a.limit || 10}`);
      if (!d.messages?.length) {return "📭 No messages.";}
      return d.messages.map(m => `  [${m.user || "system"}] ${m.text}`).join("\n");
    },
  },
  slack_send: {
    schema: { type: "object", properties: { channel: { type: "string" }, text: { type: "string" } }, required: ["channel", "text"] },
    handler: async (a) => {
      await slack("POST", "/chat.postMessage", { channel: a.channel, text: a.text });
      return `✅ Sent to #${a.channel}`;
    },
  },
};

async function handleMethod(method, params) {
  if (method === "initialize") {return { protocolVersion: "0.1.0", capabilities: { tools: {} }, serverInfo: { name: "slack-mcp", version: "1.0.0" } };}
  if (method === "tools/list") {return { tools: Object.entries(TOOLS).map(([n, t]) => ({ name: n, description: t.description || n, inputSchema: t.schema })) };}
  if (method === "tools/call") { const t = TOOLS[params.name]; if (!t) {throw new Error("Unknown");} return { content: [{ type: "text", text: await t.handler(params.arguments || {}) }] }; }
  throw new Error(`Unknown: ${method}`);
}
