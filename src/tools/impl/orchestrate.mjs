import { getDatabase } from "../../memory/database.mjs";
import { executeTask as delegateTask } from "../../orchestration/delegate.mjs";

export async function getTaskStatus(_cwd, args) {
  if (args.task_id === undefined || typeof args.task_id !== "number")
    return "Missing 'task_id' (number required).";
  try {
    const db = getDatabase();
    const tasks = db.listTasks({});
    const task = tasks.find(t => t.id === args.task_id);
    if (!task) return `Task #${args.task_id} not found.`;

    const icon = { pending: "[ ]", in_progress: "[~]", done: "[x]", blocked: "[!]", cancelled: "[-]" }[task.status] || "[?]";
    let result = `${icon} Task #${task.id}: ${task.title}\n   Status: ${task.status}\n`;
    if (task.description) result += `   Description: ${task.description}\n`;
    if (task.priority > 0) result += `   Priority: ${task.priority}\n`;
    if (task.mode) result += `   Mode: ${task.mode}\n`;
    if (task.result) result += `   Result: ${task.result.slice(0, 200)}\n`;

    const deps = db.getDependencies(task.id);
    if (deps.length > 0) {
      result += "   Depends on:\n";
      for (const dep of deps) {
        result += `    - #${dep.id} ${dep.title} (${dep.status})\n`;
      }
    }
    return result;
  } catch (err) {
    return `Failed to get task status: ${err.message}`;
  }
}

export async function abortTask(_cwd, args) {
  if (args.task_id === undefined || typeof args.task_id !== "number")
    return "Missing 'task_id' (number required).";
  try {
    const db = getDatabase();
    db.updateTask(args.task_id, { status: "cancelled" });
    return `Task #${args.task_id} cancelled.`;
  } catch (err) {
    return `Failed to abort task: ${err.message}`;
  }
}

export async function executeTask(_cwd, args) {
  if (args.task_id === undefined || typeof args.task_id !== "number")
    return "Missing 'task_id' (number required).";
  try {
    const result = await delegateTask(args.task_id);
    return result.success
      ? `Task #${args.task_id} completed.\n${result.result || ""}`
      : `Task #${args.task_id} failed: ${result.error || "Unknown error"}`;
  } catch (err) {
    return `Failed to execute task: ${err.message}`;
  }
}

export async function executePlan(_cwd, args) {
  const projectId = args.project_id;
  if (projectId === undefined) return "Missing 'project_id'.";
  try {
    const db = getDatabase();
    const { topologicalSort } = await import("../../orchestration/scheduler.mjs");
    const sorted = topologicalSort(projectId);
    if (!sorted.success) return `Plan invalid: ${sorted.error}`;

    let completed = 0;
    let failed = 0;
    for (const taskId of sorted.order) {
      const tasks = db.listTasks({});
      const task = tasks.find(t => t.id === taskId);
      if (!task || task.status === "done" || task.status === "cancelled") continue;

      const deps = db.getDependencies(taskId);
      const depsDone = deps.every(d => d.status === "done");
      if (!depsDone) continue;

      const result = await delegateTask(taskId);
      if (result.success) completed++;
      else failed++;
    }
    return `Plan executed: ${completed} completed, ${failed} failed.`;
  } catch (err) {
    return `Failed to execute plan: ${err.message}`;
  }
}
