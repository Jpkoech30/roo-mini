/**
 * Memory tool implementations.
 */

/** Clear the conversation history. */
export async function clearMemory(_cwd, _args) {
  try {
    const { clearConversation } = await import("../../memory/conversationMemory.mjs");
    return await clearConversation();
  } catch (err) {
    return `❌ Failed to clear memory: ${err.message}`;
  }
}

/** Show the recent conversation history. */
export async function showMemory(_cwd, _args) {
  try {
    const { loadConversation } = await import("../../memory/conversationMemory.mjs");
    const history = await loadConversation();
    if (!history.length) {return "📭 No conversation history.";}
    return history.slice(-5).map((e, i) => {
      const user = (e.user || "(empty)").slice(0, 100);
      const assistant = (e.assistant || "(empty)").slice(0, 100);
      return `[${i + 1}] You: ${user}\n    Agent: ${assistant}`;
    }).join("\n\n");
  } catch (err) {
    return `❌ Failed to show memory: ${err.message}`;
  }
}

/** Save or update the project-level memory. */
export async function updateProjectMemory(cwd, args) {
  if (!args.content || typeof args.content !== "string")
    {return "❌ Missing or invalid 'content'.";}
  try {
    const { saveProjectMemory } = await import("../../memory/memoryBank.mjs");
    return await saveProjectMemory(args.content);
  } catch (err) {
    return `❌ Failed to update project memory: ${err.message}`;
  }
}
