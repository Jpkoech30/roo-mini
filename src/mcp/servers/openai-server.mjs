import { MCPRegistry } from "../mcpRegistry.mjs";
import OpenAI from "openai";

let openaiClient = null;

function getClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set. Set it in .env or environment.");
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * OpenAI MCP Server
 *
 * Provides LLM chat completions as MCP tools.
 */
export function registerOpenAIMCP() {
  const server = MCPRegistry.createServer("openai", "1.0.0");

  server.registerTool({
    name: "chat_completion",
    description: "Send a chat message to OpenAI (GPT-4o-mini by default) and get a response.",
    inputSchema: {
      type: "object",
      properties: {
        messages: {
          type: "array",
          description: "Array of { role, content } messages.",
        },
        model: {
          type: "string",
          description: "Model to use (default: gpt-4o-mini).",
        },
        temperature: {
          type: "number",
          description: "Sampling temperature (0-2).",
        },
        max_tokens: {
          type: "number",
          description: "Max tokens in response.",
        },
      },
      required: ["messages"],
    },
    handler: async (args) => {
      const client = getClient();
      const completion = await client.chat.completions.create({
        model: args.model || "gpt-4o-mini",
        messages: args.messages,
        temperature: args.temperature ?? 0.7,
        max_tokens: args.max_tokens || 2048,
      });
      const choice = completion.choices[0];
      return {
        content: [{ type: "text", text: choice.message.content }],
        usage: completion.usage,
      };
    },
  });

  server.registerTool({
    name: "list_models",
    description: "List available OpenAI models.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const client = getClient();
      const models = await client.models.list();
      return { content: [{ type: "text", text: models.data.map(m => m.id).join("\n") }] };
    },
  });

  return server;
}
