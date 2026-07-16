#!/usr/bin/env node

/**
 * PostgreSQL MCP Server — query databases (read-only SELECT only).
 * Requires: PG_URL (postgresql://user:pass@host:5432/db)
 */

import { createInterface } from "readline";

const PG_URL = process.env.PG_URL;
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

// Dynamic import of pg — only loaded when this server starts
let pg;
try { pg = await import("pg"); } catch { /* will error on tool call */ }

function getPool() {
  if (!PG_URL) {throw new Error("Set PG_URL");}
  if (!pg) {throw new Error("Install 'pg' package: npm install pg");}
  return new pg.default(PG_URL);
}

const TOOLS = {
  pg_tables: {
    schema: { type: "object", properties: { schema: { type: "string" } } },
    handler: async (a) => {
      const pool = getPool();
      const res = await pool.query(`SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = $1`, [a.schema || "public"]);
      await pool.end();
      if (!res.rows.length) {return "📭 No tables found.";}
      return res.rows.map(r => `  • ${r.table_name} (${r.table_type})`).join("\n");
    },
  },
  pg_describe: {
    schema: { type: "object", properties: { table: { type: "string" }, schema: { type: "string" } }, required: ["table"] },
    handler: async (a) => {
      const pool = getPool();
      const res = await pool.query(`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2`, [a.schema || "public", a.table]);
      await pool.end();
      if (!res.rows.length) {return `📭 Table "${a.table}" not found.`;}
      return res.rows.map(r => `  • ${r.column_name} (${r.data_type})${r.is_nullable === "YES" ? " NULL" : " NOT NULL"}${r.column_default ? ` = ${r.column_default}` : ""}`).join("\n");
    },
  },
  pg_query: {
    schema: { type: "object", properties: { sql: { type: "string" }, params: { type: "array" } }, required: ["sql"] },
    handler: async (a) => {
      // Safety: only allow SELECT queries
      if (!/^\s*SELECT\b/i.test(a.sql)) {throw new Error("Only SELECT queries are allowed.");}
      const pool = getPool();
      const res = await pool.query(a.sql, a.params || []);
      await pool.end();
      if (!res.rows?.length) {return "📭 No results.";}
      // Format as simple table
      const cols = Object.keys(res.rows[0]);
      const header = cols.join(" │ ");
      const rows = res.rows.slice(0, 20).map(r => cols.map(c => String(r[c] ?? "NULL").slice(0, 40)).join(" │ "));
      return [header, "─".repeat(header.length), ...rows].join("\n");
    },
  },
};

async function handleMethod(method, params) {
  if (method === "initialize") {return { protocolVersion: "0.1.0", capabilities: { tools: {} }, serverInfo: { name: "postgres-mcp", version: "1.0.0" } };}
  if (method === "tools/list") {return { tools: Object.entries(TOOLS).map(([n, t]) => ({ name: n, description: t.description || n, inputSchema: t.schema })) };}
  if (method === "tools/call") { const t = TOOLS[params.name]; if (!t) {throw new Error("Unknown");} return { content: [{ type: "text", text: await t.handler(params.arguments || {}) }] }; }
  throw new Error(`Unknown: ${method}`);
}
