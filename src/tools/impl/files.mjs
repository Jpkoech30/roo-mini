import fs from "fs/promises";
import path from "path";
import { generateDiff } from "./diffutil.mjs";

const BACKUP_DIR = ".roo-memory/backups";

function resolveSafe(cwd, filePath) {
  const resolved = path.resolve(cwd, filePath);
  const normalizedCwd = path.resolve(cwd) + path.sep;

  // Allow system temp directories — agent may need to write temp scripts
  const tempDirs = [process.env.TMPDIR, process.env.TMP, process.env.TEMP, "/tmp", "/var/tmp"]
    .filter(Boolean)
    .map(d => path.resolve(d) + path.sep);

  const allowed = [normalizedCwd, ...tempDirs];
  if (allowed.some(dir => resolved.startsWith(dir))) {
    return resolved;
  }

  throw new Error(`Path traversal detected: "${filePath}" escapes the project directory. Allowed: project dir or system temp.`);
}

async function backupFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const backupPath = path.join(BACKUP_DIR, `${path.basename(filePath)}.${Date.now()}.bak`);
    const dir = path.dirname(backupPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(backupPath, content, "utf-8");
  } catch { /* file doesn't exist */ }
}

export async function readFile(cwd, args) {
  if (!args.file_path || typeof args.file_path !== "string")
    return "Missing file_path (string required).";
  try {
    return await fs.readFile(resolveSafe(cwd, args.file_path), "utf-8");
  } catch (err) {
    return `Error reading file: ${err.message}`;
  }
}

export async function writeFile(cwd, args) {
  if (!args.file_path || typeof args.file_path !== "string")
    return "Missing file_path (string required).";
  if (args.content === undefined || args.content === null)
    return "Missing content.";
  const target = resolveSafe(cwd, args.file_path);
  try {
    await fs.mkdir(path.dirname(target), { recursive: true });
    const oldContent = await fs.readFile(target, "utf-8").catch(() => "");
    await backupFile(target);
    await fs.writeFile(target, String(args.content), "utf-8");
    const diff = generateDiff(oldContent, String(args.content), args.file_path);
    return `Written to ${args.file_path}${diff}`;
  } catch (err) {
    return `Error writing file: ${err.message}`;
  }
}

export async function replaceInFile(cwd, args) {
  if (!args.file_path || typeof args.file_path !== "string")
    return "Missing file_path.";
  if (typeof args.old_str !== "string" || typeof args.new_str !== "string")
    return "Missing old_str or new_str.";
  const target = resolveSafe(cwd, args.file_path);
  try {
    const content = await fs.readFile(target, "utf-8");
    if (!content.includes(args.old_str))
      return "old_str not found in file.";
    const newContent = content.replace(args.old_str, args.new_str);
    await backupFile(target);
    await fs.writeFile(target, newContent, "utf-8");
    const diff = generateDiff(content, newContent, args.file_path);
    return `Replaced in ${args.file_path}${diff}`;
  } catch (err) {
    return `Error replacing text: ${err.message}`;
  }
}

export async function appendToFile(cwd, args) {
  if (!args.file_path || typeof args.file_path !== "string")
    return "Missing file_path.";
  if (args.content === undefined)
    return "Missing content.";
  const target = resolveSafe(cwd, args.file_path);
  try {
    await fs.mkdir(path.dirname(target), { recursive: true });
    const oldContent = await fs.readFile(target, "utf-8").catch(() => "");
    await backupFile(target);
    await fs.appendFile(target, String(args.content), "utf-8");
    return `Appended to ${args.file_path}`;
  } catch (err) {
    return `Error appending: ${err.message}`;
  }
}

export async function applyDiff(cwd, args) {
  return "apply_diff not implemented yet. Use replace_in_file or write_file instead.";
}
