/**
 * Conversation memory — stores and retrieves conversation history.
 *
 * Uses SQLite (via database.mjs) with FTS5 full-text search.
 * Keeps JSON file as a fallback for backward compatibility.
 */

import { getDatabase } from "./database.mjs";
import fs from "fs/promises";
import path from "path";

const MEMORY_DIR = ".roo-memory";
const CONVERSATION_FILE = "conversation.json";
const MAX_EXCHANGES = 50;

// ─── JSON Fallback (backward compat) ───

async function ensureDir() {
  const dir = path.join(process.cwd(), MEMORY_DIR);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function readJSON() {
  try {
    const dir = await ensureDir();
    const data = await fs.readFile(path.join(dir, CONVERSATION_FILE), "utf-8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {return [];}
    if (err instanceof SyntaxError) {
      console.warn(`⚠️ Corrupt memory file. Resetting.`);
      return [];
    }
    return [];
  }
}

async function writeJSON(history) {
  try {
    const dir = await ensureDir();
    await fs.writeFile(path.join(dir, CONVERSATION_FILE), JSON.stringify(history, null, 2), "utf-8");
  } catch { /* best effort */ }
}

// ─── SQLite Operations ───

let _sessionId = null;

/**
 * Get or create the current session ID.
 */
function getSessionId() {
  if (!_sessionId) {
    _sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  return _sessionId;
}

/**
 * Set a session ID (called by the agent loop).
 */
export function setSessionId(id) {
  _sessionId = id;
}

/**
 * Load conversation history (JSON fallback).
 * Returns the full JSON array.
 */
export async function loadConversation() {
  return await readJSON();
}

/**
 * Save conversation history (JSON fallback, used by shutdown handler).
 */
export async function saveConversation(history) {
  await writeJSON(history);
}

/**
 * Add a user-assistant exchange to both SQLite and JSON.
 */
export async function addToConversation(user, assistant) {
  // JSON fallback
  const history = await readJSON();
  history.push({ timestamp: new Date().toISOString(), user, assistant });
  if (history.length > MAX_EXCHANGES) {
    history.splice(0, history.length - MAX_EXCHANGES);
  }
  await writeJSON(history);

  // SQLite
  try {
    const db = getDatabase();
    const sid = getSessionId();
    db.addMessage(sid, "user", user);
    db.addMessage(sid, "assistant", assistant);
  } catch { /* best effort */ }
}

/**
 * Get a summary of recent conversation history (JSON fallback).
 */
export async function getConversationSummary() {
  const history = await readJSON();
  if (!history.length) {return null;}
  const recent = history.slice(-8);
  let summary = "--- RECENT CONVERSATION ---\n";
  recent.forEach((e, i) => {
    const user = e.user?.slice(0, 80) || "(empty)";
    const assistant = e.assistant?.slice(0, 80) || "(empty)";
    summary += `[${i + 1}] User: ${user}...\n    Assistant: ${assistant}...\n\n`;
  });
  return summary;
}

/**
 * Clear conversation memory.
 */
export async function clearConversation() {
  await writeJSON([]);
  try {
    const db = getDatabase();
    db.clearAll();
  } catch { /* best effort */ }
  return "✅ Conversation cleared.";
}
