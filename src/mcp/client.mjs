/**
 * MCP Client — connects to MCP servers, discovers tools, routes calls.
 *
 * MCP (Model Context Protocol) allows the agent to dynamically discover
 * tools from external servers. Servers communicate via JSON-RPC over stdio.
 *
 * Each server is a child process. Tools are discovered on init and merged
 * with built-in tools. When the agent calls a tool, it's routed to the
 * right server or the built-in implementation.
 */

import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

let _instance = null;

/**
 * Get the MCP client singleton.
 */
export function getMCP() {
  if (!_instance) {
    _instance = new MCPClient();
  }
  return _instance;
}

export function resetMCP() {
  if (_instance) {
    _instance.close();
    _instance = null;
  }
}

class MCPClient {
  constructor() {
    this.servers = [];       // { name, proc, tools: [] }
    this.toolMap = {};       // toolName → serverName
    this.initialized = false;
    this._msgCounter = 0;    // Monotonic message ID counter
  }

  /**
   * Initialize — load config, spawn servers, discover tools.
   * @param {string} [configPath] - Path to roo.config.json
   */
  async initialize(configPath) {
    if (this.initialized) {return;}

    const cfgPath = configPath || path.join(process.cwd(), "roo.config.json");
    let config;
    try {
      const data = await fs.readFile(cfgPath, "utf-8");
      config = JSON.parse(data);
    } catch {
      // No config file — no MCP servers
      this.initialized = true;
      return;
    }

    const mcpServers = config.mcpServers || {};
    const serverNames = Object.keys(mcpServers);

    for (const name of serverNames) {
      const cfg = mcpServers[name];
      try {
        const server = await this._spawnServer(name, cfg);
        this.servers.push(server);

        // Index tools by name with duplicate detection
        for (const tool of server.tools) {
          if (this.toolMap[tool.name]) {
            console.warn(`  ⚠️ Duplicate tool "${tool.name}" from "${name}" — overrides "${this.toolMap[tool.name]}"`);
          }
          this.toolMap[tool.name] = name;
        }
      } catch (err) {
        console.warn(`⚠️ MCP server "${name}" failed: ${err.message}`);
      }
    }

    this.initialized = true;
  }

  /**
   * Spawn an MCP server process and discover its tools.
   */
  /**
   * Resolve ${VAR} references in a string using process.env.
   */
  _resolveEnv(str) {
    return str.replace(/\$\{(\w+)\}/g, (_, name) => process.env[name] || "");
  }

  async _spawnServer(name, cfg) {
    // Resolve env vars in config values
    const resolvedEnv = {};
    for (const [key, value] of Object.entries(cfg.env || {})) {
      resolvedEnv[key] = this._resolveEnv(String(value));
    }

    const proc = spawn(cfg.command, cfg.args || [], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...resolvedEnv },
    });

    let buffer = "";
    const pending = [];

    proc.stdout.on("data", (chunk) => {
      buffer += chunk.toString();
      this._processMessages(buffer, pending);
    });

    proc.stderr.on("data", (chunk) => {
      // MCP servers may log warnings to stderr
      const msg = chunk.toString().trim();
      if (msg) {console.warn(`  ⚠ [${name}] ${msg}`);}
    });

    proc.on("error", (err) => {
      for (const p of pending) {p.reject(err);}
      pending.length = 0;
    });

    proc.on("exit", (code) => {
      if (code !== 0) {
        for (const p of pending) {p.reject(new Error(`Server exited with code ${code}`));}
        pending.length = 0;
      }
    });

    // Initialize the server
    const initResult = await this._send(proc, pending, buffer, {
      jsonrpc: "2.0",
      method: "initialize",
      params: {},
      id: 1,
    });

    // Discover tools
    const toolResult = await this._send(proc, pending, buffer, {
      jsonrpc: "2.0",
      method: "tools/list",
      params: {},
      id: 2,
    });

    return {
      name,
      proc,
      tools: toolResult.tools || [],
      _pending: pending,
      _buffer: buffer,
    };
  }

  /**
   * Process JSON-RPC messages from the buffer.
   * Validates response has either result or error.
   */
  _processMessages(buffer, pending) {
    let idx;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) {continue;}
      try {
        const msg = JSON.parse(line);
        if (!msg.jsonrpc || (!msg.result && !msg.error)) {
          console.warn(`  ⚠️ MCP: ignoring invalid response (missing result or error)`);
          continue;
        }
        const pend = pending.find(p => p.id === msg.id);
        if (pend) {
          if (msg.error) {pend.reject(new Error(msg.error.message));}
          else {pend.resolve(msg.result);}
          pending.splice(pending.indexOf(pend), 1);
        }
      } catch (parseErr) {
        console.warn(`  ⚠️ MCP: ignoring invalid JSON: ${line.slice(0, 80)}`);
      }
    }
  }

  /**
   * Send a JSON-RPC message to a server and wait for response.
   */
  _send(proc, pending, buffer, msg) {
    return new Promise((resolve, reject) => {
      pending.push({ id: msg.id, resolve, reject });
      proc.stdin.write(JSON.stringify(msg) + "\n");
    });
  }

  /**
   * Get all discovered MCP tools as OpenAI function-calling schemas.
   */
  getTools() {
    const tools = [];
    for (const server of this.servers) {
      for (const tool of server.tools) {
        tools.push({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description || `${tool.name} (via ${server.name} MCP)`,
            parameters: tool.inputSchema || { type: "object", properties: {} },
          },
        });
      }
    }
    return tools;
  }

  /**
   * Call a tool via the appropriate MCP server.
   * @returns {Promise<string>} Result string
   */
  async callTool(toolName, args) {
    const serverName = this.toolMap[toolName];
    if (!serverName) {
      return `❌ MCP tool "${toolName}" not found on any server.`;
    }

    const server = this.servers.find(s => s.name === serverName);
    if (!server) {
      return `❌ MCP server "${serverName}" is not available.`;
    }

    // Guaranteed-unique message ID (counter, not timestamp)
    const msgId = ++this._msgCounter;
    const MCP_TIMEOUT = 30000;

    const result = await Promise.race([
      this._send(server.proc, server._pending, server._buffer, {
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: toolName, arguments: args },
        id: msgId,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`MCP tool "${toolName}" timed out (${MCP_TIMEOUT / 1000}s)`)), MCP_TIMEOUT)
      ),
    ]);

    // MCP result format: { content: [{ type: "text", text: "..." }] }
    if (result.content && Array.isArray(result.content)) {
      return result.content.map(c => c.text || "").join("\n");
    }

    return JSON.stringify(result);
  }

  /**
   * Close all server connections.
   */
  close() {
    for (const server of this.servers) {
      try {
        server.proc.stdin.end();
        server.proc.kill();
      } catch { /* ignore */ }
    }
    this.servers = [];
    this.toolMap = {};
    this.initialized = false;
  }
}

export default MCPClient;
