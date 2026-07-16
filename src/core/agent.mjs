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

    // TODO: Integrate with LLM to actually reason and call tools
    const response = `Processing: "${userMessage}"`;

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
