/**
 * Tool executor — dispatches to built-in implementations or MCP servers.
 *
 * Tool resolution order:
 * 1. Built-in tools (from impl/)
 * 2. MCP server tools (from roo.config.json)
 */

import { toolImplementations } from "./impl/index.mjs";
import { getMCP } from "../mcp/client.mjs";

// Tool classification for mode enforcement
const READ_ONLY_TOOLS = ["read_file", "list_files", "search_in_file", "search_files_glob",
  "show_memory", "search_memory", "list_tasks", "get_memory"];
const WRITE_TOOLS = [
  "write_file", "replace_in_file", "append_to_file", "apply_diff",
  "move_file", "delete_file", "create_directory", "execute_shell",
  "update_project_memory", "create_task", "update_task", "store_memory",
];

// Approval mode
const APPROVAL_ENABLED = process.env.ROO_APPROVE === "true" || process.argv.includes("--approve");
const APPROVAL_TOOLS = ["write_file", "replace_in_file", "append_to_file", "apply_diff",
  "delete_file", "move_file", "execute_shell"];

async function requestApproval(toolName, args) {
  // Skip approval prompt if stdin is not a TTY (piped input)
  if (!process.stdin.isTTY) {return true;}

  const summary = Object.entries(args)
    .map(([k, v]) => {
      const val = typeof v === "string" && v.length > 80 ? v.slice(0, 80) + "..." : String(v);
      return `${k}: ${val}`;
    })
    .join("\n  ");

  return new Promise(resolve => {
    process.stdout.write(`\n🔐 Approve ${toolName}?\n  ${summary}\n  [y/N] `);
    const onData = (chunk) => {
      const answer = chunk.toString().trim().toLowerCase();
      process.stdin.removeListener("data", onData);
      process.stdin.pause();
      resolve(answer === "y" || answer === "yes");
    };
    process.stdin.resume();
    process.stdin.on("data", onData);
  });
}

/**
 * Execute a tool by name with the given arguments.
 * Routes to built-in or MCP server depending on availability.
 */
export async function executeTool(toolName, args, mode = "code") {
  if (!toolName || typeof toolName !== "string") {return "❌ Invalid tool name.";}
  if (!args || typeof args !== "object") {return "❌ Missing or invalid arguments.";}

  // Mode enforcement
  if (mode === "ask" && !READ_ONLY_TOOLS.includes(toolName)) {
    return `❌ Tool "${toolName}" is not allowed in Ask mode.`;
  }
  if (mode === "architect" && WRITE_TOOLS.includes(toolName)) {
    return `❌ Tool "${toolName}" is not allowed in Architect mode.`;
  }

  // Approval mode
  if (APPROVAL_ENABLED && APPROVAL_TOOLS.includes(toolName)) {
    const approved = await requestApproval(toolName, args);
    if (!approved) {return `⏭️ Skipped ${toolName} (not approved)`;}
  }

  // Try built-in first
  if (toolImplementations[toolName]) {
    try {
      return await toolImplementations[toolName](process.cwd(), args);
    } catch (err) {
      return `❌ Error in ${toolName}: ${err.message}`;
    }
  }

  // Try MCP server
  try {
    const mcp = getMCP();
    if (mcp.initialized && mcp.toolMap[toolName]) {
      return await mcp.callTool(toolName, args);
    }
    if (mcp.initialized && !mcp.toolMap[toolName]) {
      return `❌ Tool "${toolName}" is not available. Available MCP tools: ${Object.keys(mcp.toolMap).join(", ") || "none"}`;
    }
  } catch { /* MCP not available */ }

  return `❌ Unknown tool: ${toolName}`;
}

/**
 * Get all available tools (built-in + MCP).
 */
export async function getAllTools() {
  const tools = [];

  // Built-in tools
  for (const [name] of Object.entries(toolImplementations)) {
    tools.push(name);
  }

  // MCP tools
  try {
    const mcp = getMCP();
    if (mcp.initialized) {
      for (const t of mcp.getTools()) {
        tools.push(t.function.name);
      }
    }
  } catch { /* MCP not available */ }

  return [...new Set(tools)]; // deduplicate
}
