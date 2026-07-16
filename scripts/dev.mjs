#!/usr/bin/env node
/**
 * Development helper script.
 * Run with: node scripts/dev.mjs
 */
import { execSync } from "child_process";

const cmd = process.argv[2] || "start";

const scripts = {
  start: "node src/index.mjs",
  lint: 'npx eslint "src/**/*.mjs"',
  test: 'node --experimental-vm-modules node_modules/.bin/jest --passWithNoTests',
};

if (scripts[cmd]) {
  console.log(`Running: ${scripts[cmd]}`);
  execSync(scripts[cmd], { stdio: "inherit", cwd: process.cwd() });
} else {
  console.error(`Unknown script: ${cmd}`);
  console.error(`Available: ${Object.keys(scripts).join(", ")}`);
}
