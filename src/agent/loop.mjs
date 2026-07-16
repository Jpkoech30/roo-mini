import { client, getModel, getSummaryModel } from "../config/deepseek.mjs";
import { config } from "../config/index.mjs";
import { tools as allTools } from "../tools/definitions.mjs";
import { executeTool } from "../tools/executor.mjs";
import { MODES } from "./modes.mjs";
import * as UI from "../ui/printer.mjs";
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
  UI.printBanner();
  const mode = process.env.ROO_MODE || "code";
  const modeConfig = MODES[mode] || MODES.code;
  const systemPrompt = modeConfig.systemPrompt;

  const messages = [
    { role: "system", content: systemPrompt },
  ];

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
    const userInput = await askQuestion(chalk.bold.cyan("\nYou: "));
    const trimmed = userInput.trim();

    if (!trimmed) continue;
    if (trimmed.toLowerCase() === "exit") { running = false; break; }
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

    // Check token budget — summarize if too large
    if (estimateTotalTokens(messages) > 16000) {
      messages.length = 1; // Keep system prompt
      const summary = `[Session summary: ${iteration} iterations processed. Continuing conversation.]`;
      messages.push({ role: "assistant", content: summary });
    }

    messages.push({ role: "user", content: trimmed });

    let continueLoop = true;
    iteration = 0;

    while (continueLoop && iteration < config.maxIterations) {
      iteration++;

      try {
        const response = await client.chat.completions.create({
          model: getModel(),
          messages,
          tools: allTools,
          tool_choice: "auto",
          max_tokens: 4096,
        });

        const choice = response.choices[0];
        if (!choice) {
          const msg = "No response from model.";
          messages.push({ role: "assistant", content: msg });
          continueLoop = false;
          break;
        }

        const msg = choice.message;

        if (msg.content) {
          UI.printAssistantMessage(sanitize(msg.content));
        }

        if (msg.tool_calls && msg.tool_calls.length > 0) {
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

            if (verbose) {
              console.log(chalk.dim(`  🛠 ${name}(${JSON.stringify(args).slice(0, 100)})`));
            }

            const result = await executeTool(name, args);

            const resultStr = typeof result === "string" ? result : JSON.stringify(result, null, 2);

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: sanitize(resultStr.slice(0, config.toolResultMaxChars)),
            });
          }
        } else {
          if (!msg.content) {
            messages.push({ role: "assistant", content: "(No response)" });
          }
          continueLoop = false;
        }
      } catch (err) {
        const errorMsg = `Error: ${err.message}`;
        console.error(chalk.red(errorMsg));
        messages.push({ role: "assistant", content: errorMsg });
        continueLoop = false;
      }
    }
  }

  readline.close();
  console.log(chalk.dim("\nGoodbye!"));
}

import chalk from "chalk";
