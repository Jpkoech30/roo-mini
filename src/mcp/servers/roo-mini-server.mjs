import { MCPRegistry } from "../mcpRegistry.mjs";
import { toolImplementations } from "../../tools/impl/index.mjs";

/**
 * Roo-Mini MCP Server
 *
 * Registers all built-in tools under the "roo-mini" MCP server.
 * This allows any MCP client to discover and invoke these tools.
 */
export function registerRooMiniMCP() {
  const server = MCPRegistry.createServer("roo-mini", "1.0.0");

  for (const [name, handler] of Object.entries(toolImplementations)) {
    server.registerTool({
      name,
      description: `Roo-mini built-in tool: ${name}`,
      inputSchema: {
        type: "object",
        properties: {},
      },
      handler: async (args, context) => {
        const cwd = context?.cwd || process.cwd();
        const result = await handler(cwd, args);
        return { content: [{ type: "text", text: String(result) }] };
      },
    });
  }

  return server;
}
