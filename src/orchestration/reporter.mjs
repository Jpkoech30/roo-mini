/**
 * Task Reporter — aggregates results from sub-tasks and generates summaries.
 */

import { getDatabase } from "../memory/database.mjs";

/**
 * Generate a summary report for a project or parent task.
 * Aggregates all sub-task statuses, results, and changed files.
 *
 * @param {number} [projectId] - Project to report on
 * @param {number} [parentId] - Parent task to report on
 * @returns {object} Report object
 */
export function generateReport(projectId, parentId) {
  try {
    const db = getDatabase();
    const filter = {};
    if (projectId !== undefined) { filter.project_id = projectId; }
    if (parentId !== undefined) { filter.parent_id = parentId; }
    const tasks = db.listTasks(filter);

    if (tasks.length === 0) {
      return {
        totalTasks: 0,
        completed: 0,
        failed: 0,
        blocked: 0,
        pending: 0,
        inProgress: 0,
        status: "empty",
        summary: "No tasks found.",
        taskDetails: [],
        changedFiles: [],
      };
    }

    const completed = tasks.filter(t => t.status === "done");
    const failed = tasks.filter(t => t.status === "blocked");
    const cancelled = tasks.filter(t => t.status === "cancelled");
    const pending = tasks.filter(t => t.status === "pending");
    const inProgress = tasks.filter(t => t.status === "in_progress");

    // Extract file references from task results and descriptions
    const fileRegex = /[\w./-]+\.\w+/g;
    const changedFilesSet = new Set();
    const taskDetails = [];

    for (const task of tasks) {
      const detail = {
        id: task.id,
        title: task.title,
        mode: task.mode || "code",
        status: task.status,
        priority: task.priority || 0,
      };

      if (task.result) {
        detail.result = task.result.slice(0, 200);
        // Extract file references
        const files = task.result.match(fileRegex) || [];
        for (const f of files) {
          if (f.length > 3 && !f.startsWith("http") && !f.includes("@")) {
            changedFilesSet.add(f);
          }
        }
      }

      if (task.description) {
        detail.description = task.description.slice(0, 100);
      }

      taskDetails.push(detail);
    }

    // Determine overall status
    let status;
    if (completed.length === tasks.length) {
      status = "completed";
    } else if (failed.length > 0 || cancelled.length > (cancelled.length > 0 ? 0 : 0)) {
      // Some failed
      if (completed.length > 0 || inProgress.length > 0) {
        status = "partial";
      } else {
        status = "failed";
      }
    } else if (inProgress.length > 0) {
      status = "in_progress";
    } else {
      status = "pending";
    }

    // Build summary text
    const total = tasks.length;
    const done = completed.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    let summary = `Progress: ${done}/${total} tasks complete (${pct}%)\n`;

    if (completed.length > 0) {
      summary += `✅ Completed: ${completed.map(t => t.title).join(", ")}\n`;
    }
    if (inProgress.length > 0) {
      summary += `🔄 In progress: ${inProgress.map(t => t.title).join(", ")}\n`;
    }
    if (pending.length > 0) {
      summary += `⏳ Pending: ${pending.map(t => t.title).join(", ")}\n`;
    }
    if (failed.length > 0) {
      summary += `🚫 Blocked: ${failed.map(t => t.title).join(", ")}\n`;
    }
    if (cancelled.length > 0) {
      summary += `🗑️ Cancelled: ${cancelled.map(t => t.title).join(", ")}\n`;
    }

    if (changedFilesSet.size > 0) {
      summary += `\n📁 Files modified:\n${Array.from(changedFilesSet).map(f => `  - ${f}`).join("\n")}\n`;
    }

    return {
      totalTasks: total,
      completed: done,
      failed: failed.length,
      blocked: failed.length,
      cancelled: cancelled.length,
      pending: pending.length,
      inProgress: inProgress.length,
      status,
      summary,
      taskDetails,
      changedFiles: Array.from(changedFilesSet),
    };
  } catch (err) {
    return {
      totalTasks: 0,
      completed: 0,
      failed: 0,
      blocked: 0,
      cancelled: 0,
      pending: 0,
      inProgress: 0,
      status: "error",
      summary: `Report generation failed: ${err.message}`,
      taskDetails: [],
      changedFiles: [],
    };
  }
}

/**
 * Format a report as a human-readable string.
 */
export function formatReport(report) {
  if (report.status === "empty") {
    return "📭 No tasks to report.";
  }

  if (report.status === "error") {
    return `❌ ${report.summary}`;
  }

  const statusEmoji = {
    completed: "✅",
    partial: "⚠️",
    failed: "❌",
    in_progress: "🔄",
    pending: "⏳",
  };

  const header = `${statusEmoji[report.status] || "📋"} Orchestration Report\n`;
  const progress = `📊 ${report.summary.split("\n")[0]}\n`;
  const details = report.summary.split("\n").slice(1).join("\n");

  return `${header}${progress}${details}`;
}

/**
 * Save a report to project memory for persistence.
 */
export async function saveReportToMemory(projectId, report) {
  try {
    const { storeMemory } = await import("../tools/impl/tasks.mjs");
    const key = projectId ? `report:project:${projectId}` : "report:latest";
    const value = JSON.stringify({
      timestamp: new Date().toISOString(),
      status: report.status,
      totalTasks: report.totalTasks,
      completed: report.completed,
      summary: report.summary,
    });
    return await storeMemory(null, { key, value, category: "fact" });
  } catch { /* best effort */ }
}

export default {
  generateReport,
  formatReport,
  saveReportToMemory,
};
