/**
 * Task management tools.
 * Provides CRUD operations for the SQLite tasks table.
 */

import { getDatabase } from "../../memory/database.mjs";

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
      return `  #${t.id} ${icon} ${t.title} [${t.status}]${tags ? ` (${tags})` : ""}`;
    });

    return `📋 Tasks (${tasks.length}):\n${lines.join("\n")}`;
  } catch (err) {
    return `❌ Failed to list tasks: ${err.message}`;
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
