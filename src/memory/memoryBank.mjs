import fs from "fs/promises";
import path from "path";

const MEMORY_DIR = ".roo-memory";
const PROJECT_MEMORY_FILE = path.join(MEMORY_DIR, "project.md");

/**
 * Save persistent project context to the memory bank.
 * This context is re-injected into every session.
 */
export async function saveProjectMemory(context) {
  await fs.mkdir(MEMORY_DIR, { recursive: true });
  await fs.writeFile(PROJECT_MEMORY_FILE, context, "utf-8");
  return "Project memory updated.";
}

/**
 * Load the persistent project context.
 */
export async function loadProjectMemory() {
  try {
    return await fs.readFile(PROJECT_MEMORY_FILE, "utf-8");
  } catch {
    return "";
  }
}
