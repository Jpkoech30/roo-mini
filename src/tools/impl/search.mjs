import fs from "fs/promises";
import path from "path";
import { glob } from "glob";

export async function searchInFile(cwd, args) {
  if (!args.file_path || !args.search_term) return "Missing file_path or search_term.";
  try {
    const content = await fs.readFile(path.join(cwd, args.file_path), "utf-8");
    const lines = content.split("\n");
    const matchingLines = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(args.search_term)) {
        matchingLines.push(`  L${i + 1}: ${lines[i].trim().slice(0, 120)}`);
      }
    }
    if (!matchingLines.length) return "Not found.";
    return `Found ${matchingLines.length} occurrence(s) in ${args.file_path}:\n${matchingLines.join("\n")}`;
  } catch (err) {
    return `Error searching file: ${err.message}`;
  }
}

export async function searchFilesGlob(cwd, args) {
  if (!args.pattern) return "Missing 'pattern'.";
  try {
    const files = await glob(args.pattern, { cwd: cwd || process.cwd(), ignore: "node_modules/**" });
    if (!files.length) return `No files matching "${args.pattern}".`;

    if (!args.search_term) return `Found ${files.length} file(s):\n${files.map(f => `- ${f}`).join("\n")}`;

    const results = [];
    for (const file of files) {
      try {
        const content = await fs.readFile(path.join(cwd, file), "utf-8");
        if (content.includes(args.search_term)) {
          results.push(file);
        }
      } catch { /* skip unreadable */ }
    }
    return results.length
      ? `Found ${results.length} file(s) with "${args.search_term}":\n${results.map(f => `- ${f}`).join("\n")}`
      : `No files matching "${args.pattern}" contain "${args.search_term}".`;
  } catch (err) {
    return `Error searching files: ${err.message}`;
  }
}
