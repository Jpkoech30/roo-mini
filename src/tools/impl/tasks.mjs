import { getDatabase } from "../../memory/database.mjs";
import { validateDAG } from "../../orchestration/scheduler.mjs";

export async function createTask(_cwd, args) {
  if (!args.title || typeof args.title !== "string")
    return "Missing 'title' (string required).";
  try {
    const db = getDatabase();
    const id = db.createTask(args.title, {
      description: args.description,
      priority: args.priority,
      tags: args.tags,
      status: "pending",
    });
    return `Created task #${id}: "${args.title}"`;
  } catch (err) {
    return `Failed to create task: ${err.message}`;
  }
}

export async function updateTask(_cwd, args) {
  if (args.task_id === undefined || typeof args.task_id !== "number")
    return "Missing 'task_id' (number required).";
  const validStatuses = ["pending", "in_progress", "done", "blocked", "cancelled"];
  if (args.status && !validStatuses.includes(args.status))
    return `Invalid status. Choose: ${validStatuses.join(", ")}`;
  try {
    const db = getDatabase();
    db.updateTask(args.task_id, {
      status: args.status,
      title: args.title,
      priority: args.priority,
    });
    const statusMsg = args.status ? ` -> ${args.status}` : "";
    return `Updated task #${args.task_id}${statusMsg}`;
  } catch (err) {
    return `Failed to update task: ${err.message}`;
  }
}

export async function listTasks(_cwd, args) {
  try {
    const db = getDatabase();
    const tasks = db.listTasks({ status: args.status, tag: args.tag });
    if (!tasks.length) return "No tasks found.";
    const statusIcon = { pending: "[ ]", in_progress: "[~]", done: "[x]", blocked: "[!]", cancelled: "[-]" };
    return tasks.map(t => {
      const icon = statusIcon[t.status] || "[?]";
      return `${icon} #${t.id} ${t.title} (${t.status})`;
    }).join("\n");
  } catch (err) {
    return `Failed to list tasks: ${err.message}`;
  }
}

export async function storeMemory(_cwd, args) {
  if (!args.key || !args.value) return "Missing 'key' or 'value'.";
  try {
    const db = getDatabase();
    db.storeMemory(args.key, String(args.value));
    return `Stored memory: ${args.key}`;
  } catch (err) {
    return `Failed to store memory: ${err.message}`;
  }
}

export async function getMemory(_cwd, args) {
  if (!args.key) return "Missing 'key'.";
  try {
    const db = getDatabase();
    const value = db.getMemory(args.key);
    return value ? `Memory: ${args.key} = ${value}` : `No memory found for "${args.key}".`;
  } catch (err) {
    return `Failed to get memory: ${err.message}`;
  }
}

export async function searchMemory(_cwd, args) {
  try {
    const { searchConversations } = await import("../../memory/search.mjs");
    const results = await searchConversations(args.query, { limit: args.limit || 5 });
    if (!results.length) return "No relevant past context found.";
    return results.map((r, i) => `[${i + 1}] ${r.sessionId} | ${r.role}: ${r.snippet.slice(0, 120)}`).join("\n");
  } catch (err) {
    return `Search failed: ${err.message}`;
  }
}

export async function createSubTask(_cwd, args) {
  if (args.parent_id === undefined || typeof args.parent_id !== "number")
    return "Missing 'parent_id' (number required).";
  if (!args.title || typeof args.title !== "string")
    return "Missing 'title' (string required).";
  try {
    const db = getDatabase();
    const id = db.createTask(args.title, {
      description: args.description,
      parent_id: args.parent_id,
      mode: args.mode || "code",
      status: "pending",
    });
    return `Created sub-task #${id} under #${args.parent_id}: "${args.title}"`;
  } catch (err) {
    return `Failed to create sub-task: ${err.message}`;
  }
}

export async function createTaskDAG(_cwd, args) {
  if (!args.tasks || !Array.isArray(args.tasks) || args.tasks.length === 0)
    return "Missing 'tasks' (non-empty array required).";
  try {
    const db = getDatabase();
    const validation = validateDAG(args.tasks);
    if (!validation.valid) return `Invalid DAG: ${validation.error}`;

    const projectId = args.project_id || Date.now();
    const taskMap = {};
    const createdIds = [];

    for (const t of args.tasks) {
      const id = db.createTask(t.title, {
        description: t.description,
        mode: t.mode || "code",
        priority: t.priority || 0,
        status: "pending",
        project_id: projectId,
      });
      taskMap[t.title] = id;
      createdIds.push(id);
    }

    for (const t of args.tasks) {
      if (t.depends_on && t.depends_on.length > 0) {
        for (const depTitle of t.depends_on) {
          const depId = taskMap[depTitle];
          if (depId) {
            db.addDependency(taskMap[t.title], depId);
          }
        }
      }
    }

    return `Created DAG with ${args.tasks.length} tasks (project #${projectId}).\nTasks: ${createdIds.join(", ")}`;
  } catch (err) {
    return `Failed to create DAG: ${err.message}`;
  }
}

export async function listTaskDAG(_cwd, args) {
  try {
    const db = getDatabase();
    const filter = {};
    if (args.project_id !== undefined) filter.project_id = args.project_id;
    if (args.parent_id !== undefined) filter.parent_id = args.parent_id;
    const tasks = db.listTasks(filter);
    if (!tasks.length) return "No tasks found.";

    let result = "Task DAG:\n";
    const printTask = (task, indent) => {
      const icon = { pending: "[ ]", in_progress: "[~]", done: "[x]", blocked: "[!]", cancelled: "[-]" }[task.status] || "[?]";
      result += `${"  ".repeat(indent)}${icon} #${task.id} ${task.title} (${task.status})\n`;
      const children = tasks.filter(t => t.parent_id === task.id);
      for (const child of children) printTask(child, indent + 1);
    };
    const roots = tasks.filter(t => !t.parent_id);
    for (const root of roots) printTask(root, 0);
    return result;
  } catch (err) {
    return `Failed to list DAG: ${err.message}`;
  }
}
