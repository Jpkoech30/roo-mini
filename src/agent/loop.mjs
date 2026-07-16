import chalk from "chalk";
import { client, getModel, getSummaryModel } from "../config/deepseek.mjs";
import { config } from "../config/index.mjs";
import { getAllToolDefinitions } from "../tools/definitions.mjs";
import { executeTool } from "../tools/executor.mjs";
import { MODES } from "./modes.mjs";
import * as UI from "../ui/printer.mjs";
import { beepResponse, beepError, beepComplete } from "../ui/sound.mjs";
import { loadConversation, appendToConversation } from "../memory/conversationMemory.mjs";
import { loadProjectMemory } from "../memory/memoryBank.mjs";
import { getMCP } from "../mcp/client.mjs";
import fs from "fs/promises";
import path from "path";

function sanitize(str) {
  if (!str) return "";
  return String(str)
    .replace(/\x1b\[[0-9;]*m/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .trim();
}

function estimateTokens(str) {
  if (!str) return 0;
  return Math.ceil(str.length / 4);
}

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
    if (msg.role === "system") total += 50;
  }
  return total;
}

function messageImportance(msg) {
  if (msg.role === "system") return 100;
  if (msg.role === "tool") return 80;
  if (msg.role === "assistant" && msg.tool_calls) return 60;
  return 30;
}

function summarizeMessages(messages, maxTokens = 300) {
  const systemMsg = messages.find(m => m.role === "system");
  const content = messages
    .filter(m => m.role !== "system")
    .map(m => `[${m.role.toUpperCase()}]\n${sanitize(m.content || "")}`)
    .join("\n---\n");

  const summary = `[Summary of ${messages.length - 1} messages]\n${content.slice(0, maxTokens * 4)}`;
  return systemMsg
    ? [{ role: "system", content: systemMsg.content }, { role: "assistant", content: summary }]
    : [{ role: "assistant", content: summary }];
}

