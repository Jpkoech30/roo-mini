/**
 * File read/write tool implementations with auto-backup.
 */

import fs from "fs/promises";
import path from "path";
import * as UI from "../../ui/printer.mjs";
import { generateDiff } from "./diffutil.mjs";

const BACKUP_DIR = ".roo-memory/backups";

/**
 * Resolve a file path safely — prevents directory traversal outside the project.
 * @param {string} cwd - Current working directory
 * @param {string} filePath - User-supplied file path
 * @returns {string} Resolved absolute path
 * @throws {Error} If path escapes the project directory
 */
function resolveSafe(cwd, filePath) {
  const resolved = path.resolve(cwd, filePath);
  // Normalize both paths for comparison (handle trailing slashes, etc.)
  const normalizedCwd = path.resolve(cwd) + path.sep;
  if (!resolved.startsWith(normalizedCwd)) {
    throw new Error(`Path traversal detected: "${filePath}" escapes the project directory`);
  }
  return resolved;
}

/**
 * Backup a file before modifying it. Creates a timestamped copy.
 * Silently skips if backup already exists for this file content (dedup).
 */
async function backupFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const backupPath = path.join(BACKUP_DIR, `${path.basename(filePath)}.${Date.now()}.bak`);
    const dir = path.dirname(backupPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(backupPath, content, "utf-8");
  } catch { /* file doesn't exist yet, nothing to backup */ }
}

/** Read the content of a file. */
export async function readFile(cwd, args) {
  if (!args.file_path || typeof args.file_path !== "string")
    {return "❌ Missing or invalid 'file_path' (string required).";}
  try {
    return await fs.readFile(resolveSafe(cwd, args.file_path), "utf-8");
  } catch (err) {
    return `❌ Error reading file: ${err.message}`;
  }
}

/** Write new content to a file (overwrites). */
export async function writeFile(cwd, args) {
  if (!args.file_path || typeof args.file_path !== "string")
    {return "❌ Missing or invalid 'file_path' (string required).";}
  if (args.content === undefined || args.content === null)
    {return "❌ Missing 'content'.";}
  const fullPath = resolveSafe(cwd, args.file_path);
  await backupFile(fullPath);
  try {
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, String(args.content), "utf-8");
    const diff = generateDiff("", String(args.content), args.file_path);
    return `✅ Wrote ${args.file_path}${diff}`;
  } catch (err) {
    return `❌ Error writing file: ${err.message}`;
  }
}

/** Replace text in a file (exact string match). */
export async function replaceInFile(cwd, args) {
  if (!args.file_path || typeof args.file_path !== "string")
    {return "❌ Missing or invalid 'file_path'.";}
  if (typeof args.old_str !== "string") {return "❌ Missing or invalid 'old_str'.";}
  if (typeof args.new_str !== "string") {return "❌ Missing or invalid 'new_str'.";}
  const fullPath = resolveSafe(cwd, args.file_path);
  await backupFile(fullPath);
  try {
    const content = await fs.readFile(fullPath, "utf-8");
    if (!content.includes(args.old_str))
      {return `❌ Could not find the specified text in ${args.file_path}.`;}
    const updated = content.replace(args.old_str, args.new_str);
    await fs.writeFile(fullPath, updated, "utf-8");
    const diff = generateDiff(content, updated, args.file_path);
    return `✅ Replaced text in ${args.file_path}${diff}`;
  } catch (err) {
    return `❌ Error replacing text: ${err.message}`;
  }
}

/** Append text to the end of a file. */
export async function appendToFile(cwd, args) {
  if (!args.file_path || typeof args.file_path !== "string")
    {return "❌ Missing or invalid 'file_path'.";}
  if (args.content === undefined || args.content === null)
    {return "❌ Missing 'content'.";}
  const fullPath = resolveSafe(cwd, args.file_path);
  await backupFile(fullPath);
  try {
    let content = "";
    try { content = await fs.readFile(fullPath, "utf-8"); } catch (err) { if (err.code !== "ENOENT") {throw err;} }
    const newContent = content + (content.endsWith("\n") ? "" : "\n") + String(args.content);
    await fs.writeFile(fullPath, newContent, "utf-8");
    const diff = generateDiff(content, newContent, args.file_path);
    return `✅ Appended to ${args.file_path}${diff}`;
  } catch (err) {
    return `❌ Error appending: ${err.message}`;
  }
}

/** Apply a SEARCH/REPLACE block with fuzzy fallback. */
export async function applyDiff(cwd, args) {
  if (!args.file_path || typeof args.file_path !== "string")
    {return "❌ Missing or invalid 'file_path'.";}
  if (typeof args.search_str !== "string")
    {return "❌ Missing or invalid 'search_str'.";}
  if (args.replace_str === undefined || args.replace_str === null)
    {return "❌ Missing 'replace_str'.";}
  const fullPath = resolveSafe(cwd, args.file_path);
  await backupFile(fullPath);
  try {
    const content = await fs.readFile(fullPath, "utf-8");

    // Try exact match first
    if (content.includes(args.search_str)) {
      const updated = content.replace(args.search_str, String(args.replace_str));
      await fs.writeFile(fullPath, updated, "utf-8");
      const diff = generateDiff(content, updated, args.file_path);
      return `✅ Applied diff to ${args.file_path}${diff}`;
    }

    // Fuzzy fallback: match word-by-word
    const searchTokens = args.search_str.trim().split(/\s+/);
    if (searchTokens.length > 0) {
      const searchStart = content.indexOf(searchTokens[0]);
      if (searchStart !== -1) {
        let wordIndex = searchStart;
        let allMatch = true;
        for (const token of searchTokens) {
          const pos = content.indexOf(token, wordIndex);
          if (pos === -1) { allMatch = false; break; }
          wordIndex = pos + token.length;
        }
        if (allMatch) {
          UI.printWarning("⚠️ Exact match not found. Attempting fuzzy match...");
          const before = content.slice(0, searchStart);
          const after = content.slice(wordIndex);
          const updated = before + String(args.replace_str) + after;
          await fs.writeFile(fullPath, updated, "utf-8");
          const diff = generateDiff(content, updated, args.file_path);
          return `✅ Applied diff to ${args.file_path} (fuzzy match)${diff}`;
        }
      }
    }

    return `❌ Could not find the specified content in ${args.file_path}. The file content may have changed.`;
  } catch (err) {
    return `❌ Error applying diff: ${err.message}`;
  }
}
