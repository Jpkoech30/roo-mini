#!/usr/bin/env node
/**
 * Test runner for roo-mini.
 *
 * Usage:
 *   node scripts/test.mjs              # Run all tests
 *   node scripts/test.mjs --watch      # Watch mode
 *   node scripts/test.mjs --coverage   # With coverage
 */
import { execSync } from "child_process";

const args = process.argv.slice(2).join(" ");
const cmd = `node --experimental-vm-modules node_modules/.bin/jest ${args}`;

try {
  execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
} catch {
  process.exit(1);
}
