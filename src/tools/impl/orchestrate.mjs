/**
 * Orchestration tool implementations.
 * Provides getTaskStatus and abortTask for task DAG management.
 */

import { getDatabase } from "../../memory/database.mjs";
import { executeTask as delegateTask } from "../../orchestration/delegate.mjs";

/**
 * Show detailed status of a specific task including its dependencies and dependents.
 */
export async function getTaskStatus(_cwd, args) {
  if (args.task_id === undefined || typeof args.task_id !== "number")
    {return "❌ Missing or invalid 'task_id' (number required).";}

  try {
    const db = getDatabase();

    // Get the task
    const tasks = db.listTasks({});
    const task = tasks.find(t => t.id === args.task_id);
    if (!task) {return `❌ Task #${args.task_id} not found.`;}

    const statusIcon = { pending: "⏳", in_progress: "🔄", done: "✅", blocked: "🚫", cancelled: "🗑️" };
    const icon = statusIcon[task.status] || "📋";

    let result = `${icon} Task #${task.id}: ${task.title}\n`;
    result += `   Status: ${task.status}\n`;
    if (task.mode && task.mode !== "code") {result += `   Mode: ${task.mode}\n`;}
    if (task.description) {result += `   Description: ${task.description}\n`;}
    if (task.priority > 0) {result += `   Priority: ${task.priority}\n`;}
    if (task.tags) {
      const tags = JSON.parse(task.tags).join(", ");
      result += `   Tags: ${tags}\n`;
    }
    if (task.created_at) {result += `   Created: ${task.created_at}\n`;}
    if (task.completed_at) {result += `   Completed: ${task.completed_at}\n`;}
    if (task.result) {result += `   Result: ${task.result.slice(0, 200)}${task.result.length > 200 ? "..." : ""}\n`;}

    // Show parent
    if (task.parent_id) {
      const parent = tasks.find(t => t.id === task.parent_id);
      const parentName = parent ? parent.title : `#${task.parent_id}`;
      result += `   Parent: #${task.parent_id} ${parentName}\n`;
    }

    // Show dependencies (what this task depends on)
    const deps = db.getDependencies(task.id);
    if (deps.length > 0) {
      result += `   Depends on:\n`;
      for (const dep of deps) {
        const depIcon = statusIcon[dep.status] || "📋";
        result += `     ${depIcon} #${dep.id} ${dep.title} [${dep.status}]\n`;
      }
    } else {
      result += `   Depends on: (none)\n`;
    }

    // Show dependents (what depends on this task)
    const dependents = db.getDependents(task.id);
    if (dependents.length > 0) {
      result += `   Blocking:\n`;
      for (const dep of dependents) {
        const depIcon = statusIcon[dep.status] || "📋";
        result += `     ${depIcon} #${dep.id} ${dep.title} [${dep.status}]\n`;
      }
    }

    return result;
  } catch (err) {
    return `❌ Failed to get task status: ${err.message}`;
  }
}

/**
 * Cancel a task and all its dependent tasks recursively.
 * Marks them as cancelled with an optional reason.
 */
export async function abortTask(_cwd, args) {
  if (args.task_id === undefined || typeof args.task_id !== "number")
    {return "❌ Missing or invalid 'task_id' (number required).";}

  try {
    const db = getDatabase();

    // Verify task exists
    const tasks = db.listTasks({});
    const task = tasks.find(t => t.id === args.task_id);
    if (!task) {return `❌ Task #${args.task_id} not found.`;}

    if (task.status === "done" || task.status === "cancelled") {
      return `⏭️ Task #${args.task_id} is already ${task.status}. Nothing to abort.`;
    }

    const reason = args.reason || "Aborted by user";
    const cancelled = [];

    // BFS to find all dependents recursively
    const toCancel = [task.id];
    const visited = new Set();

    while (toCancel.length > 0) {
      const currentId = toCancel.shift();
      if (visited.has(currentId)) {continue;}
      visited.add(currentId);

      // Cancel this task
      if (currentId !== task.id) {
        // Store the cancelled task info
        const t = tasks.find(t2 => t2.id === currentId);
        if (t) {cancelled.push(t);}
      }

      // Mark as cancelled (if not already done/cancelled)
      const currentTask = tasks.find(t2 => t2.id === currentId);
      if (currentTask && currentTask.status !== "done" && currentTask.status !== "cancelled") {
        db.updateTask(currentId, { status: "cancelled" });
      }

      // Find all tasks that depend on this one
      const dependents = db.getDependents(currentId);
      for (const dep of dependents) {
        if (!visited.has(dep.id)) {
          toCancel.push(dep.id);
        }
      }
    }

    // Cancel the main task (may have been cancelled above if it was a dependent too, but that's fine)
    db.updateTask(task.id, { status: "cancelled" });

    if (cancelled.length > 0) {
      const depList = cancelled.map(t => `#${t.id} ${t.title}`).join(", ");
      return `✅ Cancelled task #${args.task_id} "${task.title}" (${reason})\n   Also cancelled ${cancelled.length} dependent(s): ${depList}`;
    }

    return `✅ Cancelled task #${args.task_id} "${task.title}" (${reason})`;
  } catch (err) {
    return `❌ Failed to abort task: ${err.message}`;
  }
}

