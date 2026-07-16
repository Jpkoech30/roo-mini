import { toolImplementations } from "./impl/index.mjs";
import { getMCP } from "../mcp/client.mjs";

const READ_ONLY_TOOLS = new Set(["read_file", "list_files", "search_in_file", "search_files_glob",
  "show_memory", "search_memory", "list_tasks", "get_memory",
  "get_task_status", "list_task_dag"]);

const APPROVAL_TOOLS = new Set(["write_file", "replace_in_file", "append_to_file", "apply_diff",
  "delete_file", "move_file", "execute_shell", "abort_task"]);

const APPROVAL_ENABLED = process.env.ROO_APPROVE === "true" || process.argv.includes("--approve");

async function requestApproval(toolName, args) {
  if (!process.stdin.isTTY) return true;
  const summary = Object.entries(args)
    .map(([k, v]) => `${k}: ${typeof v === "string" && v.length > 80 ? v.slice(0, 80) + "..." : String(v)}`)
    .join("\n  ");

  return new Promise(resolve => {
    process.stdout.write(`\nApprove ${toolName}?\n  ${summary}\n  [y/N] `);
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

export async function executeTool(toolName, args, cwd) {
  // Mode enforcement for architect/ask modes
  const mode = process.env.ROO_MODE || "code";
  if ((mode === "architect" || mode === "ask") && !READ_ONLY_TOOLS.has(toolName)) {
    return `Cannot use "${toolName}" in ${mode} mode. Ask/Architect modes are read-only.`;
  }

  // Approval gate
  if (APPROVAL_ENABLED && APPROVAL_TOOLS.has(toolName)) {
    const approved = await requestApproval(toolName, args);
    if (!approved) {
      return `User denied approval for ${toolName}.`;
    }
  }

  // 1. Try built-in implementation
  if (toolImplementations[toolName]) {
    try {
      const result = await toolImplementations[toolName](cwd || process.cwd(), args);
      return result;
    } catch (err) {
      return `Error executing ${toolName}: ${err.message}`;
    }
  }

  // 2. Try MCP server
  const mcp = getMCP();
  if (mcp.toolMap && mcp.toolMap[toolName]) {
    try {
      const result = await mcp.callTool(toolName, args);
      return result;
    } catch (err) {
      return `MCP error in ${toolName}: ${err.message}`;
    }
  }

  // 3. Unknown tool — show available tools for debugging
  const builtinCount = Object.keys(toolImplementations).length;
  const mcpCount = mcp.toolMap ? Object.keys(mcp.toolMap).length : 0;
  const totalTools = builtinCount + mcpCount;
  const availableBuiltins = Object.keys(toolImplementations).join(", ");
  return `❌ Unknown tool: "${toolName}" (${totalTools} tools available).\nBuilt-in tools: ${availableBuiltins}`;
}
