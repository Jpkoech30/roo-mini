import { client, getModel, getSummaryModel } from "../config/deepseek.mjs";
import { config } from "../config/index.mjs";
import { tools as allTools } from "../tools/definitions.mjs";
import { executeTool } from "../tools/executor.mjs";
import { MODES } from "./modes.mjs";
import * as UI from "../ui/printer.mjs";
import fs from "fs/promises";
import path from "path";

// ─── Utilities ───
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Sanitize string content for API messages — strips ANSI codes, control chars.
 */
function sanitize(str) {
  if (!str) {return "";}
  // Strip ANSI escape sequences (\x1b[...m)
  // Strip other control characters except newlines and tabs
  return String(str)
    .replace(/\x1b\[[0-9;]*m/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .trim();
}

/**
 * Rough token estimation (~4 characters per token on average for code/text).
 * @param {string} str - Text to estimate
 * @returns {number} Estimated token count
 */
function estimateTokens(str) {
  if (!str) {return 0;}
  return Math.ceil(str.length / 4);
}

/**
 * Calculate the total estimated tokens across all messages.
 */
function estimateTotalTokens(messages) {
  let total = 0;
  for (const msg of messages) {
    total += estimateTokens(msg.content || "");
    if (msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        total += estimateTokens(tc.function.name);
        total += estimateTokens(tc.function.arguments);
      }
    }
    if (msg.role === "system") {total += 50;} // system prompt overhead
  }
  return total;
}

/**
 * Assign an importance score to a message (higher = more important to keep).
 * @param {object} msg - The message object
 * @returns {number} Importance score
 */
function messageImportance(msg) {
  // System messages are critical
  if (msg.role === "system") {return 100;}
  // Tool results contain actual file contents / outputs
  if (msg.role === "tool") {return 80;}
  // Assistant messages with tool calls contain the agent's reasoning
  if (msg.role === "assistant" && msg.tool_calls?.length > 0) {return 60;}
  // Assistant messages without tool calls are usually just thinking
  if (msg.role === "assistant") {return 40;}
  // User messages with content
  if (msg.role === "user" && msg.content?.length > 20) {return 50;}
  // Short user messages (confirmations, simple answers)
  if (msg.role === "user") {return 30;}
  return 10;
}

/**
 * Exponential backoff with jitter.
 * @param {number} attempt - Current retry attempt (0-based)
 * @returns {number} Milliseconds to wait
 */
function getBackoff(attempt) {
  const exp = Math.min(config.backoffBaseMs * Math.pow(2, attempt), config.backoffMaxMs);
  const jitter = Math.random() * 0.3 * exp;
  return Math.floor(exp + jitter);
}

// ─── Token-aware context window management ───
const CONTEXT_BUDGET_TOKENS = 32000; // Soft limit: trigger summarization when exceeded
const MIN_TOKENS_TO_KEEP = 4000;     // Always keep at least this many tokens recent

/**
 * Token-aware context window management.
 *
 * Strategy (in order):
 * 1. If total tokens < budget, do nothing
 * 2. First try smart eviction: drop lowest-importance messages that aren't part of
 *    recent tool-call pairs
 * 3. If still over budget, summarize the oldest low-importance content
 * 4. Fallback: naive truncation keeping only the most recent messages
 *
 * @param {Array} messages
 * @param {boolean} [verbose=false]
 * @returns {Array} Managed messages
 */
async function summarizeConversation(messages, verbose = false) {
  const totalTokens = estimateTotalTokens(messages);
  if (totalTokens < CONTEXT_BUDGET_TOKENS) {return messages;}

  if (verbose) {console.log(`🧠 Context: ~${totalTokens} tokens (budget: ${CONTEXT_BUDGET_TOKENS}). Managing...`);}

  const system = messages.find(m => m.role === "system");

  // Find the boundary of the most recent tool-call exchange
  let cutIndex = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "assistant" && msg.tool_calls?.length > 0) {
      cutIndex = i;
      break;
    }
  }

  // If the conversation is too short to summarize, just return
  if (cutIndex < 3) {
    if (verbose) {console.log("  ↳ Too short to summarize. Keeping all.");}
    return messages;
  }

  const protectedMsgs = messages.slice(cutIndex); // Always keep recent tool-call pairs
  const candidates = messages.slice(0, cutIndex).filter(m => m !== system);

  // ── Phase 1: Smart eviction (drop lowest-importance messages) ──
  // Score each candidate, sort ascending, drop lowest until under budget or only essentials remain
  const essentials = []; // high-importance messages to keep
  const droppable = [];  // low-importance messages that can be removed

  for (const msg of candidates) {
    const score = messageImportance(msg);
    if (score >= 50) {
      essentials.push(msg);
    } else {
      droppable.push({ msg, score });
    }
  }

  // Sort droppable by importance ascending (lowest first)
  droppable.sort((a, b) => a.score - b.score);

  const remainingTokens = estimateTotalTokens(protectedMsgs) + estimateTotalTokens(essentials);
  let toDrop = 0;
  for (const _item of droppable) {
    if (remainingTokens + estimateTotalTokens(essentials.slice(toDrop)) < CONTEXT_BUDGET_TOKENS) {break;}
    toDrop++;
  }

  const dropped = droppable.slice(0, toDrop);
  const kept = [...essentials, ...droppable.slice(toDrop).map(d => d.msg)];

  if (verbose && dropped.length > 0) {
    console.log(`  ↳ Evicted ${dropped.length} low-importance message(s)`);
  }

  const afterEviction = estimateTotalTokens([...kept, ...protectedMsgs]);
  if (afterEviction < CONTEXT_BUDGET_TOKENS) {
    const result = [];
    if (system) {result.push(system);}
    result.push(...kept, ...protectedMsgs);
    return result;
  }

  // ── Phase 2: LLM summarization of the oldest content ──
  const summaryContent = kept
    .filter(m => m.role !== "tool")
    .map(m => {
      if (m.role === "assistant" && m.tool_calls) {
        const toolNames = m.tool_calls.map(tc => tc.function.name).join(", ");
        return `assistant: [Tool calls: ${toolNames}]${m.content ? ` content: ${m.content}` : ""}`;
      }
      return `${m.role}: ${m.content || ""}`;
    })
    .join("\n");

  if (summaryContent.trim().length < 20) {
    const result = [];
    if (system) {result.push(system);}
    result.push(...protectedMsgs);
    return result;
  }

  if (verbose) {console.log("  ↳ Summarizing older context with LLM...");}

  try {
    const summaryResponse = await client.chat.completions.create({
      model: getSummaryModel(),
      messages: [
        { role: "system", content: "You are a summarization assistant. Summarize the following conversation concisely, focusing on key facts, decisions, and progress. Keep it under 300 words." },
        { role: "user", content: `Summarize this conversation:\n\n${summaryContent}` }
      ],
      temperature: config.summaryTemperature,
      max_tokens: config.summaryMaxTokens,
    });
    const summary = summaryResponse.choices[0].message.content;
    const result = [];
    if (system) {result.push(system);}
    result.push({ role: "user", content: `[Summary of previous conversation]\n${summary}` });
    result.push(...protectedMsgs);
    if (verbose) {console.log(`  ↳ Summarized from ~${totalTokens} tokens to ~${estimateTotalTokens(result)} tokens`);}
    return result;
  } catch (err) {
    console.warn("⚠️ Summarization failed:", err.message);
    // Fallback: drop everything except the most recent protected messages
    const result = [];
    if (system) {result.push(system);}
    const keepCount = Math.min(MIN_TOKENS_TO_KEEP, protectedMsgs.length);
    result.push(...protectedMsgs.slice(-keepCount));
    return result;
  }
}

