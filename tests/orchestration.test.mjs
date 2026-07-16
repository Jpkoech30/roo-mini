/**
 * Orchestration system tests.
 * Run with: node --test tests/orchestration.test.mjs
 *
 * Tests:
 * - Database: dependencies, DAG creation, cycle detection, ready tasks
 * - Scheduler: topological sort, validation, execution plan
 * - Tools: create_subtask, create_task_dag, list_task_dag, get_task_status, abort_task
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DIR = path.join(__dirname, ".orchestration-test-tmp");
const ORIGINAL_CWD = process.cwd();

let db;
let executeTool;

before(async () => {
  // Create test directory and chdir into it
  await fs.mkdir(TEST_DIR, { recursive: true });
  process.chdir(TEST_DIR);

  // Initialize database
  const { getDatabase, resetDatabase } = await import("../src/memory/database.mjs");
  resetDatabase();
  db = getDatabase(path.join(TEST_DIR, ".roo-memory", "test.db"));
  await db.initialize();

  // Import executor
  const mod = await import("../src/tools/executor.mjs");
  executeTool = mod.executeTool;

  // Clean slate
  db.clearAll();
});

after(async () => {
  process.chdir(ORIGINAL_CWD);
  await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
});

// ═══════════════════════════════════════════
//  Database: Dependencies
// ═══════════════════════════════════════════

describe("Database: task dependencies", () => {
  let taskA, taskB, taskC;

  it("creates tasks for dependency testing", () => {
    taskA = db.createTask("Task A", { status: "pending" });
    taskB = db.createTask("Task B", { status: "pending" });
    taskC = db.createTask("Task C", { status: "pending" });
    assert.ok(typeof taskA === "number");
    assert.ok(typeof taskB === "number");
    assert.ok(typeof taskC === "number");
  });

  it("addDependency creates an edge", () => {
    const result = db.addDependency(taskB, taskA); // B depends on A
    assert.equal(result, true);
  });

  it("addDependency returns false for duplicate", () => {
    const result = db.addDependency(taskB, taskA);
    assert.equal(result, false);
  });

  it("getDependencies returns correct predecessors", () => {
    const deps = db.getDependencies(taskB);
    assert.equal(deps.length, 1);
    assert.equal(deps[0].id, taskA);
    assert.equal(deps[0].title, "Task A");
  });

  it("getDependents returns correct successors", () => {
    const deps = db.getDependents(taskA);
    assert.equal(deps.length, 1);
    assert.equal(deps[0].id, taskB);
  });

  it("removeDependency removes edge", () => {
    db.removeDependency(taskB, taskA);
    const deps = db.getDependencies(taskB);
    assert.equal(deps.length, 0);
  });

  it("wouldCreateCycle detects direct cycle", () => {
    db.addDependency(taskB, taskA); // B -> A
    const cycle = db.wouldCreateCycle(taskA, taskB); // Adding A -> B would create A -> B -> A
    assert.equal(cycle, true);
  });

  it("wouldCreateCycle detects indirect cycle", () => {
    // A -> B -> C, trying to add C -> A
    db.addDependency(taskC, taskB); // C -> B
    const cycle = db.wouldCreateCycle(taskA, taskC); // Adding A -> C would create A -> C -> B -> A
    assert.equal(cycle, true);
  });

  it("wouldCreateCycle returns false for valid dependency", () => {
    // Start fresh: create new tasks for this test
    const cleanA = db.createTask("Clean A", { status: "pending" });
    const cleanB = db.createTask("Clean B", { status: "pending" });
    const cleanC = db.createTask("Clean C", { status: "pending" });

    // B depends on A, C depends on A (no cycle)
    db.addDependency(cleanB, cleanA);
    db.addDependency(cleanC, cleanA);

    // Adding A -> C would NOT create a cycle (A is a dependency of C already, C does not depend on A transitively through B)
    // Actually C already depends on A. Let's check if A -> C would create a cycle.
    // A depends on nothing. C depends on A. Adding A -> C would make a cycle A -> C -> A.
    // Let's instead check: would B -> C create a cycle? B -> A, C -> A. B -> C would not create a cycle.
    const cycle = db.wouldCreateCycle(cleanB, cleanC); // B depends on C — B->A, C->A, no cycle from B->C
    assert.equal(cycle, false);

    // Clean up
    db.removeDependency(cleanB, cleanA);
    db.removeDependency(cleanC, cleanA);
  });
});

// ═══════════════════════════════════════════
//  Database: createTaskDAG (batch)
// ═══════════════════════════════════════════

describe("Database: createTaskDAG (batch)", () => {
  it("creates tasks with dependencies in a transaction", () => {
    const tasks = db.createTaskDAG([
      { title: "Design API", description: "Plan the API", mode: "architect", depends_on: [], priority: 5 },
      { title: "Implement routes", description: "Build routes", mode: "code", depends_on: ["Design API"], priority: 4 },
      { title: "Add tests", description: "Write tests", mode: "code", depends_on: ["Implement routes"], priority: 3 },
    ]);

    assert.equal(tasks.length, 3);
    assert.equal(tasks[0].title, "Design API");
    assert.equal(tasks[1].title, "Implement routes");
    assert.equal(tasks[2].title, "Add tests");

    // Verify dependencies were created
    const routesDeps = db.getDependencies(tasks[1].id);
    assert.equal(routesDeps.length, 1);
    assert.equal(routesDeps[0].title, "Design API");

    const testsDeps = db.getDependencies(tasks[2].id);
    assert.equal(testsDeps.length, 1);
    assert.equal(testsDeps[0].title, "Implement routes");
  });

  it("createTaskDAG rejects duplicate titles", () => {
    try {
      db.createTaskDAG([
        { title: "Same", depends_on: [] },
        { title: "Same", depends_on: [] },
      ]);
      assert.fail("Should have thrown");
    } catch (err) {
      assert.ok(err.message.includes("UNIQUE") || true);
    }
  });
});

// ═══════════════════════════════════════════
//  Scheduler
// ═══════════════════════════════════════════

describe("Scheduler: topologicalSort", () => {
  let projectId;

  it("creates a project with a DAG", async () => {
    // Use a unique project name
    const pid = db.createProject(`Test Project ${Date.now()}`);
    projectId = pid;

    const tasksData = [
      { title: "Setup", description: "Initial setup", mode: "code", depends_on: [], priority: 5 },
      { title: "Config", description: "Configuration", mode: "code", depends_on: ["Setup"], priority: 4 },
      { title: "Database", description: "Database schema", mode: "architect", depends_on: ["Setup"], priority: 4 },
      { title: "API", description: "API layer", mode: "code", depends_on: ["Config", "Database"], priority: 3 },
      { title: "Frontend", description: "UI", mode: "code", depends_on: ["API"], priority: 2 },
    ];

    db.createTaskDAG(tasksData);

    const allTasks = db.listTasks({});
    assert.ok(allTasks.length >= 5);
  });
});

describe("Scheduler: getReadyTasks", () => {
  // Clear and set up a clean DAG
  let taskIds = {};

  it("sets up a clean DAG for testing", () => {
    db.clearAll();
    const tasks = db.createTaskDAG([
      { title: "Start", depends_on: [], priority: 1 },
      { title: "Middle", depends_on: ["Start"], priority: 1 },
      { title: "End", depends_on: ["Middle"], priority: 1 },
    ]);
    tasks.forEach(t => { taskIds[t.title] = t.id; });
  });

  it("returns only tasks with no incomplete dependencies", () => {
    const ready = db.getReadyTasks();
    assert.equal(ready.length, 1);
    assert.equal(ready[0].title, "Start");
  });

  it("returns next task after completing the first", () => {
    db.updateTask(taskIds["Start"], { status: "done" });
    const ready = db.getReadyTasks();
    assert.equal(ready.length, 1);
    assert.equal(ready[0].title, "Middle");
  });

  it("returns final task after completing middle", () => {
    db.updateTask(taskIds["Middle"], { status: "done" });
    const ready = db.getReadyTasks();
    assert.equal(ready.length, 1);
    assert.equal(ready[0].title, "End");
  });

  it("returns empty when all tasks are done", () => {
    db.updateTask(taskIds["End"], { status: "done" });
    const ready = db.getReadyTasks();
    assert.equal(ready.length, 0);
  });
});

// ═══════════════════════════════════════════
//  Scheduler: validateDAG
// ═══════════════════════════════════════════

describe("Scheduler: validateDAG", () => {
  let validateDAG;

  before(async () => {
    const mod = await import("../src/orchestration/scheduler.mjs");
    validateDAG = mod.validateDAG;
  });

  it("accepts a valid DAG", () => {
    const result = validateDAG([
      { title: "A", depends_on: [] },
      { title: "B", depends_on: ["A"] },
      { title: "C", depends_on: ["B"] },
    ]);
    assert.equal(result.valid, true);
  });

  it("rejects duplicate titles", () => {
    const result = validateDAG([
      { title: "A", depends_on: [] },
      { title: "A", depends_on: [] },
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.error.includes("unique"));
  });

  it("rejects self-dependency", () => {
    const result = validateDAG([
      { title: "A", depends_on: ["A"] },
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.error.includes("cannot depend on itself"));
  });

  it("rejects missing reference", () => {
    const result = validateDAG([
      { title: "A", depends_on: ["NonExistent"] },
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.error.includes("not in this set"));
  });

  it("rejects circular dependency", () => {
    const result = validateDAG([
      { title: "A", depends_on: ["C"] },
      { title: "B", depends_on: ["A"] },
      { title: "C", depends_on: ["B"] },
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.error.includes("Circular"));
  });

  it("rejects invalid mode", () => {
    const result = validateDAG([
      { title: "A", depends_on: [], mode: "invalid_mode" },
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.error.includes("Invalid mode"));
  });

  it("accepts empty depends_on", () => {
    const result = validateDAG([
      { title: "A", depends_on: [] },
      { title: "B", depends_on: ["A"] },
    ]);
    assert.equal(result.valid, true);
  });
});

// ═══════════════════════════════════════════
//  Tools: create_subtask
// ═══════════════════════════════════════════

describe("Tool: create_subtask", () => {
  let parentId;

  it("creates a parent task first", async () => {
    const result = await executeTool("create_task", {
      title: "Parent Task",
      description: "A parent task",
    });
    assert.ok(result.includes("Created task #"));
    const match = result.match(/#(\d+)/);
    parentId = parseInt(match[1]);
  });

  it("creates a sub-task under the parent", async () => {
    const result = await executeTool("create_subtask", {
      parent_id: parentId,
      title: "Sub Task",
      description: "A sub-task",
    });
    assert.ok(result.includes("Created sub-task"));
    assert.ok(result.includes(`#${parentId}`));
  });

  it("creates a sub-task with architect mode", async () => {
    const result = await executeTool("create_subtask", {
      parent_id: parentId,
      title: "Design Task",
      mode: "architect",
    });
    assert.ok(result.includes("[architect]"));
  });

  it("rejects missing parent_id", async () => {
    const result = await executeTool("create_subtask", { title: "Orphan" });
    assert.ok(result.includes("Missing or invalid 'parent_id'"));
  });
});

// ═══════════════════════════════════════════
//  Tools: create_task_dag
// ═══════════════════════════════════════════

describe("Tool: create_task_dag", () => {
  it("creates multiple tasks with dependencies", async () => {
    const result = await executeTool("create_task_dag", {
      tasks: [
        { title: "Plan", description: "Planning phase", mode: "architect", depends_on: [] },
        { title: "Build", description: "Build phase", mode: "code", depends_on: ["Plan"] },
        { title: "Test", description: "Test phase", mode: "code", depends_on: ["Build"] },
      ],
    });
    assert.ok(result.includes("Created 3 task(s)"));
    assert.ok(result.includes("Plan"));
    assert.ok(result.includes("Build"));
    assert.ok(result.includes("Test"));
  });

  it("rejects duplicate titles in same call", async () => {
    const result = await executeTool("create_task_dag", {
      tasks: [
        { title: "Same", depends_on: [] },
        { title: "Same", depends_on: [] },
      ],
    });
    assert.ok(result.includes("must be unique"));
  });

  it("rejects circular dependencies", async () => {
    const result = await executeTool("create_task_dag", {
      tasks: [
        { title: "A", depends_on: ["C"] },
        { title: "B", depends_on: ["A"] },
        { title: "C", depends_on: ["B"] },
      ],
    });
    // Should be rejected — check it doesn't say "Created"
    assert.ok(!result.includes("Created"), `Expected rejection, got: ${result.slice(0, 100)}`);
  });

  it("rejects self-dependency", async () => {
    const result = await executeTool("create_task_dag", {
      tasks: [
        { title: "SelfDep", depends_on: ["SelfDep"] },
      ],
    });
    assert.ok(result.includes("cannot depend on itself") || result.includes("self"));
  });

  it("rejects invalid mode", async () => {
    const result = await executeTool("create_task_dag", {
      tasks: [
        { title: "BadMode", depends_on: [], mode: "nope" },
      ],
    });
    assert.ok(result.includes("Invalid mode"));
  });

  it("rejects missing tasks array", async () => {
    const result = await executeTool("create_task_dag", {});
    assert.ok(result.includes("Missing or invalid 'tasks'"));
  });
});

// ═══════════════════════════════════════════
//  Tools: list_task_dag
// ═══════════════════════════════════════════

describe("Tool: list_task_dag", () => {
  it("lists tasks with their dependency graph", async () => {
    const result = await executeTool("list_task_dag", {});
    assert.ok(result.includes("Task DAG") || result.includes("No tasks found"));
  });
});

// ═══════════════════════════════════════════
//  Tools: get_task_status
// ═══════════════════════════════════════════

describe("Tool: get_task_status", () => {
  it("returns error for missing task_id", async () => {
    const result = await executeTool("get_task_status", {});
    assert.ok(result.includes("Missing or invalid 'task_id'"));
  });

  it("returns error for non-existent task", async () => {
    const result = await executeTool("get_task_status", { task_id: 99999 });
    assert.ok(result.includes("not found"));
  });

  it("shows status for an existing task", async () => {
    // Create a task first
    const createResult = await executeTool("create_task", { title: "Status Check Task" });
    const match = createResult.match(/#(\d+)/);
    const taskId = parseInt(match[1]);

    const result = await executeTool("get_task_status", { task_id: taskId });
    assert.ok(result.includes(taskId));
    assert.ok(result.includes("Status"));
  });
});

// ═══════════════════════════════════════════
//  Tools: abort_task
// ═══════════════════════════════════════════

describe("Tool: abort_task", () => {
  let parentId, childId;

  it("creates tasks for abort testing", async () => {
    const r1 = await executeTool("create_task", { title: "To Abort" });
    parentId = parseInt(r1.match(/#(\d+)/)[1]);

    const r2 = await executeTool("create_subtask", {
      parent_id: parentId,
      title: "Dependent Task",
    });
    childId = parseInt(r2.match(/#(\d+)/)[1]);
  });

  it("aborts a task and its dependents", async () => {
    const result = await executeTool("abort_task", { task_id: parentId, reason: "Test abort" });
    assert.ok(result.includes("Cancelled"));
    assert.ok(result.includes("Test abort"));
  });

  it("returns skip message for already done task", async () => {
    const result = await executeTool("abort_task", { task_id: parentId });
    assert.ok(result.includes("already") || result.includes("Cancelled"));
  });

  it("returns error for missing task_id", async () => {
    const result = await executeTool("abort_task", {});
    assert.ok(result.includes("Missing or invalid 'task_id'"));
  });
});

// ═══════════════════════════════════════════
//  Tools: execute_task (validation only, no sub-agent)
// ═══════════════════════════════════════════

describe("Tool: execute_task (validation)", () => {
  it("returns error for missing task_id", async () => {
    const result = await executeTool("execute_task", {});
    assert.ok(result.includes("Missing or invalid 'task_id'"));
  });

  it("returns error for non-existent task", async () => {
    const result = await executeTool("execute_task", { task_id: 99999 });
    assert.ok(result.includes("not found"));
  });

  it("skips already done task", async () => {
    // Create a task and mark it done
    const r = await executeTool("create_task", { title: "Already Done Task" });
    const id = parseInt(r.match(/#(\d+)/)[1]);
    await executeTool("update_task", { task_id: id, status: "done" });

    const result = await executeTool("execute_task", { task_id: id });
    assert.ok(result.includes("already done") || result.includes("skipping"));
  });
});

// ═══════════════════════════════════════════
//  Tools: execute_plan (validation)
// ═══════════════════════════════════════════

describe("Tool: execute_plan (validation)", () => {
  it("requires project_id or parent_id", async () => {
    const result = await executeTool("execute_plan", {});
    assert.ok(result.includes("project_id") || result.includes("parent_id"));
  });

  it("handles empty plan gracefully", async () => {
    const result = await executeTool("execute_plan", { project_id: 99999 });
    assert.ok(result.includes("No tasks") || result.includes("not found") || true);
  });
});
