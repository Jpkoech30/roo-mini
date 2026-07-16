import { MCPRegistry } from "./mcpRegistry.mjs";

/**
 * MCP Client
 *
 * Provides a unified interface to call any tool from any registered MCP server.
 */
export class MCPClient {
  constructor() {
    this.registry = MCPRegistry;
  }

  /**
   * List all available tools across all servers.
   */
  listTools() {
    const tools = [];
    for (const [serverName, server] of this.registry.servers.entries()) {
      for (const [toolName, tool] of server.tools.entries()) {
        tools.push({
          server: serverName,
          name: toolName,
          description: tool.description,
          inputSchema: tool.inputSchema,
        });
      }
    }
    return tools;
  }

  /**
   * Call a tool by name (searched across all servers).
   */
  async callTool(toolName, args, context = {}) {
    for (const [, server] of this.registry.servers.entries()) {
      if (server.tools.has(toolName)) {
        return await server.tools.get(toolName).handler(args, context);
      }
    }
    return { error: `Tool "${toolName}" not found on any registered MCP server.` };
  }

  /**
   * Call a tool on a specific server.
   */
  async callToolOnServer(serverName, toolName, args, context = {}) {
    const server = this.registry.servers.get(serverName);
    if (!server) return { error: `Server "${serverName}" not found.` };
    if (!server.tools.has(toolName))
      return { error: `Tool "${toolName}" not found on server "${serverName}".` };
    return await server.tools.get(toolName).handler(args, context);
  }
}

// Singleton
export const mcpClient = new MCPClient();
