import fs from "fs/promises";
import path from "path";

const MEMORY_DIR = ".roo-memory";
const CONVERSATION_FILE = path.join(MEMORY_DIR, "conversation.json");

async function ensureDir() {
  await fs.mkdir(MEMORY_DIR, { recursive: true });
}

async function ensureFile() {
  await ensureDir();
  try {
    await fs.access(CONVERSATION_FILE);
  } catch {
    await fs.writeFile(CONVERSATION_FILE, "[]", "utf-8");
  }
}

export async function loadConversation() {
  await ensureFile();
  try {
    const data = await fs.readFile(CONVERSATION_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function appendToConversation(user, assistant) {
  const history = await loadConversation();
  history.push({
    user,
    assistant,
    timestamp: new Date().toISOString(),
  });
  // Keep last 200 entries
  const trimmed = history.slice(-200);
  await fs.writeFile(CONVERSATION_FILE, JSON.stringify(trimmed, null, 2), "utf-8");
}

export async function clearConversation() {
  await ensureDir();
  await fs.writeFile(CONVERSATION_FILE, "[]", "utf-8");
  return "Conversation cleared.";
}
