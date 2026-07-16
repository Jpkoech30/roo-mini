/**
 * FTS5 search module — semantic-like retrieval over past conversations.
 *
 * Uses SQLite FTS5 full-text search with BM25 ranking.
 * No external dependencies or embedding APIs needed.
 */

import { getDatabase } from "./database.mjs";

/**
 * Search past conversations for relevant context.
 * @param {string} query - Natural language query
 * @param {object} [opts]
 * @param {number} [opts.limit=5] - Max results
 * @param {boolean} [opts.includeContent=false] - Include full message content
 * @returns {Promise<Array>} Ranked results
 */
export async function searchConversations(query, opts = {}) {
  const limit = opts.limit || 5;
  try {
    const db = getDatabase();
    const results = db.searchConversations(query, limit);

    return results.map(r => ({
      id: r.id,
      sessionId: r.session_id,
      role: r.role,
      snippet: r.snippet,
      toolName: r.tool_name,
      filePaths: r.file_paths ? JSON.parse(r.file_paths) : [],
      createdAt: r.created_at,
      content: opts.includeContent ? r.content : undefined,
    }));
  } catch (err) {
    console.warn(`⚠️ Search failed: ${err.message}`);
    return [];
  }
}

/**
 * Find past conversations about a specific file.
 * @param {string} filePath - Path to search for
 * @returns {Promise<Array>}
 */
export async function findMessagesByFile(filePath) {
  try {
    const db = getDatabase();
    return db.findMessagesByFile(filePath);
  } catch (err) {
    console.warn(`⚠️ File search failed: ${err.message}`);
    return [];
  }
}

/**
 * Build a context string from search results for injection into the system prompt.
 * @param {string} query - The user's current request
 * @returns {Promise<string>} Formatted context string
 */
export async function buildContextFromSearch(query) {
  const results = await searchConversations(query, { limit: 5, includeContent: false });

  if (!results.length) {return "";}

  let context = "\n--- RELEVANT PAST CONTEXT ---\n";
  for (const r of results) {
    context += `[${r.role}] ${r.snippet || "(content)"}\n`;
    if (r.filePaths.length) {
      context += `  Files: ${r.filePaths.join(", ")}\n`;
    }
  }
  context += "--- END ---\n";
  return context;
}

/**
 * Format a search query from the user's prompt for better FTS5 matching.
 * Extracts key terms and concepts.
 * @param {string} prompt - User's natural language prompt
 * @returns {string} FTS5-optimized query
 */
export function formatSearchQuery(prompt) {
  // Extract key terms: remove common words, keep meaningful ones
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been",
    "have", "has", "had", "do", "does", "did", "will", "would",
    "can", "could", "should", "may", "might", "shall",
    "i", "you", "he", "she", "it", "we", "they", "me", "us",
    "this", "that", "these", "those", "what", "which", "who",
    "and", "or", "but", "if", "because", "so", "than", "as",
    "at", "by", "for", "with", "about", "between", "into",
    "to", "of", "in", "on", "from", "after", "before",
    "how", "where", "why", "when", "let", "please", "need",
  ]);

  const terms = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s._-]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 1 && !stopWords.has(t))
    .slice(0, 10);

  if (!terms.length) {return prompt;}

  // Use AND for short queries, OR for longer ones
  const joiner = terms.length <= 3 ? " AND " : " OR ";
  return terms.join(joiner);
}