// ─── Tool restrictions (single source of truth) ───
const READ_ONLY_TOOLS = [
  "read_file", "list_files", "search_in_file", "search_files_glob",
  "show_memory", "search_memory", "list_tasks", "get_memory",
  "get_task_status", "list_task_dag"
];
const WRITE_TOOLS = [
  "write_file", "replace_in_file", "append_to_file", "apply_diff",
  "move_file", "delete_file", "create_directory", "execute_shell",
  "update_project_memory", "create_task", "update_task", "store_memory",
  "create_subtask", "create_task_dag", "abort_task", "execute_task", "execute_plan",
  "browser_open", "browser_navigate", "browser_click", "browser_fill",
  "browser_screenshot", "browser_get_text", "browser_get_html",
  "browser_evaluate", "browser_get_url", "browser_close",
];

function getToolsForMode(mode) {
  // const allToolNames = allTools.map(t => t.function.name);

  if (mode === "ask") {
    return allTools.filter(t => READ_ONLY_TOOLS.includes(t.function.name));
  }
  if (mode === "architect") {
    return allTools.filter(t => !WRITE_TOOLS.includes(t.function.name));
  }
  return allTools; // code mode
}

/**
 * Main agent loop.
 * @param {string} userPrompt - The user's request
 * @param {boolean} [verbose=false] - Enable verbose logging
 * @param {string} [mode="code"] - Agent mode (code, architect, ask)
 */
