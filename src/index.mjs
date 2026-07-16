import { config, loadConfig } from "./config/index.mjs";
import { initDatabase } from "./memory/database.mjs";
import { MCPRegistry } from "./mcp/mcpRegistry.mjs";
import { registerAllServers } from "./mcp/servers/index.mjs";
import { startCLI } from "./agent/loop.mjs";
import { getMCP } from "./mcp/client.mjs";

/**
 * Roo-Mini: A lightweight AI coding assistant
 *
 * Main entry point that initializes everything and starts the REPL.
 */
async function main() {
  // 1. Load configuration
  loadConfig();

  // 2. Initialize database (SQLite for memory & tasks)
  initDatabase();

  // 3. Register built-in MCP servers (roo-mini tools, OpenAI, etc.)
  registerAllServers();

  // 4. Initialize external MCP client (connects to roo.config.json servers)
  try {
    await getMCP().initialize();
  } catch (err) {
    console.warn(`  ⚠ MCP client init: ${err.message}`);
  }

  console.log(`🐘 Roo-Mini v${config.version} initialized`);
  console.log(`   ${MCPRegistry.listServers().length} MCP servers loaded`);
  console.log(`   Type "exit" to quit.`);

  // 5. Start the real agent loop with LLM, tools, and modes
  await startCLI({ verbose: process.argv.includes("-v") || process.argv.includes("--verbose") });
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
