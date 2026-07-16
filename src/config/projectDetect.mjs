import fs from "fs/promises";
import path from "path";

async function listTopFiles(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.map(e => e.name);
  } catch {
    return [];
  }
}

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

  if (files.includes("package.json")) {
    result.type = "node";
    result.language = "JavaScript/Node.js";
    try {
      const pkg = JSON.parse(await fs.readFile(path.join(cwdPath, "package.json"), "utf-8"));
      result.deps = [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {}),
      ];
      result.summary = `Node.js project: ${pkg.name || "(unnamed)"} v${pkg.version || "?"} | ${files.length} top-level files/dirs`;
    } catch {
      result.summary = `Node.js project (${files.length} top-level items)`;
    }
  }

  if (files.some(f => /^(requirements\.txt|pyproject\.toml|setup\.py|Pipfile)$/.test(f))) {
    result.type = "python";
    result.language = "Python";
    result.summary = "Python project";
  }

  if (files.includes("Cargo.toml")) {
    result.type = "rust";
    result.language = "Rust";
    result.summary = "Rust project";
  }

  if (files.includes("go.mod")) {
    result.type = "go";
    result.language = "Go";
    result.summary = "Go project";
  }

  if (!result.summary) {
    result.summary = `Project (${files.length} top-level items)`;
  }

  return result;
}
