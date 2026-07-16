import readline from "readline";
import { Agent } from "../core/agent.mjs";
import { appendToConversation, loadProjectMemory } from "../memory/index.mjs";

/**
 * Interactive REPL loop for the CLI.
 * Accepts user input, delegates to the agent, prints responses.
 */
export async function chatLoop(cwd) {
  const agent = new Agent();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "\x1b[36m🐘 \x1b[0m",
    terminal: true,
  });

  // Load project context
  const projectMemory = await loadProjectMemory();
  if (projectMemory) {
    console.log(`\x1b[2m📁 Project context loaded (${projectMemory.length} chars)\x1b[0m`);
  }

  rl.prompt();

  rl.on("line", async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    // Handle built-in commands
    if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
      console.log("Goodbye.");
      rl.close();
      return;
    }

    if (input.toLowerCase() === "clear") {
      console.clear();
      rl.prompt();
      return;
    }

    if (input.toLowerCase() === "help") {
      console.log(`
Commands:
  exit/quit  - Exit the program
  clear      - Clear screen
  help       - Show this help

Type anything else to chat with the agent.
      `);
      rl.prompt();
      return;
    }

    // Process via agent
    try {
      const response = await agent.processMessage(input);
      console.log(`\n${response}\n`);
      await appendToConversation(input, response);
    } catch (err) {
      console.error(`\nError: ${err.message}\n`);
    }

    rl.prompt();
  });

  rl.on("close", () => {
    process.exit(0);
  });
}
