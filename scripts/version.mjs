/**
 * Version bump helper.
 *
 * Usage:
 *   node scripts/version.mjs          # Shows current version
 *   node scripts/version.mjs patch    # 1.0.0 → 1.0.1
 *   node scripts/version.mjs minor    # 1.0.0 → 1.1.0
 *   node scripts/version.mjs major    # 1.0.0 → 2.0.0
 *
 * Updates package.json, roo.config.json, and VERSION.
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// --- Load current version ---
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8"));
let version = pkg.version;

const arg = process.argv[2]?.toLowerCase();

if (arg) {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    console.error(`❌ Invalid version format: ${version}`);
    process.exit(1);
  }

  let [major, minor, patch] = parts;

  switch (arg) {
    case "major":
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case "minor":
      minor += 1;
      patch = 0;
      break;
    case "patch":
      patch += 1;
      break;
    default:
      console.error(`❌ Unknown bump type "${arg}". Use: patch, minor, major`);
      process.exit(1);
  }

  version = `${major}.${minor}.${patch}`;

  // --- Update package.json ---
  pkg.version = version;
  writeFileSync(resolve(root, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  console.log(`✅ package.json → ${version}`);

  // --- Update roo.config.json ---
  try {
    const configPath = resolve(root, "roo.config.json");
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    config.version = version;
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
    console.log(`✅ roo.config.json → ${version}`);
  } catch {
    console.log("⚠️  roo.config.json not found, skipping.");
  }

  // --- Update VERSION file ---
  writeFileSync(resolve(root, "VERSION"), version + "\n");
  console.log(`✅ VERSION → ${version}`);
} else {
  console.log(`📦 roo-mini v${version}`);
}

console.log(`\n➡️  npm version ${arg || version}`);