/**
 * Execute a task by spawning a sub-agent in the task's assigned mode.
 */
export async function executeTask(_cwd, args) {
  if (args.task_id === undefined || typeof args.task_id !== "number")
    {return "❌ Missing or invalid 'task_id' (number required).";}

  try {
    const db = getDatabase();

    // Verify task exists
    const tasks = db.listTasks({});
    const task = tasks.find(t => t.id === args.task_id);
    if (!task) {return `❌ Task #${args.task_id} not found.`;}

    if (task.status === "done") {
      return `⏭️ Task #${args.task_id} is already done.`;
    }

    if (task.status === "cancelled") {
      return `⏭️ Task #${args.task_id} was cancelled. Skipping.`;
    }

    // Check dependencies are met
    const deps = db.getDependencies(task.id);
    const incompleteDeps = deps.filter(d => d.status !== "done" && d.status !== "cancelled");
    if (incompleteDeps.length > 0) {
      const depNames = incompleteDeps.map(d => `#${d.id} ${d.title} [${d.status}]`).join(", ");
      return `🚫 Task #${args.task_id} "${task.title}" has incomplete dependencies: ${depNames}`;
    }

    // Execute via delegate
    const modeLabel = task.mode && task.mode !== "code" ? ` (${task.mode} mode)` : "";
    const result = await delegateTask(args.task_id, { verbose: false });

    if (result.success) {
      return `✅ Executed task #${args.task_id}: "${task.title}"${modeLabel}\n   Result: ${result.result || "Completed successfully."}`;
    } else {
      return `❌ Task #${args.task_id} "${task.title}" failed: ${result.error || "Unknown error"}`;
    }
  } catch (err) {
    return `❌ Failed to execute task: ${err.message}`;
  }
}

/**
 * Execute all ready tasks in a project or parent task's DAG.
 * Automatically finds ready tasks, executes them, and continues
 * until all tasks are done or blocked.
 */
export async function executePlan(_cwd, args) {
  const projectId = typeof args.project_id === "number" ? args.project_id : undefined;
  const parentId = typeof args.parent_id === "number" ? args.parent_id : undefined;

  if (projectId === undefined && parentId === undefined) {
    return "❌ Provide either 'project_id' or 'parent_id' to execute a plan.";
  }

  try {
    const db = getDatabase();
    const { getExecutionPlan, getReadyTasks, completeTask } = await import("../../orchestration/scheduler.mjs");
    const { generateReport, formatReport } = await import("../../orchestration/reporter.mjs");

    // Get the execution plan
    const plan = getExecutionPlan(projectId, parentId);
    if (!plan.valid) {
      return `❌ ${plan.error || "Invalid execution plan"}`;
    }

    if (plan.totalTasks === 0) {
      return "📭 No tasks in the plan.";
    }

    const totalTasks = plan.totalTasks;
    const alreadyDone = plan.completedTasks;
    let completed = alreadyDone;
    let failed = 0;
    let skipped = 0;
    const results = [];

    // Execution loop
    let iteration = 0;
    const maxIterations = totalTasks * 2; // Safety valve

    while (iteration < maxIterations) {
      iteration++;

      // Get currently ready tasks
      const readyTasks = getReadyTasks(projectId, parentId);

      if (readyTasks.length === 0) {
        // No ready tasks — check if everything is done
        const updatedPlan = getExecutionPlan(projectId, parentId);
        if (updatedPlan.pendingTasks === 0) {
          break; // All done
        }
        // There are pending but blocked tasks
        const blocked = updatedPlan.steps.filter(s => s.status === "blocked" || s.status === "in_progress");
        if (blocked.length > 0) {
          results.push(`🚫 ${blocked.length} task(s) blocked or stuck`);
          // Mark blocked tasks as blocked in DB
          for (const b of blocked) {
            db.updateTask(b.id, { status: "blocked" });
          }
        }
        break;
      }

      // Execute each ready task
      for (const task of readyTasks) {
        const modeLabel = task.mode && task.mode !== "code" ? ` (${task.mode})` : "";
        results.push(`🔄 Executing #${task.id}: ${task.title}${modeLabel}`);

        const delegateResult = await delegateTask(task.id, { verbose: false });

        if (delegateResult.success) {
          completed++;
          results.push(`✅ Done #${task.id}: ${task.title}`);
        } else {
          failed++;
          db.updateTask(task.id, { status: "blocked" });
          results.push(`❌ Failed #${task.id}: ${task.title} — ${delegateResult.error || "Unknown error"}`);
        }
      }
    }

    // Generate final report
    const report = generateReport(projectId, parentId);
    const reportStr = formatReport(report);

    const summary = [
      `📊 Plan execution complete: ${completed}/${totalTasks} done`,
      failed > 0 ? `   ${failed} failed` : "",
      skipped > 0 ? `   ${skipped} skipped` : "",
      `   ${iteration} round(s)`,
    ].filter(Boolean).join("\n");

    return `${summary}\n\n${results.join("\n")}\n\n${reportStr}`;
  } catch (err) {
    return `❌ Plan execution failed: ${err.message}`;
  }
}
