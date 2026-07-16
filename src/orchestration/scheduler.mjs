/**
 * Task Scheduler — manages DAG execution order.
 *
 * Responsibilities:
 * - Topological sort of tasks by dependencies
 * - Identify "ready" tasks (all dependencies met)
 * - Detect circular dependencies
 * - Track progress as tasks complete
 */

import { getDatabase } from "../memory/database.mjs";

/**
 * Status constants used by the scheduler.
 */
const ACTIVE_STATUSES = new Set(["pending", "in_progress"]);
const COMPLETED_STATUSES = new Set(["done", "cancelled"]);

/**
 * Result of a topological sort or readiness check.
 * @typedef {object} ScheduleResult
 * @property {boolean} success - True if the DAG is valid
 * @property {string|null} error - Error message if invalid
 * @property {Array} [order] - Topologically sorted task IDs (on success)
 * @property {Array} [cycle] - Tasks involved in a cycle (on failure)
 */

/**
 * Topologically sort tasks by their dependencies.
 * Uses Kahn's algorithm (BFS-based).
 *
 * @param {number} projectId - Project to sort tasks for
 * @param {number} [parentId] - Optional parent task filter
 * @returns {ScheduleResult}
 */
export function topologicalSort(projectId, parentId) {
  try {
    const db = getDatabase();

    // Get all tasks for this scope
    const filter = { project_id: projectId };
    if (parentId !== undefined) { filter.parent_id = parentId; }
    const tasks = db.listTasks(filter);

    if (tasks.length === 0) {
      return { success: true, order: [] };
    }

    // Build adjacency list: taskId → [dependentIds]
    const taskIds = new Set(tasks.map(t => t.id));
    const inDegree = {};   // taskId → number of unresolved dependencies
    const adjacency = {};  // taskId → [tasks that depend on it]

    for (const task of tasks) {
      inDegree[task.id] = 0;
      adjacency[task.id] = [];
    }

    // Count dependencies
    for (const task of tasks) {
      const deps = db.getDependencies(task.id);
      // Only count dependencies that are in our task set
      const relevantDeps = deps.filter(d => taskIds.has(d.id));
      inDegree[task.id] = relevantDeps.length;

      for (const dep of relevantDeps) {
        if (!adjacency[dep.id]) { adjacency[dep.id] = []; }
        adjacency[dep.id].push(task.id);
      }
    }

    // Kahn's algorithm
    const queue = [];
    for (const [taskId, degree] of Object.entries(inDegree)) {
      if (degree === 0) {
        queue.push(parseInt(taskId));
      }
    }

    const sorted = [];
    while (queue.length > 0) {
      const current = queue.shift();
      sorted.push(current);

      for (const dependent of (adjacency[current] || [])) {
        inDegree[dependent]--;
        if (inDegree[dependent] === 0) {
          queue.push(dependent);
        }
      }
    }

    // Check if all tasks were sorted (no cycles)
    if (sorted.length !== tasks.length) {
      const sortedSet = new Set(sorted);
      const involved = tasks
        .filter(t => !sortedSet.has(t.id))
        .map(t => ({ id: t.id, title: t.title }));

      return {
        success: false,
        error: `Circular dependency detected involving ${involved.length} task(s)`,
        cycle: involved,
        order: sorted,
      };
    }

    return { success: true, order: sorted };
  } catch (err) {
    return { success: false, error: `Scheduler error: ${err.message}`, order: [] };
  }
}

/**
 * Get all tasks that are ready to execute (all dependencies done/cancelled).
 *
 * @param {number} [projectId] - Optional project filter
 * @param {number} [parentId] - Optional parent task filter
 * @returns {Array} Ready tasks with full data
 */
export function getReadyTasks(projectId, parentId) {
  try {
    const db = getDatabase();

    const filter = { project_id: projectId };
    if (parentId !== undefined) { filter.parent_id = parentId; }
    const tasks = db.listTasks(filter);

    if (tasks.length === 0) {return [];}

    const taskIds = new Set(tasks.map(t => t.id));
    const ready = [];

    for (const task of tasks) {
      if (task.status !== "pending" && task.status !== "in_progress") {continue;}

      const deps = db.getDependencies(task.id);
      // Only consider dependencies within our scope
      const relevantDeps = deps.filter(d => taskIds.has(d.id));

      if (relevantDeps.length === 0) {
        ready.push(task);
        continue;
      }

      // All dependencies must be done or cancelled
      const allMet = relevantDeps.every(dep =>
        COMPLETED_STATUSES.has(dep.status)
      );

      if (allMet) {
        ready.push(task);
      }
    }

    return ready;
  } catch (err) {
    console.warn(`⚠️ getReadyTasks failed: ${err.message}`);
    return [];
  }
}

/**
 * Get the execution plan summary for a project.
 * Returns the topological order with each task's status and mode.
 *
 * @param {number} projectId
 * @param {number} [parentId]
 * @returns {object} Plan summary
 */
