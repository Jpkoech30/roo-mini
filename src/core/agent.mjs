import { mcpClient } from "../mcp/mcpClient.mjs";

/**
 * Core AI Agent
 *
 * Orchestrates the conversation loop:
 *   user_message -> LLM -> tool_calls -> results -> LLM -> response
 */
export class Agent {
  constructor() {
    this.conversationHistory = [];
  }

  /**
   * Process a user message and return a response.
   */
  async processMessage(userMessage) {
    this.conversationHistory.push({ role: "user", content: userMessage });

    // 1. Build context with available tools
    const tools = mcpClient.listTools();
    const toolContext = tools
      .map(t => `- ${t.name}: ${t.description}`)
      .join("\n");

    // 2. For now, return a simple response showing tool availability
    // TODO: Integrate with LLM to actually reason and call tools
    const response = `Received: "${userMessage}"\n\nAvailable tools (${tools.length}):\n${toolContext}`;

    this.conversationHistory.push({ role: "assistant", content: response });
    return response;
  }

  /**
   * Execute a specific tool call.
   */
  async executeTool(toolName, args, context = {}) {
    return await mcpClient.callTool(toolName, args, context);
  }
}
