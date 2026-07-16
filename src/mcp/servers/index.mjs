import { registerRooMiniMCP } from "./roo-mini-server.mjs";
import { registerOpenAIMCP } from "./openai-server.mjs";

/**
 * Register all built-in MCP servers.
 */
export function registerAllServers() {
  const servers = [
    registerRooMiniMCP(),
    registerOpenAIMCP(),
  ];
  return servers;
}
