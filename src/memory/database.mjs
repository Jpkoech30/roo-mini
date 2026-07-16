import Database from "better-sqlite3";
import path from "path";

const DB_DIR = ".roo-memory";
const DB_PATH = path.join(DB_DIR, "roo-mini.db");

let db = null;

/**
 * Initialize SQLite database with tasks and memory tables.
 */
export async function initDatabase() {
  const fs = await import("fs/promises");
  await fs.mkdir(DB_DIR, { recursive: true });
  db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      priority INTEGER DEFAULT 0,
      mode TEXT DEFAULT 'code',
      parent_id INTEGER,
      project_id INTEGER,
      result TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_dependencies (
      task_id INTEGER NOT NULL,
      depends_on_id INTEGER NOT NULL,
      PRIMARY KEY (task_id, depends_on_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (depends_on_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS memory_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      context TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  return db;
}

/**
 * Get database instance.
 */
export function getDatabase() {
  if (!db) throw new Error("Database not initialized. Call initDatabase() first.");

  return {
    // --- Tasks ---
    createTask(title, opts = {}) {
      const stmt = db.prepare(`
        INSERT INTO tasks (title, description, status, priority, mode, parent_id, project_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        title,
        opts.description || null,
        opts.status || "pending",
        opts.priority || 0,
        opts.mode || "code",
        opts.parent_id || null,
        opts.project_id || null,
      );
      return info.lastInsertRowid;
    },

    updateTask(id, opts = {}) {
      const fields = [];
      const values = [];
      for (const key of ["title", "description", "status", "priority", "mode", "result"]) {
        if (opts[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(opts[key]);
        }
      }
      if (fields.length === 0) return;
      fields.push("updated_at = datetime('now')");
      values.push(id);
      db.prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    },

    listTasks(filter = {}) {
      let sql = "SELECT * FROM tasks WHERE 1=1";
      const params = [];
      if (filter.status) { sql += " AND status = ?"; params.push(filter.status); }
      if (filter.tag) { sql += " AND tags LIKE ?"; params.push(`%${filter.tag}%`); }
      if (filter.parent_id !== undefined) { sql += " AND parent_id = ?"; params.push(filter.parent_id); }
      if (filter.project_id !== undefined) { sql += " AND project_id = ?"; params.push(filter.project_id); }
      sql += " ORDER BY priority DESC, created_at ASC";
      return db.prepare(sql).all(...params);
    },

    // --- Dependencies ---
    addDependency(taskId, dependsOnId) {
      db.prepare("INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_id) VALUES (?, ?)").run(taskId, dependsOnId);
    },

    getDependencies(taskId) {
      return db.prepare(`
        SELECT t.* FROM tasks t
        JOIN task_dependencies d ON t.id = d.depends_on_id
        WHERE d.task_id = ?
      `).all(taskId);
    },

    getDependents(taskId) {
      return db.prepare(`
        SELECT t.* FROM tasks t
        JOIN task_dependencies d ON t.id = d.task_id
        WHERE d.depends_on_id = ?
      `).all(taskId);
    },

    // --- Memory ---
    storeMemory(key, value) {
      db.prepare(`
        INSERT INTO memory_store (key, value, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `).run(key, value);
    },

    getMemory(key) {
      const row = db.prepare("SELECT value FROM memory_store WHERE key = ?").get(key);
      return row ? row.value : null;
    },

    searchMemory(query) {
      return db.prepare("SELECT key, value FROM memory_store WHERE key LIKE ? OR value LIKE ? LIMIT 20")
        .all(`%${query}%`, `%${query}%`);
    },
  };
}
