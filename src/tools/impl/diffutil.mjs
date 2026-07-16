/**
 * Unified diff utility for displaying file changes.
 * Uses the `diff` npm package.
 */

import { diffLines } from "diff";

/**
 * Generate a unified-diff-style string showing changes between old and new content.
 * @param {string} oldContent - Original file content
 * @param {string} newContent - New file content
 * @param {string} [filePath] - Optional file path for context
 * @returns {string} Formatted diff string
 */
export function generateDiff(oldContent, newContent, filePath = "file") {
  const changes = diffLines(oldContent, newContent);
  if (changes.length === 1 && !changes[0].added && !changes[0].removed) {
    return ""; // No changes
  }

  const lines = [];
  let lineNum = 0;
  let added = 0;
  let removed = 0;

  for (const part of changes) {
    const count = part.count || part.value.split("\n").length - 1;
    if (part.added) {
      added += count;
      for (const line of part.value.split("\n").slice(0, -1)) {
        lines.push(`+ ${line}`);
      }
    } else if (part.removed) {
      removed += count;
      for (const line of part.value.split("\n").slice(0, -1)) {
        lines.push(`- ${line}`);
      }
      lineNum += count;
    } else {
      // Context lines - show first and last 2 of each unchanged block
      const ctxLines = part.value.split("\n").slice(0, -1);
      if (ctxLines.length > 6) {
        // Show first 3 and last 3
        ctxLines.slice(0, 3).forEach(l => lines.push(`  ${l}`));
        lines.push(`  ... ${ctxLines.length - 6} unchanged lines ...`);
        ctxLines.slice(-3).forEach(l => lines.push(`  ${l}`));
      } else {
        ctxLines.forEach(l => lines.push(`  ${l}`));
      }
      lineNum += ctxLines.length;
    }
  }

  const diffHeader = `📋 Diff for ${filePath}:  +${added}/-${removed} lines`;
  return `\n${diffHeader}\n${lines.join("\n")}`;
}
