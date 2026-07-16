/**
 * Project memory bank — persistent key-value store for project context.
 *
 * Uses SQLite (via database.mjs) for structured storage.
 * Keeps markdown file as fallback for backward compatibility.
 */

import { getDatabase } from "./database.mjs";
import fs from "fs/promises";
import path from "path";

const MEMORY_DIR = ".roo-memory";
const MEMORY_FILE = "projectContext.md";

// ─── Markdown Fallback ───

async function ensureDir() {
  const dir = path.join(process.cwd(), MEMORY_DIR);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function writeMarkdown(content) {
  try {
    const dir = await ensureDir();
    await fs.writeFile(path.join(dir, MEMORY_FILE), content, "utf-8");
  } catch { /* best effort */ }
}

// ─── SQLite Operations ───

/**
 * Load project memory as a formatted string for the system prompt.
 * Combines all memory entries by category.
 */
export async function loadProjectMemory() {
  try {
    const db = getDatabase();

    // Try loading from SQLite first
    const decisions = db.getMemoryByCategory("decision");
    const facts = db.getMemoryByCategory("fact");
    const prefs = db.getMemoryByCategory("user_pref");
    const general = db.getMemoryByCategory("general");

    if (decisions.length || facts.length || prefs.length || general.length) {
      let output = "--- PROJECT MEMORY ---\n";

      if (facts.length) {
        output += "\n## Facts\n";
        for (const f of facts) {
          output += `- ${f.key}: ${f.value}\n`;
        }
      }

      if (decisions.length) {
        output += "\n## Decisions\n";
        for (const d of decisions) {
          output += `- ${d.key}: ${d.value}\n`;
        }
      }

      if (prefs.length) {
        output += "\n## Preferences\n";
        for (const p of prefs) {
          output += `- ${p.key}: ${p.value}\n`;
        }
      }

      if (general.length) {
        output += "\n## General\n";
        for (const g of general) {
          output += `- ${g.key}: ${g.value}\n`;
        }
      }

      output += "--- END ---\n";
      return output;
    }

    // Fallback: markdown file
    const content = await fs.readFile(path.join(await ensureDir(), MEMORY_FILE), "utf-8");
    return content.trim();

  } catch (err) {
    if (err.code === "ENOENT" || err.code === "ERR_DIR_CLOSED") {return null;}
    console.warn(`⚠️ Failed to load project memory: ${err.message}`);
    return null;
  }
}

/**
 * Save a memory entry to SQLite and keep markdown in sync.
 */
export async function saveProjectMemory(content) {
  if (!content || typeof content !== "string") {
    return "❌ Memory content must be a non‑empty string.";
  }

  try {
    const db = getDatabase();
    // Store as a general memory entry
    db.setMemory("project_context", content, "general", "user");
    // Keep markdown in sync
    await writeMarkdown(content);
    return "✅ Project memory updated.";
  } catch (err) {
    return `❌ Failed to save: ${err.message}`;
  }
}

/**
 * Store a specific fact or decision.
 * @param {string} key - Memory key (e.g., "architecture", "decision:use-sqlite")
 * @param {string} value - Memory value
 * @param {string} category - Category (fact, decision, user_pref, general)
 */
export async function storeMemory(key, value, category = "general") {
  try {
    const db = getDatabase();
    db.setMemory(key, value, category, "agent");
    return `✅ Stored "${key}" in ${category} memory.`;
  } catch (err) {
    return `❌ Failed to store memory: ${err.message}`;
  }
}

/**
 * Search memory entries.
 */
export async function searchMemory(query) {
  try {
    const db = getDatabase();
    return db.searchMemory(query);
  } catch (err) {
    console.warn(`⚠️ Memory search failed: ${err.message}`);
    return [];
  }
}
