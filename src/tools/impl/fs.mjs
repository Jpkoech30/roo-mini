import fs from "fs/promises";
import path from "path";

export async function listFiles(cwd, args) {
  const dir = args.dir_path || ".";
  const recursive = args.recursive === true;
  try {
    if (recursive) {
      const { glob } = await import("glob");
      const allFiles = await glob("**/*", {
        cwd: path.join(cwd, dir),
        ignore: ["node_modules/**", "**/node_modules/**"],
        dot: true,
        nodir: false,
      });
      return `${dir} (recursive):\n${allFiles.map(f => `- ${f}`).join("\n")}`;
    }
    const entries = await fs.readdir(path.join(cwd, dir), { withFileTypes: true });
    const files = entries.map(e => e.name + (e.isDirectory() ? "/" : ""));
    return `${dir}:\n${files.map(f => `- ${f}`).join("\n")}`;
  } catch (err) {
    return `Error listing directory: ${err.message}`;
  }
}

export async function moveFile(cwd, args) {
  if (!args.source) return "Missing 'source'.";
  if (!args.destination) return "Missing 'destination'.";
  try {
    await fs.mkdir(path.dirname(path.join(cwd, args.destination)), { recursive: true });
    await fs.rename(path.join(cwd, args.source), path.join(cwd, args.destination));
    return `Moved ${args.source} -> ${args.destination}`;
  } catch (err) {
    return `Error moving: ${err.message}`;
  }
}

export async function deleteFile(cwd, args) {
  if (!args.file_path) return "Missing 'file_path'.";
  try {
    await fs.rm(path.join(cwd, args.file_path), { recursive: true, force: true });
    return `Deleted ${args.file_path}`;
  } catch (err) {
    return `Error deleting: ${err.message}`;
  }
}

export async function createDirectory(cwd, args) {
  if (!args.dir_path) return "Missing 'dir_path'.";
  try {
    await fs.mkdir(path.join(cwd, args.dir_path), { recursive: true });
    return `Created directory ${args.dir_path}`;
  } catch (err) {
    return `Error creating directory: ${err.message}`;
  }
}
