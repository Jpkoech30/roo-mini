/**
 * Basic tests for the tool executor.
 * Run with: node --test tests/executor.test.mjs
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IS_WINDOWS = process.platform === "win32";
const TEST_DIR = path.join(__dirname, ".test-tmp");
const ORIGINAL_CWD = process.cwd();

// Import executor (needs to be dynamic since it uses process.cwd())
let executeTool;

before(async () => {
  // Create test directory and chdir into it
  await fs.mkdir(TEST_DIR, { recursive: true });
  process.chdir(TEST_DIR);

  // Write a sample file
  await fs.writeFile("hello.txt", "Hello, World!\nThis is a test file.\nLine 3 here.", "utf-8");
  await fs.writeFile("config.json", JSON.stringify({ name: "test", version: 1 }, null, 2), "utf-8");

  // Create subdirectory
  await fs.mkdir("subdir", { recursive: true });
  await fs.writeFile("subdir/nested.txt", "Nested content", "utf-8");

  const mod = await import("../src/tools/executor.mjs");
  executeTool = mod.executeTool;
});

after(async () => {
  // Change back to original CWD before cleanup (avoids EBUSY on Windows)
  process.chdir(ORIGINAL_CWD);
  await fs.rm(TEST_DIR, { recursive: true, force: true });
});

// ─── read_file ───
describe("read_file", () => {
  it("reads a file successfully", async () => {
    const result = await executeTool("read_file", { file_path: "hello.txt" });
    assert.ok(result.startsWith("Hello, World!"));
  });

  it("returns error for missing file_path", async () => {
    const result = await executeTool("read_file", {});
    assert.ok(result.includes("Missing"));
  });

  it("returns error for non-existent file", async () => {
    const result = await executeTool("read_file", { file_path: "nonexistent.txt" });
    assert.ok(result.includes("Error reading file"));
  });
});

// ─── write_file ───
describe("write_file", () => {
  it("writes a new file", async () => {
    const result = await executeTool("write_file", { file_path: "new.txt", content: "New content" });
    assert.ok(result.includes("Wrote"));
    const content = await fs.readFile("new.txt", "utf-8");
    assert.equal(content, "New content");
  });

  it("creates intermediate directories", async () => {
    const result = await executeTool("write_file", { file_path: "a/b/c/deep.txt", content: "deep" });
    assert.ok(result.includes("Wrote"));
    const content = await fs.readFile("a/b/c/deep.txt", "utf-8");
    assert.equal(content, "deep");
  });

  it("requires content", async () => {
    const result = await executeTool("write_file", { file_path: "test.txt" });
    assert.ok(result.includes("Missing"));
  });
});

// ─── replace_in_file ───
describe("replace_in_file", () => {
  it("replaces text in a file", async () => {
    await fs.writeFile("replace-test.txt", "Hello World", "utf-8");
    const result = await executeTool("replace_in_file", {
      file_path: "replace-test.txt",
      old_str: "World",
      new_str: "Universe"
    });
    assert.ok(result.includes("Replaced"));
    const content = await fs.readFile("replace-test.txt", "utf-8");
    assert.equal(content, "Hello Universe");
  });
});

// ─── list_files ───
describe("list_files", () => {
  it("lists files in a directory", async () => {
    const result = await executeTool("list_files", { dir_path: "." });
    assert.ok(result.includes("hello.txt"));
  });

  it("defaults to current directory", async () => {
    const result = await executeTool("list_files", {});
    assert.ok(result.includes("hello.txt"));
  });
});

// ─── search_in_file ───
describe("search_in_file", () => {
  it("finds text with simple search", async () => {
    const result = await executeTool("search_in_file", { file_path: "hello.txt", search_term: "World" });
    assert.ok(result.includes("Found"));
    assert.ok(result.includes("World"));
    assert.ok(result.includes("L1"));
  });

  it("finds text with regex", async () => {
    const result = await executeTool("search_in_file", { file_path: "hello.txt", search_term: "Line \\d", regex: true });
    assert.ok(result.includes("Found"));
    assert.ok(result.includes("L3"));
  });

  it("returns not found for missing text", async () => {
    const result = await executeTool("search_in_file", { file_path: "hello.txt", search_term: "NonExistent" });
    assert.ok(result.includes("Not found"));
  });
});

// ─── apply_diff ───
describe("apply_diff", () => {
  it("applies an exact SEARCH/REPLACE", async () => {
    await fs.writeFile("diff-test.txt", "Old content here", "utf-8");
    const result = await executeTool("apply_diff", {
      file_path: "diff-test.txt",
      search_str: "Old content here",
      replace_str: "New content here"
    });
    assert.ok(result.includes("Applied diff"));
    const content = await fs.readFile("diff-test.txt", "utf-8");
    assert.equal(content, "New content here");
  });

  it("falls back to fuzzy matching", async () => {
    await fs.writeFile("fuzzy-test.txt", "Hello    World   Extra   Spaces", "utf-8");
    const result = await executeTool("apply_diff", {
      file_path: "fuzzy-test.txt",
      search_str: "Hello World Extra Spaces",
      replace_str: "Matched Fuzzy"
    });
    assert.ok(result.includes("fuzzy"));
    const content = await fs.readFile("fuzzy-test.txt", "utf-8");
    assert.equal(content, "Matched Fuzzy");
  });
});

// ─── append_to_file ───
describe("append_to_file", () => {
  it("appends content to a file", async () => {
    await fs.writeFile("append-test.txt", "Line 1", "utf-8");
    const result = await executeTool("append_to_file", { file_path: "append-test.txt", content: "Line 2" });
    assert.ok(result.includes("Appended"));
    const content = await fs.readFile("append-test.txt", "utf-8");
    assert.ok(content.includes("Line 2"));
  });
});

// ─── delete_file ───
describe("delete_file", () => {
  it("deletes a file", async () => {
    await fs.writeFile("delete-me.txt", "bye", "utf-8");
    const result = await executeTool("delete_file", { path: "delete-me.txt" });
    assert.ok(result.includes("Deleted"));
    const exists = await fs.access("delete-me.txt").then(() => true).catch(() => false);
    assert.equal(exists, false);
  });
});

// ─── Unknown tool ───
describe("unknown tool", () => {
  it("returns error", async () => {
    const result = await executeTool("nonexistent_tool", {});
    assert.ok(result.includes("Unknown tool"));
  });
});

// ─── Invalid arguments ───
describe("error handling", () => {
  it("handles null tool name", async () => {
    const result = await executeTool(null, {});
    assert.ok(result.includes("Invalid tool name"));
  });

  it("handles non-object args", async () => {
    const result = await executeTool("read_file", "not-an-object");
    assert.ok(result.includes("Missing or invalid arguments"));
  });
});

// ─── execute_shell ───
describe("execute_shell", () => {
  it("executes a simple command successfully", async () => {
    const cmd = IS_WINDOWS ? "echo hello" : "echo hello";
    const result = await executeTool("execute_shell", { command: cmd });
    assert.ok(result.includes("Command executed"));
    assert.ok(result.includes("hello"));
  });

  it("returns error for missing command", async () => {
    const result = await executeTool("execute_shell", {});
    assert.ok(result.includes("Missing or invalid"));
  });

  it("returns error for non-string command", async () => {
    const result = await executeTool("execute_shell", { command: 123 });
    assert.ok(result.includes("Missing or invalid"));
  });

  it("blocks dangerous commands", async () => {
    const result = await executeTool("execute_shell", { command: "rm -rf /" });
    assert.ok(result.includes("COMMAND BLOCKED"));
  });

  it("blocks Windows dangerous commands", async () => {
    const result = await executeTool("execute_shell", { command: "del /F /S *" });
    assert.ok(result.includes("COMMAND BLOCKED"));
  });

  it("blocks base64 decoded execution", async () => {
    const result = await executeTool("execute_shell", { command: "echo aGVsbG8= | base64 -d" });
    assert.ok(result.includes("COMMAND BLOCKED"));
  });

  it("respects the cwd parameter", async () => {
    // Create a temp dir and a marker file
    await fs.mkdir("shell-test-subdir", { recursive: true });
    const cmd = IS_WINDOWS ? "dir /B" : "ls";
    const result = await executeTool("execute_shell", {
      command: cmd,
      cwd: "shell-test-subdir"
    });
    // The subdir is empty, so output should be empty or just show "."
    // cwd was respected, no error about directory not found
    assert.ok(result.includes("Command executed"), `Expected success, got: ${result}`);
    // Cleanup
    await fs.rm("shell-test-subdir", { recursive: true, force: true });
  });

  it("reports command failure with exit code", async () => {
    const cmd = IS_WINDOWS ? "exit /B 42" : "exit 42";
    const result = await executeTool("execute_shell", { command: cmd });
    assert.ok(result.includes("exit code: 42") || result.includes("Command failed"));
  });

  it("handles the description parameter gracefully", async () => {
    const cmd = IS_WINDOWS ? "echo test" : "echo test";
    const result = await executeTool("execute_shell", {
      command: cmd,
      description: "testing description"
    });
    assert.ok(result.includes("Command executed"));
    // Description may or may not appear depending on platform echo behavior
  });
});
