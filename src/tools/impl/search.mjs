/**
 * Search tool implementations.
 */

import fs from "fs/promises";
import path from "path";

/** Search for text or regex inside a specific file. Returns line numbers + context. */
export async function searchInFile(cwd, args) {
  if (!args.file_path || typeof args.file_path !== "string")
    {return "❌ Missing or invalid 'file_path'.";}
  if (!args.search_term || typeof args.search_term !== "string")
    {return "❌ Missing or invalid 'search_term'.";}
  const useRegex = args.regex === true;
  try {
    const content = await fs.readFile(path.join(cwd, args.file_path), "utf-8");
    const lines = content.split("\n");

    if (useRegex) {
      const regex = new RegExp(args.search_term, "gmi");
      const matches = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let match;
        while ((match = regex.exec(line)) !== null) {
          const start = Math.max(0, match.index - 20);
          const end = Math.min(line.length, match.index + match[0].length + 20);
          const context = (start > 0 ? "..." : "") +
            line.slice(start, end) +
            (end < line.length ? "..." : "");
          matches.push({ line: i + 1, match: match[0], context });
          if (!regex.global) {break;}
        }
      }
      if (!matches.length) {return `❌ No matches for regex "${args.search_term}" in ${args.file_path}.`;}
      const resultLines = matches.map(m => `  L${m.line}: ...${m.context}...`);
      return `✅ Found ${matches.length} match(es) in ${args.file_path}:\n${resultLines.join("\n")}`;
    }

    // Simple string search with line numbers
    const matchingLines = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(args.search_term)) {
        const context = lines[i].trim().slice(0, 120);
        matchingLines.push(`  L${i + 1}: ${context}`);
      }
    }
    if (!matchingLines.length) {return `❌ Not found.`;}
    return `✅ Found ${matchingLines.length} occurrence(s) of "${args.search_term}" in ${args.file_path}:\n${matchingLines.join("\n")}`;
  } catch (err) {
    if (err instanceof SyntaxError) {return `❌ Invalid regex: "${args.search_term}" — ${err.message}`;}
    return `❌ Error searching file: ${err.message}`;
  }
}

/** Find files matching a pattern that contain specific text. */
export async function searchFilesGlob(cwd, args) {
  if (!args.pattern || typeof args.pattern !== "string")
    {return "❌ Missing or invalid 'pattern'.";}
  if (!args.search_term || typeof args.search_term !== "string")
    {return "❌ Missing or invalid 'search_term'.";}
  try {
    const glob = await import("glob");
    const files = await glob.glob(args.pattern, {
      cwd,
      ignore: ["node_modules/**", "**/node_modules/**"],
      dot: true,
    });
    if (!files.length) {return "❌ No files matched the pattern.";}
    const matches = [];
    for (const file of files.slice(0, 20)) {
      try {
        const full = path.join(cwd, file);
        const content = await fs.readFile(full, "utf-8");
        if (content.includes(args.search_term)) {matches.push(file);}
      } catch { }
    }
    if (!matches.length) {return `❌ No files containing "${args.search_term}" found.`;}
    return `✅ Found in:\n${matches.map(f => `- ${f}`).join("\n")}`;
  } catch (err) {
    return `❌ Error searching files: ${err.message}`;
  }
}
