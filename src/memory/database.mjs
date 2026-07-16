/**
 * SQLite database layer for agent memory.
 * Uses node:sqlite (built-in on Node 22+).
 *
 * Provides:
 * - Conversation storage with FTS5 full-text search
 * - Typed key-value memory store
 * - Task management
 * - Session tracking
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs/promises';

const SCHEMA_VERSION = 2;
const MEMORY_DIR = '.roo-memory';
const DB_FILE = 'roo-memory.db';

let _instance = null;

/**
 * Get or create the singleton database instance.
 * @param {string} [customPath] - Optional custom path for the db file
 * @returns {AgentDatabase}
 */
export function getDatabase(customPath) {
  if (!_instance) {
    _instance = new AgentDatabase(customPath);
  }
  return _instance;
}

/**
 * Reset the singleton (for testing).
 */
export function resetDatabase() {
  if (_instance) {
    _instance.close();
    _instance = null;
  }
}

class AgentDatabase {
  constructor(customPath) {
    this.dbPath = customPath || path.join(process.cwd(), MEMORY_DIR, DB_FILE);
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize the database: create directories, open connection, run migrations.
   */
  async initialize() {
    if (this.initialized) {return;}

    // Ensure the directory exists
    const dir = path.dirname(this.dbPath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') {throw err;}
    }

    // Open database
    this.db = new DatabaseSync(this.dbPath);

    // Enable WAL mode for better concurrent access
    this.db.exec('PRAGMA journal_mode=WAL');
    this.db.exec('PRAGMA foreign_keys=ON');

    // Run migrations
    this._migrate();

    this.initialized = true;
  }

  /**
   * Run schema migrations.
   */
  _migrate() {
    // Get current version
    const version = this.db.prepare('PRAGMA user_version').get();
    const currentVersion = version.user_version || 0;

    if (currentVersion < 1) {
      this._migrate_v1();
    }

    if (currentVersion < 2) {
      this._migrate_v2();
    }

    // Update version
    this.db.exec(`PRAGMA user_version=${SCHEMA_VERSION}`);
  }

  _migrate_v1() {
    this.db.exec(`
      -- Conversations table
      CREATE TABLE IF NOT EXISTS conversations (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role       TEXT NOT NULL CHECK(role IN ('user','assistant','system','tool')),
        content    TEXT,
        tool_name  TEXT,
        file_paths TEXT,
        tokens     INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_conv_session ON conversations(session_id);
      CREATE INDEX IF NOT EXISTS idx_conv_created ON conversations(created_at);

      -- FTS5 full-text search index
      CREATE VIRTUAL TABLE IF NOT EXISTS conversations_fts USING fts5(
        content, tool_name, file_paths,
        content=conversations,
        content_rowid=id
      );

      -- Auto-sync triggers: keep FTS index in sync with conversations table
      CREATE TRIGGER IF NOT EXISTS conversations_ai AFTER INSERT ON conversations BEGIN
        INSERT INTO conversations_fts(rowid, content, tool_name, file_paths)
        VALUES (new.id, new.content, new.tool_name, new.file_paths);
      END;

      CREATE TRIGGER IF NOT EXISTS conversations_ad AFTER DELETE ON conversations BEGIN
        INSERT INTO conversations_fts(conversations_fts, rowid, content, tool_name, file_paths)
        VALUES ('delete', old.id, old.content, old.tool_name, old.file_paths);
      END;

      CREATE TRIGGER IF NOT EXISTS conversations_au AFTER UPDATE ON conversations BEGIN
        INSERT INTO conversations_fts(conversations_fts, rowid, content, tool_name, file_paths)
        VALUES ('delete', old.id, old.content, old.tool_name, old.file_paths);
        INSERT INTO conversations_fts(rowid, content, tool_name, file_paths)
        VALUES (new.id, new.content, new.tool_name, new.file_paths);
      END;

      -- Memory key-value store
      CREATE TABLE IF NOT EXISTS memory (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        category   TEXT NOT NULL DEFAULT 'general',
        source     TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Tasks
      CREATE TABLE IF NOT EXISTS tasks (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        title        TEXT NOT NULL,
        description  TEXT,
        status       TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','done','blocked','cancelled')),
        priority     INTEGER DEFAULT 0,
        session_id   TEXT,
        related_files TEXT,
        parent_id    INTEGER REFERENCES tasks(id),
        tags         TEXT,
        created_at   TEXT DEFAULT (datetime('now')),
        completed_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks(session_id);

      -- Projects
      CREATE TABLE IF NOT EXISTS projects (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL UNIQUE,
        description TEXT,
        repo_url    TEXT,
        status      TEXT DEFAULT 'active' CHECK(status IN ('active','archived','completed')),
        created_at  TEXT DEFAULT (datetime('now')),
        updated_at  TEXT DEFAULT (datetime('now'))
      );
    `);

    // Add project_id to tasks if not present (migration)
    try {
      this.db.exec("ALTER TABLE tasks ADD COLUMN project_id INTEGER REFERENCES projects(id)");
    } catch { /* column already exists */ }
  }

  _migrate_v2() {
    this.db.exec(`
      -- Task dependencies (DAG support)
      CREATE TABLE IF NOT EXISTS task_dependencies (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id       INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        depends_on_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        UNIQUE(task_id, depends_on_id)
      );

      CREATE INDEX IF NOT EXISTS idx_td_task ON task_dependencies(task_id);
      CREATE INDEX IF NOT EXISTS idx_td_depends ON task_dependencies(depends_on_id);

      -- Add mode column to tasks if not present (for sub-agent mode delegation)
      ALTER TABLE tasks ADD COLUMN mode TEXT DEFAULT 'code' CHECK(mode IN ('code','architect','ask'));

      -- Add result column to tasks for storing sub-agent output
      ALTER TABLE tasks ADD COLUMN result TEXT;
    `);
    // These ALTER TABLE may fail if columns already exist — that's fine
    try { this.db.exec("ALTER TABLE tasks ADD COLUMN mode TEXT DEFAULT 'code'"); } catch {}
    try { this.db.exec("ALTER TABLE tasks ADD COLUMN result TEXT"); } catch {}
  }

  // ══════════════════════════════════════════
  //  Conversations
  // ══════════════════════════════════════════

  /**
   * Add a message to the conversation log.
   */
  addMessage(sessionId, role, content, opts = {}) {
    this._ensureOpen();
    const stmt = this.db.prepare(`
      INSERT INTO conversations (session_id, role, content, tool_name, file_paths, tokens)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      sessionId,
      role,
      content || null,
      opts.toolName || null,
      opts.filePaths ? JSON.stringify(opts.filePaths) : null,
      opts.tokens || 0
    );
    return result.lastInsertRowid;
  }

  /**
   * Get all messages for a session.
   */
  getSessionMessages(sessionId) {
    this._ensureOpen();
    const stmt = this.db.prepare(`
      SELECT * FROM conversations
      WHERE session_id = ?
      ORDER BY id ASC
    `);
    return stmt.all(sessionId);
  }

  /**
   * Search conversations using FTS5 full-text search.
   * @param {string} query - Search query (FTS5 syntax)
   * @param {number} [limit=10] - Max results
   * @returns {Array} Ranked results with snippets
   */
  searchConversations(query, limit = 10) {
    this._ensureOpen();
    try {
      const stmt = this.db.prepare(`
        SELECT
          c.id, c.session_id, c.role, c.content, c.tool_name, c.file_paths, c.created_at,
          snippet(conversations_fts, 0, '<match>', '</match>', '...', 40) AS snippet
        FROM conversations_fts fts
        JOIN conversations c ON fts.rowid = c.id
        WHERE conversations_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `);
      return stmt.all(query, limit);
    } catch (err) {
      // Return empty array on invalid query syntax
      return [];
    }
  }

  /**
   * Find conversations that reference a specific file path.
   */
  findMessagesByFile(filePath) {
    this._ensureOpen();
    const stmt = this.db.prepare(`
      SELECT * FROM conversations
      WHERE file_paths LIKE ?
      ORDER BY created_at DESC
      LIMIT 20
    `);
    return stmt.all(`%${filePath}%`);
  }

  // ══════════════════════════════════════════
  //  Memory (key-value)
  // ══════════════════════════════════════════

  /**
   * Get a memory value by key.
   */
  getMemory(key) {
    this._ensureOpen();
    const stmt = this.db.prepare('SELECT * FROM memory WHERE key = ?');
    return stmt.get(key) || null;
  }

  /**
   * Set a memory value.
   */
  setMemory(key, value, category = 'general', source = null) {
    this._ensureOpen();
    const stmt = this.db.prepare(`
      INSERT INTO memory (key, value, category, source, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        category = excluded.category,
        source = excluded.source,
        updated_at = datetime('now')
    `);
    stmt.run(key, value, category, source);
  }

  /**
   * Search memory entries.
   */
  searchMemory(query, limit = 10) {
    this._ensureOpen();
    // Use LIKE for memory search (small dataset, no FTS needed)
    const stmt = this.db.prepare(`
      SELECT * FROM memory
      WHERE key LIKE ? OR value LIKE ? OR category LIKE ?
      ORDER BY updated_at DESC
      LIMIT ?
    `);
    const pattern = `%${query}%`;
    return stmt.all(pattern, pattern, pattern, limit);
  }

  /**
   * Get all memory entries by category.
   */
  getMemoryByCategory(category) {
    this._ensureOpen();
    const stmt = this.db.prepare('SELECT * FROM memory WHERE category = ? ORDER BY updated_at DESC');
    return stmt.all(category);
  }

  // ══════════════════════════════════════════
  //  Tasks
  // ══════════════════════════════════════════

  /**
   * Create a new task.
   * @returns {number} The new task ID
   */
  createTask(title, opts = {}) {
    this._ensureOpen();
    const stmt = this.db.prepare(`
      INSERT INTO tasks (title, description, status, priority, session_id, related_files, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      title,
      opts.description || null,
      opts.status || 'pending',
      opts.priority || 0,
      opts.sessionId || null,
      opts.relatedFiles ? JSON.stringify(opts.relatedFiles) : null,
      opts.tags ? JSON.stringify(opts.tags) : null
    );
    return Number(result.lastInsertRowid);
  }

  /**
   * Update a task's status or fields.
   */
  updateTask(taskId, updates) {
    this._ensureOpen();
    const sets = [];
    const values = [];

    if (updates.status !== undefined) {
      if (updates.status === 'done' || updates.status === 'cancelled') {
        sets.push('completed_at = datetime(\'now\')');
      }
      sets.push('status = ?');
      values.push(updates.status);
    }
    if (updates.title !== undefined) { sets.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { sets.push('description = ?'); values.push(updates.description); }
    if (updates.priority !== undefined) { sets.push('priority = ?'); values.push(updates.priority); }
    if (updates.tags !== undefined) { sets.push('tags = ?'); values.push(JSON.stringify(updates.tags)); }

    if (sets.length === 0) {return false;}

    values.push(taskId);
    const stmt = this.db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return true;
  }

  /**
   * List tasks with optional filters.
   */
  listTasks(filter = {}) {
    this._ensureOpen();
    let sql = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];

    if (filter.status) { sql += ' AND status = ?'; params.push(filter.status); }
    if (filter.tag) { sql += ' AND tags LIKE ?'; params.push(`%${filter.tag}%`); }
    if (filter.sessionId) { sql += ' AND session_id = ?'; params.push(filter.sessionId); }
    if (filter.parent_id !== undefined) { sql += ' AND parent_id = ?'; params.push(filter.parent_id); }
    if (filter.project_id !== undefined) { sql += ' AND project_id = ?'; params.push(filter.project_id); }

    sql += ' ORDER BY priority DESC, created_at DESC LIMIT 50';
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  // ══════════════════════════════════════════
  //  Task Dependencies (DAG)
  // ══════════════════════════════════════════

  /**
   * Add a dependency: taskId depends on dependsOnId.
   * @returns {boolean} True if added, false if already exists
   */
  addDependency(taskId, dependsOnId) {
    this._ensureOpen();
    try {
      const stmt = this.db.prepare(`
        INSERT INTO task_dependencies (task_id, depends_on_id) VALUES (?, ?)
      `);
      stmt.run(taskId, dependsOnId);
      return true;
    } catch (err) {
      // UNIQUE constraint violation — already exists
      if (err.message?.includes('UNIQUE')) {return false;}
      throw err;
    }
  }

  /**
   * Remove a dependency edge.
   */
  removeDependency(taskId, dependsOnId) {
    this._ensureOpen();
    const stmt = this.db.prepare(`
      DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_id = ?
    `);
    stmt.run(taskId, dependsOnId);
  }

  /**
   * Get all tasks that taskId depends on (predecessors).
   */
  getDependencies(taskId) {
    this._ensureOpen();
    const stmt = this.db.prepare(`
      SELECT t.* FROM tasks t
      JOIN task_dependencies td ON t.id = td.depends_on_id
      WHERE td.task_id = ?
      ORDER BY t.created_at ASC
    `);
    return stmt.all(taskId);
  }

  /**
   * Get all tasks that depend on taskId (successors/dependents).
   */
  getDependents(taskId) {
    this._ensureOpen();
    const stmt = this.db.prepare(`
      SELECT t.* FROM tasks t
      JOIN task_dependencies td ON t.id = td.task_id
      WHERE td.depends_on_id = ?
      ORDER BY t.created_at ASC
    `);
    return stmt.all(taskId);
  }

  /**
   * Get all tasks that are ready to execute (all dependencies done/cancelled).
   * A task is ready when all its dependencies have status 'done' or 'cancelled'.
   */
  getReadyTasks(projectId) {
    this._ensureOpen();
    const params = [];
    let sql = `
      SELECT t.* FROM tasks t
      WHERE t.status = 'pending'
    `;
    if (projectId !== undefined) { sql += ' AND t.project_id = ?'; params.push(projectId); }
    sql += `
      AND NOT EXISTS (
        SELECT 1 FROM task_dependencies td
        JOIN tasks dep ON td.depends_on_id = dep.id
        WHERE td.task_id = t.id
          AND dep.status NOT IN ('done', 'cancelled')
      )
      ORDER BY t.priority DESC, t.created_at ASC
    `;
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  /**
   * Check if adding a dependency would create a cycle.
   * Uses BFS from dependsOnId following dependency edges.
   * If we reach taskId, there's a cycle.
   */
  wouldCreateCycle(taskId, dependsOnId) {
    this._ensureOpen();
    // BFS following dependency edges
    const visited = new Set();
    const queue = [dependsOnId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === taskId) {return true;} // Cycle detected
      if (visited.has(current)) {continue;}
      visited.add(current);

      // Get all tasks that current depends on
      const deps = this.db.prepare(`
        SELECT depends_on_id FROM task_dependencies WHERE task_id = ?
      `).all(current);

      for (const d of deps) {
        if (!visited.has(d.depends_on_id)) {
          queue.push(d.depends_on_id);
        }
      }
    }

    return false;
  }

  /**
   * Get the full dependency chain for a task (all ancestors).
   */
  getDependencyChain(taskId) {
    this._ensureOpen();
    const ancestors = [];
    const visited = new Set();
    const queue = [taskId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) {continue;}
      visited.add(current);

      const deps = this.db.prepare(`
        SELECT DISTINCT t.* FROM tasks t
        JOIN task_dependencies td ON t.id = td.depends_on_id
        WHERE td.task_id = ?
      `).all(current);

      for (const d of deps) {
        ancestors.push(d);
        queue.push(d.id);
      }
    }

    return ancestors;
  }

  /**
   * Bulk-create tasks with dependencies in a transaction.
   * @param {Array} tasksData - Array of {title, mode, description, depends_on: [taskTitles], priority, tags}
   * @param {number} [parentId] - Optional parent task ID
   * @returns {Array} Created tasks with their IDs
   */
  createTaskDAG(tasksData, parentId = null, sessionId = null) {
    this._ensureOpen();

    const insertTask = this.db.prepare(`
      INSERT INTO tasks (title, description, status, priority, mode, session_id, parent_id, tags)
      VALUES (?, ?, 'pending', ?, ?, ?, ?, ?)
    `);
    const insertDep = this.db.prepare(`
      INSERT INTO task_dependencies (task_id, depends_on_id) VALUES (?, ?)
    `);

    const createdTasks = [];

    // Use manual transaction (DatabaseSync does not have .transaction())
    try {
      this.db.exec('BEGIN');

      // Insert all tasks
      for (const task of tasksData) {
        const result = insertTask.run(
          task.title,
          task.description || null,
          task.priority || 0,
          task.mode || 'code',
          sessionId,
          parentId,
          task.tags ? JSON.stringify(task.tags) : null
        );
        createdTasks.push({
          id: Number(result.lastInsertRowid),
          title: task.title,
          mode: task.mode || 'code',
          depends_on: task.depends_on || [],
        });
      }

      // Create a title→ID map
      const titleToId = {};
      for (const t of createdTasks) {
        titleToId[t.title] = t.id;
      }

      // Add dependencies
      for (const task of createdTasks) {
        if (task.depends_on && task.depends_on.length > 0) {
          for (const depTitle of task.depends_on) {
            const depId = titleToId[depTitle];
            if (depId !== undefined) {
              if (!this.wouldCreateCycle(task.id, depId)) {
                insertDep.run(task.id, depId);
              }
            }
          }
        }
      }

      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }

    return createdTasks;
  }

  // ══════════════════════════════════════════
  //  Projects
  // ══════════════════════════════════════════

  /**
   * Create a new project.
   */
  createProject(name, opts = {}) {
    this._ensureOpen();
    const stmt = this.db.prepare(`
      INSERT INTO projects (name, description, repo_url, status)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      name,
      opts.description || null,
      opts.repoUrl || null,
      opts.status || 'active'
    );
    return Number(result.lastInsertRowid);
  }

  /**
   * List projects.
   */
  listProjects(filter = {}) {
    this._ensureOpen();
    let sql = 'SELECT * FROM projects WHERE 1=1';
    const params = [];
    if (filter.status) { sql += ' AND status = ?'; params.push(filter.status); }
    sql += ' ORDER BY updated_at DESC LIMIT 20';
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  /**
   * Update a project.
   */
  updateProject(id, updates) {
    this._ensureOpen();
    const sets = [];
    const values = [];
    if (updates.name !== undefined) { sets.push('name = ?'); values.push(updates.name); }
    if (updates.description !== undefined) { sets.push('description = ?'); values.push(updates.description); }
    if (updates.repo_url !== undefined) { sets.push('repo_url = ?'); values.push(updates.repo_url); }
    if (updates.status !== undefined) { sets.push('status = ?'); values.push(updates.status); }
    sets.push("updated_at = datetime('now')");
    if (sets.length === 0) {return false;}
    values.push(id);
    this.db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return true;
  }

  // ══════════════════════════════════════════
  //  Utility
  // ══════════════════════════════════════════

  /**
   * Delete all data (for testing).
   */
  clearAll() {
    this._ensureOpen();
    this.db.exec('DELETE FROM conversations');
    this.db.exec('DELETE FROM memory');
    this.db.exec('DELETE FROM tasks');
    this.db.exec("INSERT INTO conversations_fts(conversations_fts) VALUES('rebuild')");
  }

  close() {
    if (this.db) {
      try { this.db.close(); } catch { /* ignore */ }
      this.db = null;
      this.initialized = false;
    }
  }

  _ensureOpen() {
    if (!this.db || !this.initialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
  }
}

export default AgentDatabase;