export async function startCLI({ verbose = false } = {}) {
  UI.printHeader();
  const mode = process.env.ROO_MODE || "code";
  const modeConfig = MODES[mode] || MODES.code;
  const outputDir = config.outputDir;

  // Append output directory info to the system prompt
  const systemPrompt = `${modeConfig.systemPrompt}\n\nAll files you create or generate should be saved in: ${outputDir}\nWhen asked to create files, use paths like "output/filename.ext".`;

  const messages = [
    { role: "system", content: systemPrompt },
  ];

  // ── Fix 1: Load last 3 exchanges from past sessions as context ──
  try {
    const pastConversation = await loadConversation();
    const recentTurns = pastConversation.slice(-3);
    if (recentTurns.length > 0) {
      const pastContext = recentTurns.map(t =>
        `User: ${(t.user || "").slice(0, 200)}\nYou: ${(t.assistant || "").slice(0, 200)}`
      ).join("\n\n---\n\n");
      messages.push({
        role: "system",
        content: `Previous session context (recent exchanges):\n${pastContext}`,
      });
    }
  } catch { /* memory file may not exist yet */ }

  // ── Fix 2: Inject project memory ──
  try {
    const projectMem = await loadProjectMemory();
    if (projectMem) {
      console.log(chalk.dim(`📁 Project context loaded (${projectMem.length} chars)`));
    }
  } catch { /* no project memory yet */ }

  const readline = (await import("readline")).createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "",
  });

  console.log(chalk.dim(`Mode: ${modeConfig.name} | Model: ${getModel()}`));
  console.log(chalk.dim("Type 'exit' to quit, 'mode' to change mode.\n"));

  function askQuestion(query) {
    return new Promise(resolve => {
      readline.question(query, resolve);
    });
  }

  let iteration = 0;
  let running = true;

  while (running) {
    let userInput;
    try {
      userInput = await askQuestion(chalk.bold.cyan("\nYou: "));
    } catch {
      // stdin closed (e.g., piped input ended)
      break;
    }
    const trimmed = userInput.trim();

    if (!trimmed) continue;
    if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") { running = false; break; }
    if (trimmed.toLowerCase() === "clear" || trimmed.toLowerCase() === "cls") {
      console.clear();
      UI.printHeader();
      continue;
    }
    if (trimmed.toLowerCase() === "help" || trimmed.toLowerCase() === ":h") {
      UI.printHelp(mode);
      continue;
    }
    if (trimmed.toLowerCase() === "mode") {
      const modeList = Object.entries(MODES)
        .map(([key, m]) => `${key}: ${m.name} — ${m.description}`)
        .join("\n");
      console.log(chalk.yellow(`Available modes:\n${modeList}`));
      const newMode = (await askQuestion("Switch to mode: ")).trim().toLowerCase();
      if (MODES[newMode]) {
        process.env.ROO_MODE = newMode;
        messages.length = 0;
        messages.push({ role: "system", content: MODES[newMode].systemPrompt });
        console.log(chalk.green(`Switched to ${MODES[newMode].name} mode.`));
      } else {
        console.log(chalk.red(`Unknown mode: ${newMode}`));
      }
      continue;
    }

    // ── Fix 3: Sliding window — summarize old turns, keep recent verbatim ──
    if (estimateTotalTokens(messages) > 16000) {
      // Keep all system prompts
      const systemMsgs = messages.filter(m => m.role === "system");
      // Keep last 2 user/assistant exchanges verbatim
      const keepCount = 4; // 2 user + 2 assistant messages
      const recent = messages.filter(m => m.role !== "system").slice(-keepCount);
      // Summarize the rest
      const older = messages.filter(m => m.role !== "system").slice(0, -keepCount);
      if (older.length > 0) {
        const summary = `[Summary of ${older.length} earlier messages]\n${older.map(m =>
          `[${m.role.toUpperCase()}]\n${sanitize((m.content || "").slice(0, 300))}`
        ).join("\n---\n")}`;
        messages.length = 0;
        messages.push(...systemMsgs);
        messages.push({ role: "assistant", content: summary });
        messages.push(...recent);
      }
    }

    messages.push({ role: "user", content: trimmed });

    let continueLoop = true;
    iteration = 0;

    while (continueLoop && iteration < config.maxIterations) {
      iteration++;

      try {
        // ── Show thinking spinner while waiting for LLM ──
        const thinking = UI.createSpinner(chalk.dim("🤔 Thinking..."));

        const response = await client.chat.completions.create({
          model: getModel(),
          messages,
          tools: [...getAllToolDefinitions(), ...getMCP().getTools()],
          tool_choice: "auto",
          max_tokens: 4096,
        });

        thinking.stop();
        beepResponse();

        const choice = response.choices[0];
        if (!choice) {
          const msg = "No response from model.";
          messages.push({ role: "assistant", content: msg });
          continueLoop = false;
          break;
        }

        const msg = choice.message;

        if (msg.tool_calls && msg.tool_calls.length > 0) {
          // ── Show tool calls with narrative feedback ──
          messages.push({
            role: "assistant",
            content: msg.content || "",
            tool_calls: msg.tool_calls.map(tc => ({
              id: tc.id,
              type: "function",
              function: { name: tc.function.name, arguments: tc.function.arguments },
            })),
          });

          for (const toolCall of msg.tool_calls) {
            const name = toolCall.function.name;
            let args;
            try {
              args = JSON.parse(toolCall.function.arguments);
            } catch {
              args = {};
            }

            // Show tool narrative with icon and name
            UI.printToolNarrative(name, `${name} → ${JSON.stringify(args).slice(0, 80)}`);
            const toolSpinner = UI.createSpinner(chalk.dim(`  Running ${name}...`));

            const result = await executeTool(name, args, process.cwd());

            const resultStr = typeof result === "string" ? result : JSON.stringify(result, null, 2);
            toolSpinner.stop(chalk.dim(`  ✓ ${name} done`));
            beepResponse();

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: sanitize(resultStr.slice(0, config.toolResultMaxChars)),
            });
          }
        } else {
          // ── Show response with typewriter effect ──
          if (msg.content) {
            const cleaned = sanitize(msg.content);
            // Typewriter effect — character by character
            await UI.typewriterWrite(cleaned);
            console.log(); // newline after typewriter
            // Then show the full boxen card
            UI.printAssistantMessage(cleaned);
          } else {
            messages.push({ role: "assistant", content: "(No response)" });
          }
          continueLoop = false;
        }
      } catch (err) {
        beepError();
        const errorMsg = `Error: ${err.message}`;
        console.error(chalk.red(errorMsg));
        messages.push({ role: "assistant", content: errorMsg });
        continueLoop = false;
      }
    }
  }

  // ── Save conversation to memory (fire & forget) ──
  (async () => {
    try {
      for (let i = 0; i < messages.length - 1; i++) {
        const user = messages[i];
        const asst = messages[i + 1];
        if (user.role === "user" && asst.role === "assistant") {
          appendToConversation(user.content, asst.content).catch(() => {});
        }
      }
    } catch { /* best effort */ }
  })();

  try {
    readline.close();
  } catch { /* already closed */ }
  beepComplete();
  console.log(chalk.dim("\nGoodbye!"));
  process.exit(0);
}
