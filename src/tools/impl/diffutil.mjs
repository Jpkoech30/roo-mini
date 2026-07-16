import { diffLines } from "diff";

export function generateDiff(oldContent, newContent, filePath = "file") {
  const changes = diffLines(oldContent, newContent);
  if (changes.length === 1 && !changes[0].added && !changes[0].removed) return "";

  const lines = [];
  let added = 0;
  let removed = 0;

  for (const part of changes) {
    const count = part.count || part.value.split("\n").length - 1;
    if (part.added) {
      added += count;
      for (const line of part.value.split("\n").slice(0, -1)) lines.push(`+ ${line}`);
    } else if (part.removed) {
      removed += count;
      for (const line of part.value.split("\n").slice(0, -1)) lines.push(`- ${line}`);
    } else {
      const ctxLines = part.value.split("\n").slice(0, -1);
      if (ctxLines.length > 6) {
        ctxLines.slice(0, 3).forEach(l => lines.push(`  ${l}`));
        lines.push(`  ... ${ctxLines.length - 6} unchanged lines ...`);
        ctxLines.slice(-3).forEach(l => lines.push(`  ${l}`));
      } else {
        ctxLines.forEach(l => lines.push(`  ${l}`));
      }
    }
  }

  return `\nDiff for ${filePath}: +${added}/-${removed} lines\n${lines.join("\n")}`;
}
