/**
 * Cost Report — reads session usage from SQLite and prints a summary.
 *
 * Usage: node scripts/costs.mjs
 * Shows: total sessions, tokens, estimated costs, and per-session breakdown.
 */

import { getDatabase, resetDatabase } from "../src/memory/database.mjs";
import path from "path";
import chalk from "chalk";

// Pricing (matches defaults in config)
const PRICE_PER_M_INPUT = parseFloat(process.env.PRICE_PER_M_INPUT || "0.14");
const PRICE_PER_M_OUTPUT = parseFloat(process.env.PRICE_PER_M_OUTPUT || "0.28");

async function main() {
  try {
    resetDatabase();
    const db = getDatabase();
    await db.initialize();

    // Count sessions
    const sessionCount = db.db.prepare(`
      SELECT COUNT(DISTINCT session_id) as count FROM conversations
    `).get();

    // Total tokens
    const tokenStats = db.db.prepare(`
      SELECT 
        COUNT(*) as total_messages,
        SUM(tokens) as total_tokens,
        SUM(CASE WHEN role = 'user' THEN tokens ELSE 0 END) as input_tokens,
        SUM(CASE WHEN role = 'assistant' THEN tokens ELSE 0 END) as output_tokens
      FROM conversations
    `).get();

    // Per-session breakdown
    const sessions = db.db.prepare(`
      SELECT 
        session_id,
        COUNT(*) as messages,
        SUM(tokens) as tokens,
        MIN(created_at) as first_seen,
        MAX(created_at) as last_seen
      FROM conversations
      GROUP BY session_id
      ORDER BY last_seen DESC
      LIMIT 20
    `).all();

    // Memory entries
    const memoryCount = db.db.prepare(`SELECT COUNT(*) as count FROM memory`).get();

    // Tasks
    const taskStats = db.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM tasks
    `).get();

    // ── Print Report ──

    const totalTokens = tokenStats.total_tokens || 0;
    const inputTokens = tokenStats.input_tokens || 0;
    const outputTokens = tokenStats.output_tokens || 0;

    const inputCost = (inputTokens / 1_000_000) * PRICE_PER_M_INPUT;
    const outputCost = (outputTokens / 1_000_000) * PRICE_PER_M_OUTPUT;
    const totalCost = inputCost + outputCost;

    console.log(chalk.bold.cyan("\n📊 ROO-MINI Cost Report\n"));

    // Summary
    console.log(chalk.bold("Summary"));
    console.log(chalk.dim(`  Sessions:      ${chalk.white(sessionCount.count)}`));
    console.log(chalk.dim(`  Total messages: ${chalk.white(tokenStats.total_messages)}`));
    console.log(chalk.dim(`  Total tokens:   ${chalk.white(totalTokens.toLocaleString())}`));
    console.log(chalk.dim(`  Input tokens:   ${chalk.white(inputTokens.toLocaleString())}`));
    console.log(chalk.dim(`  Output tokens:  ${chalk.white(outputTokens.toLocaleString())}`));
    console.log(chalk.dim(`  Est. cost:      ${chalk.white(totalCost < 0.01 ? "< $0.01" : `$${totalCost.toFixed(4)}`)}`));
    console.log();

    // Per-session breakdown
    console.log(chalk.bold("Sessions\n"));
    for (const s of sessions) {
      const msgCount = chalk.dim(`${s.messages} msg`);
      const tokCount = chalk.dim(`${(s.tokens || 0).toLocaleString()} tok`);
      const sessionCost = ((s.tokens || 0) / 1_000_000) * ((PRICE_PER_M_INPUT + PRICE_PER_M_OUTPUT) / 2);
      const cost = chalk.dim(sessionCost < 0.01 ? "<$0.01" : `$${sessionCost.toFixed(4)}`);
      const date = s.first_seen ? new Date(s.first_seen + "Z").toLocaleDateString() : "?";
      const sid = s.session_id ? s.session_id.slice(0, 24) + "..." : "?";
      console.log(`  ${chalk.cyan(sid)}  ${msgCount} · ${tokCount} · ${cost} · ${date}`);
    }

    // Memory & Tasks
    console.log();
    console.log(chalk.bold("Storage"));
    console.log(chalk.dim(`  Memory entries: ${chalk.white(memoryCount.count)}`));
    console.log(chalk.dim(`  Tasks:          ${chalk.white(taskStats.total)} ` +
      `(${chalk.green(`${taskStats.done} done`)}, ` +
      `${chalk.yellow(`${taskStats.pending} pending`)}, ` +
      `${chalk.red(`${taskStats.blocked} blocked`)}, ` +
      `${chalk.dim(`${taskStats.cancelled} cancelled`)})`));

    // Reset to clean state
    await db.close();

  } catch (err) {
    console.error(chalk.red(`❌ Failed to generate report: ${err.message}`));
    process.exit(1);
  }
}

main();
