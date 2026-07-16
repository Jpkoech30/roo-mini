import { config, loadConfig } from "./config/index.mjs";
import { initDatabase } from "./memory/database.mjs";
import { MCPRegistry } from "./mcp/mcpRegistry.mjs";
import { registerAllServers } from "./mcp/servers/index.mjs";
import { chatLoop } from "./ui/cli.mjs";

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

  console.log(`🐘 Roo-Mini v${config.version} initialized`);
  console.log(`   ${MCPRegistry.listServers().length} MCP servers loaded`);
  console.log(`   Type "exit" to quit.`);

  // 4. Start main loop
  await chatLoop(process.cwd());
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
