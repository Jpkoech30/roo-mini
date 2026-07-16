#!/usr/bin/env node

/**
 * Jira MCP Server — search, create, transition issues.
 * Requires: JIRA_HOST, JIRA_EMAIL, JIRA_API_TOKEN
 */

import { createInterface } from "readline";

const HOST = process.env.JIRA_HOST;
const AUTH = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString("base64");

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

async function jira(path, method = "GET", body) {
  const res = await fetch(`https://${HOST}/rest/api/3${path}`, {
    method, headers: { "Authorization": `Basic ${AUTH}`, "Accept": "application/json", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {throw new Error(`Jira ${res.status}: ${(await res.text()).slice(0, 200)}`);}
  return res.json();
}

const TOOLS = {
  jira_search: {
    schema: { type: "object", properties: { jql: { type: "string" }, maxResults: { type: "integer" } }, required: ["jql"] },
    handler: async (a) => {
      const d = await jira(`/search?jql=${encodeURIComponent(a.jql)}&maxResults=${a.maxResults || 10}`);
      if (!d.issues?.length) {return "📭 No issues found.";}
      return d.issues.map(i => `  • ${i.key}: ${i.fields.summary} [${i.fields.status.name}]`).join("\n");
    },
  },
  jira_get_issue: {
    schema: { type: "object", properties: { issueKey: { type: "string" } }, required: ["issueKey"] },
    handler: async (a) => {
      const i = await jira(`/issue/${a.issueKey}`);
      return `${i.key}: ${i.fields.summary}\nStatus: ${i.fields.status.name}\nType: ${i.fields.issuetype.name}\n${i.fields.description ? `\n${i.fields.description}` : ""}`;
    },
  },
  jira_create_issue: {
    schema: { type: "object", properties: { project: { type: "string" }, summary: { type: "string" }, issueType: { type: "string" }, description: { type: "string" } }, required: ["project", "summary"] },
    handler: async (a) => {
      const i = await jira("/issue", "POST", { fields: { project: { key: a.project }, summary: a.summary, issuetype: { name: a.issueType || "Task" }, description: { content: [{ content: [{ text: a.description || "", type: "text" }], type: "paragraph" }], type: "doc", version: 1 } } });
      return `✅ Created ${i.key}: ${i.self}`;
    },
  },
};

async function handleMethod(method, params) {
  if (method === "initialize") {return { protocolVersion: "0.1.0", capabilities: { tools: {} }, serverInfo: { name: "jira-mcp", version: "1.0.0" } };}
  if (method === "tools/list") {return { tools: Object.entries(TOOLS).map(([n, t]) => ({ name: n, description: t.description || n, inputSchema: t.schema })) };}
  if (method === "tools/call") { const t = TOOLS[params.name]; if (!t) {throw new Error("Unknown");} return { content: [{ type: "text", text: await t.handler(params.arguments || {}) }] }; }
  throw new Error(`Unknown: ${method}`);
}
