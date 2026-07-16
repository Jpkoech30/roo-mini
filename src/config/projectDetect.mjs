/**
 * Project auto-detection.
 * Scans the working directory to identify project type, dependencies, and structure.
 */

import fs from "fs/promises";
import path from "path";

/**
 * Detect the project type from known config files.
 * @returns {Promise<{type: string, language: string, deps: string[], configFiles: string[], summary: string}>}
 */
export async function detectProject(cwd) {
  const cwdPath = cwd || process.cwd();
  const files = await listTopFiles(cwdPath);
  const result = {
    type: "unknown",
    language: "unknown",
    deps: [],
    configFiles: files,
    summary: "",
  };

  // Node.js
  if (files.includes("package.json")) {
    result.type = "node";
    result.language = "JavaScript/Node.js";
    try {
      const pkg = JSON.parse(await fs.readFile(path.join(cwdPath, "package.json"), "utf-8"));
      result.deps = [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {}),
      ];
      if (pkg.scripts?.test) {result.testCmd = pkg.scripts.test;}
      if (pkg.scripts?.start) {result.startCmd = pkg.scripts.start;}
      result.summary = `Node.js project: ${pkg.name || "(unnamed)"} v${pkg.version || "?"}`;
    } catch { }
  }

  // Python
  if (files.some(f => /^(requirements\.txt|pyproject\.toml|setup\.py|Pipfile)$/.test(f))) {
    result.type = "python";
    result.language = "Python";
    result.summary = "Python project";
    if (files.includes("pyproject.toml")) {result.summary = "Python project (pyproject.toml)";}
  }

  // Rust
  if (files.includes("Cargo.toml")) {
    result.type = "rust";
    result.language = "Rust";
    result.summary = "Rust project";
  }

  // Go
  if (files.includes("go.mod")) {
    result.type = "go";
    result.language = "Go";
    result.summary = "Go project";
  }

  // Generic
  if (result.summary) {
    result.summary += ` | ${files.length} top-level files/dirs`;
  } else {
    result.summary = `Generic project (${files.length} top-level items)`;
  }

  return result;
}

async function listTopFiles(cwd) {
  try {
    const entries = await fs.readdir(cwd, { withFileTypes: true });
    return entries.map(e => e.name);
  } catch {
    return [];
  }
}
