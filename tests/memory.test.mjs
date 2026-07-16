/**
 * Tests for the SQLite database layer.
 * Run with: node --test tests/memory.test.mjs
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB_DIR = path.join(__dirname, ".test-memory");
const TEST_DB_PATH = path.join(TEST_DB_DIR, "test.db");

let db;

before(async () => {
  await fs.mkdir(TEST_DB_DIR, { recursive: true });
  // Override db path for testing
  const mod = await import("../src/memory/database.mjs");
  mod.resetDatabase();
  db = mod.getDatabase(TEST_DB_PATH);
  await db.initialize();
});

after(async () => {
  const { resetDatabase } = await import("../src/memory/database.mjs");
  db.close();
  resetDatabase();
  await fs.rm(TEST_DB_DIR, { recursive: true, force: true });
});

// ─── Conversations ───

describe("conversations", () => {
  it("adds and retrieves messages", () => {
    db.addMessage("session-1", "user", "Hello");
    db.addMessage("session-1", "assistant", "Hi there!");
    const msgs = db.getSessionMessages("session-1");
    assert.equal(msgs.length, 2);
    assert.equal(msgs[0].role, "user");
    assert.equal(msgs[0].content, "Hello");
  });

  it("stores tool name and file paths", () => {
    db.addMessage("session-2", "tool", "file content", {
      toolName: "read_file",
      filePaths: ["src/index.mjs"],
      tokens: 42,
    });
    const msgs = db.getSessionMessages("session-2");
    assert.equal(msgs[0].tool_name, "read_file");
    assert.ok(msgs[0].file_paths.includes("index.mjs"));
    assert.equal(msgs[0].tokens, 42);
  });

  it("searches with FTS5", () => {
    db.addMessage("session-3", "user", "How do I fix the error handler?");
    db.addMessage("session-3", "assistant", "Check the error handling in src/tools/");
    const results = db.searchConversations("error", 5);
    assert.ok(results.length >= 1);
  });
});

// ─── Memory ───

describe("memory key-value", () => {
  it("stores and retrieves by key", () => {
    db.setMemory("test-key", "test-value", "general");
    const entry = db.getMemory("test-key");
    assert.equal(entry.key, "test-key");
    assert.equal(entry.value, "test-value");
    assert.equal(entry.category, "general");
  });

  it("updates existing key", () => {
    db.setMemory("update-key", "old", "fact");
    db.setMemory("update-key", "new", "fact");
    const entry = db.getMemory("update-key");
    assert.equal(entry.value, "new");
  });

  it("searches memory by content", () => {
    db.setMemory("find-me", "unique value here", "general");
    const results = db.searchMemory("unique");
    assert.ok(results.length >= 1);
    assert.ok(results.some(r => r.key === "find-me"));
  });

  it("filters by category", () => {
    db.setMemory("dec-1", "Use SQLite", "decision");
    db.setMemory("dec-2", "Use React", "decision");
    db.setMemory("fact-1", "Node 24", "fact");
    const decisions = db.getMemoryByCategory("decision");
    assert.ok(decisions.length >= 2);
    const facts = db.getMemoryByCategory("fact");
    assert.ok(facts.length >= 1);
  });
});

// ─── Tasks ───

describe("tasks", () => {
  it("creates and lists tasks", () => {
    const id1 = db.createTask("Task 1", { priority: 1, tags: ["test"] });
    const id2 = db.createTask("Task 2", { priority: 2, tags: ["urgent"] });
    assert.ok(id1 > 0);
    assert.ok(id2 > id1);
    const all = db.listTasks({});
    assert.ok(all.length >= 2);
  });

  it("updates task status", () => {
    const id = db.createTask("To complete");
    db.updateTask(id, { status: "done" });
    const tasks = db.listTasks({ status: "done" });
    assert.ok(tasks.some(t => t.id === id));
  });

  it("filters by status", () => {
    const id = db.createTask("Pending task");
    const pending = db.listTasks({ status: "pending" });
    assert.ok(pending.some(t => t.id === id));
  });
});

// ─── Clear ───

describe("clear", () => {
  it("clears all data", () => {
    db.setMemory("temp", "temp", "general");
    db.clearAll();
    const entry = db.getMemory("temp");
    assert.equal(entry, null);
  });
});
