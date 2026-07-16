/**
 * MCP Registry
 *
 * Central registry for MCP servers and their tools.
 * Each server exposes tools that can be discovered and called.
 */
class MCPServer {
  constructor(name, version = "1.0.0") {
    this.name = name;
    this.version = version;
    this.tools = new Map();
  }

  registerTool({ name, description, inputSchema, handler }) {
    if (this.tools.has(name)) {
      throw new Error(`Tool "${name}" already registered on server "${this.name}".`);
    }
    this.tools.set(name, { name, description, inputSchema, handler });
  }

  getTool(name) {
    return this.tools.get(name);
  }

  listTools() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
  }
}

class MCPRegistryClass {
  constructor() {
    this.servers = new Map();
  }

  createServer(name, version) {
    if (this.servers.has(name)) {
      throw new Error(`MCP server "${name}" already registered.`);
    }
    const server = new MCPServer(name, version);
    this.servers.set(name, server);
    return server;
  }

  getServer(name) {
    return this.servers.get(name);
  }

  listServers() {
    return Array.from(this.servers.keys()).map(name => ({
      name,
      version: this.servers.get(name).version,
      tools: this.servers.get(name).listTools().length,
    }));
  }
}

export const MCPRegistry = new MCPRegistryClass();
