/**
 * Task management tools.
 * Provides CRUD operations for the SQLite tasks table,
 * plus DAG orchestration (createSubTask, createTaskDAG, listTaskDAG).
 */

import { getDatabase } from "../../memory/database.mjs";
import { validateDAG } from "../../orchestration/scheduler.mjs";

/** Create a new task. */
export async function createTask(_cwd, args) {
  if (!args.title || typeof args.title !== "string")
    {return "❌ Missing or invalid 'title' (string required).";}

  try {
    const db = getDatabase();
    const id = db.createTask(args.title, {
      description: args.description,
      priority: args.priority,
      tags: args.tags,
      status: "pending",
    });
    return `✅ Created task #${id}: "${args.title}"`;
  } catch (err) {
    return `❌ Failed to create task: ${err.message}`;
  }
}

/** Update a task's status or fields. */
export async function updateTask(_cwd, args) {
  if (args.task_id === undefined || typeof args.task_id !== "number")
    {return "❌ Missing or invalid 'task_id' (number required).";}
  if (!args.status && !args.title && args.priority === undefined)
    {return "❌ Provide at least one field to update (status, title, or priority).";}

  const validStatuses = ["pending", "in_progress", "done", "blocked", "cancelled"];
  if (args.status && !validStatuses.includes(args.status))
    {return `❌ Invalid status. Choose: ${validStatuses.join(", ")}`;}

  try {
    const db = getDatabase();
    db.updateTask(args.task_id, {
      status: args.status,
      title: args.title,
      priority: args.priority,
    });
    const statusMsg = args.status ? ` → ${args.status}` : "";
    return `✅ Updated task #${args.task_id}${statusMsg}`;
  } catch (err) {
    return `❌ Failed to update task: ${err.message}`;
  }
}

/** List tasks, optionally filtered by status or tag. */
export async function listTasks(_cwd, args) {
  try {
    const db = getDatabase();
    const tasks = db.listTasks({
      status: args.status,
      tag: args.tag,
    });

    if (!tasks.length) {return "📭 No tasks found.";}

    const lines = tasks.map(t => {
      const statusIcon = { pending: "⏳", in_progress: "🔄", done: "✅", blocked: "🚫", cancelled: "🗑️" };
      const icon = statusIcon[t.status] || "📋";
      const tags = t.tags ? JSON.parse(t.tags).join(", ") : "";
      const modeInfo = t.mode && t.mode !== "code" ? ` [${t.mode}]` : "";
      return `  #${t.id} ${icon} ${t.title}${modeInfo} [${t.status}]${tags ? ` (${tags})` : ""}`;
    });

    return `📋 Tasks (${tasks.length}):\n${lines.join("\n")}`;
  } catch (err) {
    return `❌ Failed to list tasks: ${err.message}`;
  }
}

// ═══════════════════════════════════════════════════
//  Orchestration Tools
// ═══════════════════════════════════════════════════

/**
 * Create a sub-task under an existing parent task, with optional dependencies.
 */
export async function createSubTask(_cwd, args) {
  if (args.parent_id === undefined || typeof args.parent_id !== "number")
    {return "❌ Missing or invalid 'parent_id' (number required).";}
  if (!args.title || typeof args.title !== "string")
    {return "❌ Missing or invalid 'title' (string required).";}

  try {
    const db = getDatabase();
    const taskId = db.createTask(args.title, {
      description: args.description,
      priority: args.priority,
      tags: args.tags,
      status: "pending",
      parentId: args.parent_id,
    });

    // Add dependencies on sibling tasks
    if (args.depends_on && Array.isArray(args.depends_on)) {
      for (const depId of args.depends_on) {
        if (typeof depId !== "number") {continue;}
        if (db.wouldCreateCycle(taskId, depId)) {
          return `❌ Cannot add dependency on task #${depId} — would create a cycle.`;
        }
        db.addDependency(taskId, depId);
      }
    }

    const modeInfo = args.mode && args.mode !== "code" ? ` [${args.mode}]` : "";
    return `✅ Created sub-task #${taskId}: "${args.title}"${modeInfo} under #${args.parent_id}`;
  } catch (err) {
    return `❌ Failed to create sub-task: ${err.message}`;
  }
}

/**
 * Create multiple tasks with dependency edges in a single call.
 * Supports cross-referencing by title within the same call.
 */
