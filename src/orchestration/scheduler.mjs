import { getDatabase } from "../memory/database.mjs";

/**
 * Topological sort of tasks (DAG) for a given project.
 */
export function topologicalSort(projectId) {
  const db = getDatabase();
  const tasks = db.listTasks({ project_id: projectId });
  if (!tasks.length) return { success: false, error: "No tasks in project." };

  const graph = new Map();
  for (const task of tasks) {
    graph.set(task.id, []);
    const deps = db.getDependencies(task.id);
    for (const dep of deps) {
      graph.get(task.id).push(dep.id);
    }
  }

  const visited = new Set();
  const inStack = new Set();
  const order = [];

  function dfs(node) {
    if (inStack.has(node)) throw new Error("Cycle detected");
    if (visited.has(node)) return;
    inStack.add(node);
    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) dfs(neighbor);
    inStack.delete(node);
    visited.add(node);
    order.push(node);
  }

  try {
    for (const task of tasks) {
      if (!visited.has(task.id)) dfs(task.id);
    }
    return { success: true, order };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Validate a DAG (task list with dependencies).
 */
export function validateDAG(taskList) {
  const ids = new Set(taskList.map((_, i) => i));
  const edges = [];

  for (const [i, task] of taskList.entries()) {
    if (task.depends_on) {
      for (const dep of task.depends_on) {
        const depIdx = taskList.findIndex(t => t.title === dep);
        if (depIdx === -1) return { valid: false, error: `Task "${task.title}" depends on missing "${dep}".` };
        if (depIdx === i) return { valid: false, error: `Task "${task.title}" self-dependency.` };
        edges.push([i, depIdx]);
      }
    }
  }

  // Cycle detection via DFS
  const visited = new Set();
  const inStack = new Set();

  function dfs(node) {
    if (inStack.has(node)) return false;
    if (visited.has(node)) return true;
    inStack.add(node);
    visited.add(node);
    for (const [from, to] of edges) {
      if (from === node && !dfs(to)) return false;
    }
    inStack.delete(node);
    return true;
  }

  for (let i = 0; i < taskList.length; i++) {
    if (!visited.has(i) && !dfs(i)) return { valid: false, error: "Cycle detected in task plan." };
  }

  return { valid: true };
}
