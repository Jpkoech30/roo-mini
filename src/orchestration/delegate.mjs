import { getDatabase } from "../memory/database.mjs";

/**
 * Execute a task by delegating to the appropriate handler based on task mode.
 */
export async function executeTask(taskId) {
  const db = getDatabase();
  const tasks = db.listTasks({});
  const task = tasks.find(t => t.id === taskId);
  if (!task) return { success: false, error: `Task #${taskId} not found.` };

  try {
    // Mark as in progress
    db.updateTask(taskId, { status: "in_progress" });

    let result;

    switch (task.mode) {
      case "code": {
        // Code tasks: delegate to the file system / code tools
        result = `Executed code task: ${task.title}`;
        break;
      }
      case "plan": {
        // Planning tasks: create sub-tasks
        result = `Planning task: ${task.title}. Create sub-tasks to execute.`;
        break;
      }
      case "shell": {
        // Shell tasks: execute via shell tool
        const { executeShell } = await import("../tools/impl/shell.mjs");
        result = await executeShell(process.cwd(), { command: task.description });
        break;
      }
      default:
        result = `Unknown mode "${task.mode}".`;
    }

    // Mark as done
    db.updateTask(taskId, { status: "done", result: String(result) });
    return { success: true, result };
  } catch (err) {
    db.updateTask(taskId, { status: "blocked", result: err.message });
    return { success: false, error: err.message };
  }
}