export async function createTaskDAG(_cwd, args) {
  if (!args.tasks || !Array.isArray(args.tasks) || args.tasks.length === 0)
    {return "❌ Missing or invalid 'tasks' (array required).";}

  try {
    const db = getDatabase();
    const sessionId = null; // Will be set by the agent loop if needed
    const parentId = typeof args.parent_id === "number" ? args.parent_id : null;

    // Validate task titles are unique within this set
    const titles = args.tasks.map(t => t.title);
    if (new Set(titles).size !== titles.length) {
      return "❌ Task titles must be unique within a single create_task_dag call.";
    }

    // Validate modes
    const validModes = ["code", "architect", "ask"];
    for (const task of args.tasks) {
      if (task.mode && !validModes.includes(task.mode)) {
        return `❌ Invalid mode "${task.mode}" for task "${task.title}". Choose: ${validModes.join(", ")}`;
      }
    }

    // Validate depends_on references
    for (const task of args.tasks) {
      if (task.depends_on && Array.isArray(task.depends_on)) {
        for (const depTitle of task.depends_on) {
          if (!titles.includes(depTitle)) {
            return `❌ Task "${task.title}" depends on "${depTitle}" which is not in this task set.`;
          }
          // Prevent self-dependency
          if (depTitle === task.title) {
            return `❌ Task "${task.title}" cannot depend on itself.`;
          }
        }
      }
    }

    // Validate the full DAG for cycles before creating
    const dagValidation = validateDAG(args.tasks);
    if (!dagValidation.valid) {
      return `❌ ${dagValidation.error}`;
    }

    const created = db.createTaskDAG(args.tasks, parentId, sessionId);
    const summary = created.map(t => {
      const deps = t.depends_on?.length ? ` (after: ${t.depends_on.join(", ")})` : "";
      const modeInfo = t.mode !== "code" ? ` [${t.mode}]` : "";
      return `  #${t.id} ${t.title}${modeInfo}${deps}`;
    }).join("\n");

    return `✅ Created ${created.length} task(s):\n${summary}`;
  } catch (err) {
    return `❌ Failed to create task DAG: ${err.message}`;
  }
}

/**
 * Show the task dependency graph as a tree.
 */
export async function listTaskDAG(_cwd, args) {
  try {
    const db = getDatabase();

    // Get tasks, optionally filtered
    const filter = {};
    if (args.project_id !== undefined) { filter.project_id = args.project_id; }
    if (args.parent_id !== undefined) { filter.parent_id = args.parent_id; }

    const tasks = db.listTasks(filter);

    if (!tasks.length) {return "📭 No tasks found matching the filter.";}

    // Build dependency map
    const depMap = {};
    for (const task of tasks) {
      depMap[task.id] = db.getDependencies(task.id).map(d => d.id);
    }

    // Build tree
    const lines = [];
    for (const task of tasks) {
      const statusIcon = { pending: "⏳", in_progress: "🔄", done: "✅", blocked: "🚫", cancelled: "🗑️" };
      const icon = statusIcon[task.status] || "📋";
      const modeInfo = task.mode && task.mode !== "code" ? ` [${task.mode}]` : "";

      let line = `  #${task.id} ${icon} ${task.title}${modeInfo}`;

      // Show dependencies
      if (depMap[task.id] && depMap[task.id].length > 0) {
        const depTasks = depMap[task.id].map(depId => {
          const dep = tasks.find(t => t.id === depId);
          return dep ? `#${dep.id} ${dep.title}` : `#${depId}`;
        });
        line += `\n    ⬅ depends on: ${depTasks.join(", ")}`;
      }

      // Show dependents
      const dependents = db.getDependents(task.id);
      if (dependents.length > 0) {
        const depNames = dependents.map(d => `#${d.id} ${d.title}`);
        line += `\n    ➡ blocks: ${depNames.join(", ")}`;
      }

      lines.push(line);
    }

    return `📋 Task DAG (${tasks.length} tasks):\n${lines.join("\n")}`;
  } catch (err) {
    return `❌ Failed to list task DAG: ${err.message}`;
  }
}

/** Search past conversations using FTS5. */
export async function searchMemory(_cwd, args) {
  if (!args.query || typeof args.query !== "string")
    {return "❌ Missing or invalid 'query' (string required).";}

  const limit = args.limit || 5;

  try {
    const db = getDatabase();
    const results = db.searchConversations(args.query, limit);

    if (!results.length) {return `📭 No results for "${args.query}".`;}

    const lines = results.map((r, i) => {
      const role = r.role === "user" ? "👤" : r.role === "assistant" ? "🤖" : "⚙️";
      return `  ${i + 1}. ${role} ${r.snippet || "(no preview)"}`;
    });

    return `🔍 Results for "${args.query}":\n${lines.join("\n")}`;
  } catch (err) {
    return `❌ Search failed: ${err.message}`;
  }
}

/** Store a fact or decision in project memory. */
export async function storeMemory(_cwd, args) {
  if (!args.key || typeof args.key !== "string")
    {return "❌ Missing or invalid 'key' (string required).";}
  if (!args.value || typeof args.value !== "string")
    {return "❌ Missing or invalid 'value' (string required).";}

  const validCategories = ["fact", "decision", "user_pref", "general"];
  const category = args.category || "general";
  if (!validCategories.includes(category))
    {return `❌ Invalid category. Choose: ${validCategories.join(", ")}`;}

  try {
    const db = getDatabase();
    db.setMemory(args.key, args.value, category, "agent");
    return `✅ Stored "${args.key}" (${category})`;
  } catch (err) {
    return `❌ Failed to store memory: ${err.message}`;
  }
}

/** Retrieve a stored memory entry by key. */
export async function getMemory(_cwd, args) {
  if (!args.key || typeof args.key !== "string")
    {return "❌ Missing or invalid 'key' (string required).";}

  try {
    const db = getDatabase();
    const entry = db.getMemory(args.key);
    if (!entry) {return `📭 No memory found for key "${args.key}".`;}
    return `📖 Memory: ${entry.key} (${entry.category})\n${entry.value}\n${entry.source ? `Source: ${entry.source}\n` : ""}Updated: ${entry.updated_at}`;
  } catch (err) {
    return `❌ Failed to read memory: ${err.message}`;
  }
}