export function getExecutionPlan(projectId, parentId) {
  const sortResult = topologicalSort(projectId, parentId);

  if (!sortResult.success) {
    return {
      valid: false,
      error: sortResult.error,
      cycle: sortResult.cycle,
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      steps: [],
    };
  }

  try {
    const db = getDatabase();
    const filter = { project_id: projectId };
    if (parentId !== undefined) { filter.parent_id = parentId; }
    const taskMap = {};
    for (const t of db.listTasks(filter)) {
      taskMap[t.id] = t;
    }

    const steps = sortResult.order.map(id => {
      const task = taskMap[id];
      if (!task) {return null;}
      return {
        id: task.id,
        title: task.title,
        mode: task.mode || "code",
        status: task.status,
        priority: task.priority || 0,
      };
    }).filter(Boolean);

    const totalTasks = steps.length;
    const completedTasks = steps.filter(s => s.status === "done" || s.status === "cancelled").length;
    const pendingTasks = steps.filter(s => s.status === "pending" || s.status === "in_progress").length;

    return {
      valid: true,
      totalTasks,
      completedTasks,
      pendingTasks,
      steps,
    };
  } catch (err) {
    return {
      valid: false,
      error: `Failed to build plan: ${err.message}`,
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      steps: [],
    };
  }
}

/**
 * Mark a task as done and return the next set of ready tasks.
 *
 * @param {number} taskId - Task to mark complete
 * @param {object} [options]
 * @param {string} [options.result] - Result/output from the task
 * @param {number} [options.projectId] - Project scope for finding next tasks
 * @param {number} [options.parentId] - Parent scope for finding next tasks
 * @returns {{success: boolean, completed: boolean, nextReady: Array}}
 */
export function completeTask(taskId, options = {}) {
  try {
    const db = getDatabase();

    // Verify task exists and is not already done
    const allTasks = db.listTasks({});
    const task = allTasks.find(t => t.id === taskId);
    if (!task) {
      return { success: false, completed: false, nextReady: [], error: `Task #${taskId} not found` };
    }

    if (task.status === "done") {
      return { success: true, completed: false, nextReady: [], error: "Already done" };
    }

    // Mark as done
    db.updateTask(taskId, {
      status: "done",
      result: options.result || null,
    });

    // Get next ready tasks
    const nextReady = getReadyTasks(options.projectId, options.parentId);

    return { success: true, completed: true, nextReady };
  } catch (err) {
    return { success: false, completed: false, nextReady: [], error: err.message };
  }
}

/**
 * Validate a proposed DAG before creating it.
 * Checks for: empty set, duplicate titles, circular deps, invalid mode references.
 *
 * @param {Array} tasks - Proposed tasks array
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateDAG(tasks) {
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return { valid: false, error: "Task list is empty" };
  }

  // Unique titles
  const titles = tasks.map(t => t.title);
  if (new Set(titles).size !== titles.length) {
    return { valid: false, error: "Task titles must be unique" };
  }

  // Validate modes
  const validModes = ["code", "architect", "ask", "orchestrator"];
  for (const task of tasks) {
    if (task.mode && !validModes.includes(task.mode)) {
      return { valid: false, error: `Invalid mode "${task.mode}" for task "${task.title}"` };
    }
  }

  // Validate depends_on references
  const titleSet = new Set(titles);
  for (const task of tasks) {
    if (task.depends_on && Array.isArray(task.depends_on)) {
      for (const dep of task.depends_on) {
        if (!titleSet.has(dep)) {
          return { valid: false, error: `Task "${task.title}" depends on "${dep}" which is not in this set` };
        }
        if (dep === task.title) {
          return { valid: false, error: `Task "${task.title}" cannot depend on itself` };
        }
      }
    }
  }

  // Check for cycles in proposed DAG
  // Build adjacency and in-degree as we would for topological sort
  // We simulate this without touching the DB
  const inDegree = {};
  const adj = {};

  for (const task of tasks) {
    inDegree[task.title] = 0;
    adj[task.title] = [];
  }

  for (const task of tasks) {
    if (task.depends_on) {
      for (const dep of task.depends_on) {
        inDegree[task.title]++;
        if (!adj[dep]) { adj[dep] = []; }
        adj[dep].push(task.title);
      }
    }
  }

  // Kahn's algorithm on the proposed set
  const queue = titles.filter(t => inDegree[t] === 0);
  const sorted = [];
  while (queue.length > 0) {
    const current = queue.shift();
    sorted.push(current);
    for (const dependent of (adj[current] || [])) {
      inDegree[dependent]--;
      if (inDegree[dependent] === 0) {
        queue.push(dependent);
      }
    }
  }

  if (sorted.length !== tasks.length) {
    return { valid: false, error: "Circular dependency detected in proposed task DAG" };
  }

  return { valid: true, error: null };
}

export default {
  topologicalSort,
  getReadyTasks,
  getExecutionPlan,
  completeTask,
  validateDAG,
};