export async function runAgent(userPrompt, verbose = false, mode = "code") {
  const tools = getToolsForMode(mode);

  // ── SQLite database initialization (MUST be first — other modules depend on it) ──
  try {
    const { getDatabase } = await import("../memory/database.mjs");
    const db = getDatabase();
    await db.initialize();
  } catch (err) {
    if (verbose) {console.warn(`⚠️ Database init: ${err.message}`);}
  }

  // ── MCP initialization ──
  try {
    const { getMCP } = await import("../mcp/client.mjs");
    const mcp = getMCP();
    await mcp.initialize();
    const mcpToolSchemas = mcp.getTools();
    const mcpCount = mcpToolSchemas.length;
    if (mcpCount > 0) {
      const builtinNames = new Set(tools.map(t => t.function.name));
      let added = 0;
      for (const mt of mcpToolSchemas) {
        if (!builtinNames.has(mt.function.name)) {
          tools.push(mt);
          added++;
        }
      }
      if (verbose) {
        console.log(`🔌 MCP: ${added} tool(s) from ${mcp.servers.length} server(s)`);
      }
    }
  } catch (err) {
    if (verbose) {console.warn(`⚠️ MCP init: ${err.message}`);}
  }

  // ── Load conversation memory at startup ──
  let conversationContext = "";
  try {
    const { getConversationSummary } = await import("../memory/conversationMemory.mjs");
    const summary = await getConversationSummary();
    if (summary) {
      conversationContext = `\n\n${summary}\n`;
    }
  } catch (err) {
    if (verbose) {console.warn(`⚠️ Memory load: ${err.message}`);}
  }

  // ── Load project memory (now uses SQLite) ──
  let projectMemory = "";
  try {
    const { loadProjectMemory } = await import("../memory/memoryBank.mjs");
    const pm = await loadProjectMemory();
    if (pm) {projectMemory = `\n--- PROJECT MEMORY ---\n${pm}\n--- END ---\n`;}
  } catch (err) {
    if (verbose) {console.warn(`⚠️ Project memory: ${err.message}`);}
  }

  // ── Project auto-detection ──
  let projectInfo = "";
  try {
    const { detectProject } = await import("../config/projectDetect.mjs");
    const info = await detectProject(process.cwd());
    projectInfo = `\n--- PROJECT CONTEXT ---\nType: ${info.type} (${info.language})\n${info.summary}\n${info.deps.length ? `Dependencies: ${info.deps.slice(0, 20).join(", ")}` : ""}\n--- END ---\n`;
    if (verbose) {console.log(`📋 Detected project: ${info.type} (${info.language})`);}
  } catch (err) {
    if (verbose) {console.warn(`⚠️ Project detection: ${err.message}`);}
  }

  // ── Custom instructions from .roomini ──
  let customInstructions = "";
  try {
    const data = await fs.readFile(path.join(process.cwd(), ".roomini"), "utf-8");
    if (data.trim()) {
      customInstructions = `\n--- CUSTOM INSTRUCTIONS ---\n${data.trim()}\n--- END ---\n`;
      if (verbose) {console.log(`📋 Loaded .roomini (${data.length} chars)`);}
    }
  } catch { /* file doesn't exist */ }

  // ── Custom modes from .roomodes ──
  let customModeConfig = null;
  try {
    const data = await fs.readFile(path.join(process.cwd(), ".roomodes"), "utf-8");
    const parsed = JSON.parse(data);
    if (parsed.modes && parsed.modes[mode]) {
      customModeConfig = parsed.modes[mode];
      if (verbose) {console.log(`📋 Loaded custom mode: ${mode}`);}
    }
  } catch { /* file doesn't exist or invalid */ }

  // Use custom mode config if available, fall back to built-in
  const effectiveModeConfig = customModeConfig || MODES[mode] || MODES.code;

  // ── FTS5 context retrieval from past conversations ──
  let searchContext = "";
  try {
    const { formatSearchQuery, searchConversations } = await import("../memory/search.mjs");
    const ftsQuery = formatSearchQuery(userPrompt);
    const results = await searchConversations(ftsQuery, { limit: 5, includeContent: false });
    if (results.length > 0) {
      searchContext = "\n--- RELEVANT PAST CONTEXT ---\n";
      for (const r of results) {
        searchContext += `[${r.role}] ${r.snippet}\n`;
      }
      searchContext += "--- END ---\n";
      if (verbose) {console.log(`🔍 Found ${results.length} relevant past message(s) via FTS5`);}
    }
  } catch (err) {
    if (verbose) {console.warn(`⚠️ FTS5 search: ${err.message}`);}
  }

  const systemPrompt = `You are a concise AI coding assistant. Be direct, accurate, and minimal.

${sanitize(effectiveModeConfig.systemPrompt)}

${sanitize(customInstructions)}
${sanitize(projectMemory)}
${sanitize(projectInfo)}
${sanitize(searchContext)}
${sanitize(conversationContext)}

Tools: ${tools.map(t => t.function.name).join(", ")}.
</parameter>

Workflow:
1. Do the simplest thing that works
2. If you need more info, ask
3. When done, output "TASK_COMPLETE" + brief summary

Rules:
- Use tools to get facts, don't guess
- If unsure, ask_user
- ${effectiveModeConfig.name || mode} mode: ${mode === "code" ? "full access" : mode === "architect" ? "read + search only" : "read only"}
- Be SHORT. One sentence summaries. No elaborate explanations. No JSON plans unless the task is complex.`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  let iterations = 0;
  let taskComplete = false;
  const toolCallLog = [];
  let sessionPromptTokens = 0;
  let sessionCompletionTokens = 0;
  let sessionCost = 0;

  // Per-token pricing (set via env, defaults to DeepSeek Chat: $0.14/M input, $0.28/M output)
  const pricePerMInput = parseFloat(process.env.PRICE_PER_M_INPUT || "0.14");
  const pricePerMOutput = parseFloat(process.env.PRICE_PER_M_OUTPUT || "0.28");

  while (!taskComplete) {
    iterations++;
    if (verbose) {UI.printStep(iterations, "∞");}

    // ── Max iterations safeguard ──
    if (iterations > config.maxIterations) {
      UI.printWarning(`⚠️ Reached max iterations (${config.maxIterations}). Stopping.`);
      console.log("Partial results:");
      toolCallLog.forEach((e, i) => console.log(`  ${i + 1}. ${e.toolName} → ${(e.result || "").slice(0, 100)}...`));
      break;
    }

    // ── Token-aware context management ──
    const estimatedTokens = estimateTotalTokens(messages);
    if (estimatedTokens > CONTEXT_BUDGET_TOKENS) {
      if (verbose) {console.log(`🧠 Context: ~${estimatedTokens} tokens. Managing...`);}
      try {
        const managed = await summarizeConversation(messages, verbose);
        if (managed && managed.length < messages.length) {
          const oldLen = messages.length;
          messages.length = 0;
          messages.push(...managed);
          if (verbose) {console.log(`✅ Context managed: ${oldLen} → ${messages.length} messages (~${estimateTotalTokens(messages)} tokens)`);}
        }
      } catch (err) {
        if (verbose) {console.warn(`⚠️ Context management failed: ${err.message}`);}
        if (messages.length > 15) {
          const system = messages.find(m => m.role === "system");
          const recent = messages.slice(-10);
          messages.length = 0;
          if (system) {messages.push(system);}
          messages.push(...recent);
          if (verbose) {console.log(`🧹 Truncated to ${messages.length} messages.`);}
        }
      }
    }

    // ── API call with streaming + exponential backoff ──
    let assistantMessage = null;
    let usage = null;
    let attempt = 0;

    while (attempt < config.maxRetries && !assistantMessage) {
      try {
        const stream = await client.chat.completions.create({
          model: getModel(),
          messages,
          tools,
          tool_choice: "auto",
          timeout: config.apiTimeout,
          stream: true,
          stream_options: { include_usage: true },
        });

        // Accumulate streamed content
        let content = "";
        const toolCallAccumulators = {};
        let streamingContent = "";

        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta;

          // Track usage from the final chunk
          if (chunk.usage) {
            usage = chunk.usage;
          }

          if (!delta) {continue;}

          // Accumulate content
          if (delta.content) {
            content += delta.content;
            streamingContent += delta.content;
            // Typewriter effect — print char by char
            await UI.typewriterWrite(delta.content);
          }

          // Accumulate tool calls
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index;
              if (!toolCallAccumulators[idx]) {
                toolCallAccumulators[idx] = {
                  id: tc.id || "",
                  type: tc.type || "function",
                  function: { name: "", arguments: "" }
                };
              }
              if (tc.id) {toolCallAccumulators[idx].id = tc.id;}
              if (tc.function?.name) {toolCallAccumulators[idx].function.name += tc.function.name;}
              if (tc.function?.arguments) {toolCallAccumulators[idx].function.arguments += tc.function.arguments;}
            }
          }

          // Handle finish reason
          const finish = chunk.choices?.[0]?.finish_reason;
          if (finish === "stop" || finish === "tool_calls") {
            break;
          }
        }

        // Newline after streaming content
        if (streamingContent) {process.stdout.write("\n");}

        // Reconstruct assistant message
        const toolCalls = Object.values(toolCallAccumulators);
        assistantMessage = {
          role: "assistant",
          content: content || null,
          ...(toolCalls.length > 0 && { tool_calls: toolCalls.map(tc => ({
            id: tc.id,
            type: tc.type,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments
            }
          }))}),
        };

      } catch (err) {
        // Print newline if we were mid-stream
        process.stdout.write("\n");

        const status = err.status || 500;
        const isRateLimit = status === 429;
        const isServer = status >= 500;
        const isTimeout = err.code === "ETIMEDOUT" || err.code === "ECONNABORTED";
        const isContext = err.message?.includes("context_length") || err.message?.includes("maximum context");

        if (isContext) {
          UI.printWarning("Context window exceeded. Truncating history...");
          if (messages.length > 3) {
            messages.splice(1, 2);
            UI.printWarning(`Truncated to ${messages.length} messages.`);
            continue;
          } else {
            UI.printError("Cannot truncate further. Request too large.");
            throw new Error("Context too large to process.");
          }
        }

        if (isRateLimit || isServer || isTimeout) {
          attempt++;
          if (attempt < config.maxRetries) {
            const wait = getBackoff(attempt);
            UI.printWarning(`⚠️ ${err.message}. Retry ${attempt}/${config.maxRetries - 1} in ${wait / 1000}s...`);
            await sleep(wait);
            continue;
          }
        }

        // Fatal error
        UI.printError(`API Error: ${err.message}`);
        if (status === 401) {
          UI.printError("Invalid API key. Check API_KEY in .env.");
          process.exit(1);
        }
        throw err;
      }
    }

    if (!assistantMessage) {
      UI.printError("No response after retries.");
      return;
    }

    // ── Token usage & cost tracking (verbose only) ──
    if (usage) {
      const { prompt_tokens, completion_tokens, total_tokens } = usage;
      sessionPromptTokens += prompt_tokens;
      sessionCompletionTokens += completion_tokens;
      const callCost = ((prompt_tokens / 1_000_000) * pricePerMInput) + ((completion_tokens / 1_000_000) * pricePerMOutput);
      sessionCost += callCost;
      if (verbose) {
        const costStr = callCost < 0.01 ? `< $0.01` : `$${callCost.toFixed(4)}`;
        const totalCostStr = sessionCost < 0.01 ? `< $0.01` : `$${sessionCost.toFixed(4)}`;
        UI.printToolResult(`📊 Tokens: ${total_tokens} (${prompt_tokens}→${completion_tokens}) · Cost: ${costStr} · Session: ${totalCostStr}`);
      }
    }

    messages.push(assistantMessage);

    if (verbose && assistantMessage.content) {UI.printThought(assistantMessage.content);}

    // ── Natural completion: assistant responded without tool calls → done ──
    const hasToolCalls = assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0;

    if (!hasToolCalls) {
      // Assistant responded with just text — task is complete
      const finalAnswer = (assistantMessage.content || "Task complete.").trim();
      const cleanAnswer = finalAnswer.replace("TASK_COMPLETE", "").trim();
      if (sessionPromptTokens > 0) {
        const totalCostStr = sessionCost < 0.01 ? `< $0.01` : `$${sessionCost.toFixed(4)}`;
        console.log(`📊 Session: ${sessionPromptTokens + sessionCompletionTokens} tokens · ${totalCostStr} · ${iterations} iterations`);
      }
      console.log("───");
      taskComplete = true;
      try {
        const { addToConversation } = await import("../memory/conversationMemory.mjs");
        await addToConversation(userPrompt, cleanAnswer || "Task complete.");
      } catch { }
      break;
    }

    // ── Execute tools ──
    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;
      let args;
      try { args = JSON.parse(toolCall.function.arguments); } catch {
        UI.printError(`Malformed JSON: ${toolCall.function.arguments}`);
        messages.push({ role: "tool", tool_call_id: toolCall.id, content: "❌ Invalid JSON arguments." });
        continue;
      }
      // ── Handle ask_user ──
      if (toolName === "ask_user") {
        if (verbose) {console.log(`❓ Asking user: ${args.question}`);}
        // Read one line from stdin directly (avoid creating nested readline)
        const userAnswer = await new Promise(resolve => {
          process.stdout.write(`\n❓ ${args.question}\n👤 Your answer: `);
          const onData = (chunk) => {
            const line = chunk.toString();
            if (line.includes('\n')) {
              process.stdin.removeListener('data', onData);
              process.stdin.pause();
              resolve(line.trim());
            }
          };
          process.stdin.resume();
          process.stdin.on('data', onData);
        });
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: `User answered: "${userAnswer}"`
        });
        continue;
      }

      // Narrative tool execution
      const result = await executeTool(toolName, args, mode);
      toolCallLog.push({ toolName, args, result });

      const truncated = result.length > config.toolResultMaxChars
        ? result.slice(0, config.toolResultMaxChars) + "..."
        : result;
      messages.push({ role: "tool", tool_call_id: toolCall.id, content: truncated });

      // Show compact narrative for tool results
      if (verbose) {
        UI.printToolAction(toolName, args);
        if (result) {UI.printToolResult(result);}
      } else {
        // Show tool result as a card (Roo Code style)
        UI.printToolCard(toolName, args, result.slice(0, 300), verbose);
      }
    }
  }

  if (!taskComplete) {
    UI.printFallback();
    console.log("Loop ended without TASK_COMPLETE. Partial results:");
    toolCallLog.forEach((e, i) => console.log(`  ${i + 1}. ${e.toolName} → ${(e.result || "").slice(0, 100)}...`));
  }
}
