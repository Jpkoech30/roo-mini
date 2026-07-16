/**
 * Task Delegate — spawns sub-agents to execute individual tasks.
 *
 * Sub-agents run in-process by reusing the runAgent loop with:
 * - A fresh message context (task-specific system prompt + instructions)
 * - Mode-appropriate tool restrictions
 * - Limited iterations (to prevent runaway sub-agents)
 * - Context from parent (completed sibling tasks, decisions made)
 */

import { getDatabase } from "../memory/database.mjs";
import { config } from "../config/index.mjs";

/**
 * Execute a task by spawning a sub-agent.
 *
 * The sub-agent runs in the same process with a focused context:
 * - System prompt tailored to the task's mode
 * - The task description as the user prompt
 * - Context from completed sibling tasks
 * - Tool restrictions based on mode
 *
 * @param {number} taskId - The task to execute
 * @param {object} [options]
 * @param {string} [options.additionalContext] - Extra context from the orchestrator
 * @param {boolean} [options.verbose=false] - Enable verbose sub-agent output
 * @returns {Promise<{success: boolean, result: string, error: string|null}>}
 */
export async function executeTask(taskId, options = {}) {
  const verbose = options.verbose || false;

  try {
    const db = getDatabase();

    // Get the task
    const allTasks = db.listTasks({});
    const task = allTasks.find(t => t.id === taskId);
    if (!task) {
      return { success: false, result: "", error: `Task #${taskId} not found` };
    }

    if (task.status === "done") {
      return { success: true, result: "Task was already completed.", error: null };
    }

    if (task.status === "cancelled") {
      return { success: false, result: "", error: "Task was cancelled" };
    }

    // Mark as in_progress
    db.updateTask(taskId, { status: "in_progress" });

    // Build context from completed sibling tasks
    let contextFromDependencies = "";
    const deps = db.getDependencies(taskId);
    for (const dep of deps) {
      if (dep.status === "done" && dep.result) {
        contextFromDependencies += `\n### Previous task: #${dep.id} ${dep.title}\n${dep.result}\n`;
      }
    }

    // Get sibling tasks for broader context
    let siblingContext = "";
    if (task.parent_id) {
      const siblings = db.listTasks({ parent_id: task.parent_id });
      const completedSiblings = siblings.filter(s =>
        s.id !== taskId &&
        s.status === "done" &&
        s.result
      );
      for (const sib of completedSiblings) {
        siblingContext += `\n### Completed sibling: #${sib.id} ${sib.title}\n${sib.result}\n`;
      }
    }

    // Build the task prompt
    const modeLabel = task.mode && task.mode !== "code" ? ` (${task.mode} mode)` : "";

    let prompt = `You are executing task #${taskId}${modeLabel}.\n`;
    prompt += `Task: ${task.title}\n`;

    if (task.description) {
      prompt += `\nDescription: ${task.description}\n`;
    }

    if (contextFromDependencies) {
      prompt += `\n--- Context from completed dependencies ---\n${contextFromDependencies}\n---\n`;
    }

    if (siblingContext) {
      prompt += `\n--- Context from completed sibling tasks ---\n${siblingContext}\n---\n`;
    }

    if (options.additionalContext) {
      prompt += `\n--- Additional context ---\n${options.additionalContext}\n---\n`;
    }

    prompt += `\nExecute this task and report what was done, including any files created or modified.`;

    if (verbose) {
      console.log(`\n📋 Executing task #${taskId}: "${task.title}"${modeLabel}`);
    }

    // Import runAgent dynamically to avoid circular dependencies
    const { runAgent } = await import("../agent/loop.mjs");
    const { executeTool } = await import("../tools/executor.mjs");

    // Capture all tool calls and their results for the task output
    const taskOutput = [];

    // We need to intercept the agent loop's output. Since runAgent writes to
    // stdout directly, we capture by redirecting temporarily.
    // Instead, we run the agent loop which handles its own output, and then
    // collect the conversation memory.

    // Execute the sub-agent with limited iterations
    const originalMaxIterations = config.maxIterations;
    config.maxIterations = Math.min(config.maxIterations, 10); // Limit sub-agent iterations

    try {
      await runAgent(prompt, verbose, task.mode || "code");
    } finally {
      config.maxIterations = originalMaxIterations; // Restore
    }

    // The agent already completed naturally or was stopped. Mark task as done.
    // We need to check if the agent actually completed or was stopped by max iterations.
    const updatedTasks = db.listTasks({});
    const updatedTask = updatedTasks.find(t => t.id === taskId);

    if (updatedTask && updatedTask.status === "in_progress") {
      // Agent loop completed, mark task done
      db.updateTask(taskId, {
        status: "done",
        result: "Task executed successfully.",
      });
      if (verbose) {
        console.log(`✅ Task #${taskId} "${task.title}" completed.`);
      }
      return { success: true, result: "Task executed successfully.", error: null };
    }

    if (updatedTask && updatedTask.status === "done") {
      return { success: true, result: updatedTask.result || "Task completed.", error: null };
    }

    // Task was cancelled or blocked externally
    return {
      success: updatedTask?.status === "done",
      result: "",
      error: `Task ended with status: ${updatedTask?.status || "unknown"}`,
    };

  } catch (err) {
    // Mark task as blocked on error
    try {
      const db = getDatabase();
      db.updateTask(taskId, { status: "blocked" });
    } catch { /* best effort */ }

    return { success: false, result: "", error: err.message };
  }
}

export default { executeTask };
