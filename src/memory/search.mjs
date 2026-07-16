import { loadConversation } from "./conversationMemory.mjs";

/**
 * Simple full-text search over past conversation entries.
 */
export async function searchConversations(query, options = {}) {
  const limit = options.limit || 5;
  const history = await loadConversation();
  const term = query.toLowerCase();

  const results = [];

  for (const entry of history) {
    if (results.length >= limit) break;

    const userMatch = (entry.user || "").toLowerCase().includes(term);
    const asstMatch = (entry.assistant || "").toLowerCase().includes(term);

    if (userMatch || asstMatch) {
      const snippet = userMatch ? entry.user : entry.assistant;
      results.push({
        sessionId: entry.sessionId || "unknown",
        role: userMatch ? "user" : "assistant",
        snippet: snippet.slice(0, 300),
        timestamp: entry.timestamp,
      });
    }
  }

  return results;
}
