/**
 * Filesystem tool implementations (list, move, delete, create directory).
 */

import fs from "fs/promises";
import path from "path";

/** List files and folders in a directory. Supports optional recursive listing. */
export async function listFiles(cwd, args) {
  const dir = args.dir_path || ".";
  if (typeof dir !== "string") {return "❌ Invalid 'dir_path'.";}
  const recursive = args.recursive === true;
  try {
    if (recursive) {
      const { glob } = await import("glob");
      const allFiles = await glob.glob("**/*", {
        cwd: path.join(cwd, dir),
        ignore: ["node_modules/**", "**/node_modules/**"],
        dot: true,
        nodir: false,
      });
      return `📁 ${dir} (recursive):\n${allFiles.map(f => `- ${f}`).join("\n")}`;
    }
    const entries = await fs.readdir(path.join(cwd, dir), { withFileTypes: true });
    const files = entries.map(e => e.name + (e.isDirectory() ? "/" : ""));
    return `📁 ${dir}:\n${files.map(f => `- ${f}`).join("\n")}`;
  } catch (err) {
    return `❌ Error listing directory: ${err.message}`;
  }
}

/** Move or rename a file or directory. */
export async function moveFile(cwd, args) {
  if (!args.source || typeof args.source !== "string")
    {return "❌ Missing or invalid 'source'.";}
  if (!args.destination || typeof args.destination !== "string")
    {return "❌ Missing or invalid 'destination'.";}
  const src = path.join(cwd, args.source);
  const dest = path.join(cwd, args.destination);
  try {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.rename(src, dest);
    return `✅ Moved ${args.source} → ${args.destination}`;
  } catch (err) {
    return `❌ Error moving: ${err.message}`;
  }
}

/** Delete a file or empty directory. */
export async function deleteFile(cwd, args) {
  if (!args.path || typeof args.path !== "string")
    {return "❌ Missing or invalid 'path'.";}
  const target = path.join(cwd, args.path);
  try {
    const stat = await fs.stat(target);
    if (stat.isDirectory()) {
      const contents = await fs.readdir(target);
      if (contents.length) {return `❌ Directory not empty: ${args.path}`;}
      await fs.rmdir(target);
    } else {
      await fs.unlink(target);
    }
    return `✅ Deleted ${args.path}`;
  } catch (err) {
    return `❌ Error deleting: ${err.message}`;
  }
}

/** Create a new directory (and parent directories if needed). */
export async function createDirectory(cwd, args) {
  if (!args.path || typeof args.path !== "string")
    {return "❌ Missing or invalid 'path'.";}
  try {
    await fs.mkdir(path.join(cwd, args.path), { recursive: true });
    return `✅ Created directory: ${args.path}`;
  } catch (err) {
    return `❌ Error creating directory: ${err.message}`;
  }
}
