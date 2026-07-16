import { describe, it, expect } from "@jest/globals";

// Basic sanity: tools are importable
describe("Tool implementations", () => {
  it("should export toolImplementations", async () => {
    const mod = await import("../../src/tools/impl/index.mjs");
    expect(mod.toolImplementations).toBeDefined();
    expect(typeof mod.toolImplementations.read_file).toBe("function");
  });

  it("should have all required tools", async () => {
    const mod = await import("../../src/tools/impl/index.mjs");
    const tools = Object.keys(mod.toolImplementations);
    expect(tools).toContain("read_file");
    expect(tools).toContain("write_file");
    expect(tools).toContain("list_files");
    expect(tools).toContain("execute_shell");
    expect(tools).toContain("create_task");
    expect(tools).toContain("search_memory");
  });
});

describe("MCP Registry", () => {
  it("should register and list servers", async () => {
    const { MCPRegistry } = await import("../../src/mcp/mcpRegistry.mjs");
    const server = MCPRegistry.createServer("test-server", "1.0.0");
    expect(server.name).toBe("test-server");

    const list = MCPRegistry.listServers();
    expect(list.some(s => s.name === "test-server")).toBe(true);
  });

  it("should register tools on a server", async () => {
    const { MCPRegistry } = await import("../../src/mcp/mcpRegistry.mjs");
    const server = MCPRegistry.createServer("tool-server", "1.0.0");
    server.registerTool({
      name: "hello",
      description: "Says hello",
      inputSchema: { type: "object", properties: {} },
      handler: async () => "hello world",
    });
    expect(server.listTools().length).toBe(1);
  });
});
