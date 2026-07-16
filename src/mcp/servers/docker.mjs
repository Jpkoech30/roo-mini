#!/usr/bin/env node

/**
 * Docker MCP Server — list containers, view logs, exec read-only commands.
 * Requires: docker CLI available on PATH.
 */

import { createInterface } from "readline";
import { execSync } from "child_process";

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
function docker(args) {
  return execSync(`docker ${args}`, { encoding: "utf-8", timeout: 15000 }).trim();
}

/** Sanitize a container name — only allow safe characters. */
function sanitize(name) {
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    throw new Error(`Invalid container name: "${name}". Only letters, numbers, dots, hyphens, underscores allowed.`);
  }
  return name;
}

const TOOLS = {
  docker_ps: {
    schema: { type: "object", properties: { all: { type: "boolean" } } },
    handler: async (a) => docker(`ps ${a.all ? "-a" : ""} --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"`),
  },
  docker_logs: {
    schema: { type: "object", properties: { container: { type: "string" }, tail: { type: "integer" } }, required: ["container"] },
    handler: async (a) => docker(`logs --tail ${a.tail || 50} ${sanitize(a.container)}`),
  },
  docker_inspect: {
    schema: { type: "object", properties: { container: { type: "string" } }, required: ["container"] },
    handler: async (a) => docker(`inspect ${sanitize(a.container)} --format '{{json .}}'`),
  },
  docker_images: {
    schema: { type: "object", properties: {} },
    handler: async () => docker(`images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"`),
  },
};

async function handleMethod(method, params) {
  if (method === "initialize") {return { protocolVersion: "0.1.0", capabilities: { tools: {} }, serverInfo: { name: "docker-mcp", version: "1.0.0" } };}
  if (method === "tools/list") {return { tools: Object.entries(TOOLS).map(([n, t]) => ({ name: n, description: t.description || n, inputSchema: t.schema })) };}
  if (method === "tools/call") { const t = TOOLS[params.name]; if (!t) {throw new Error("Unknown");} return { content: [{ type: "text", text: await t.handler(params.arguments || {}) }] }; }
  throw new Error(`Unknown: ${method}`);
}
