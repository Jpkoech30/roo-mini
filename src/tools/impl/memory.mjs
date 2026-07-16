export async function clearMemory(_cwd, _args) {
  try {
    const { clearConversation } = await import("../../memory/conversationMemory.mjs");
    return await clearConversation();
  } catch (err) {
    return `Failed to clear memory: ${err.message}`;
  }
}

export async function showMemory(_cwd, _args) {
  try {
    const { loadConversation } = await import("../../memory/conversationMemory.mjs");
    const history = await loadConversation();
    if (!history.length) return "No conversation history.";
    return history.slice(-5).map((e, i) => {
      const user = (e.user || "(empty)").slice(0, 100);
      const assistant = (e.assistant || "(empty)").slice(0, 100);
      return `[${i + 1}] You: ${user}\n    Agent: ${assistant}`;
    }).join("\n\n");
  } catch (err) {
    return `Failed to show memory: ${err.message}`;
  }
}

export async function updateProjectMemory(cwd, args) {
  if (!args.context || typeof args.context !== "string")
    return "Missing 'context'.";
  try {
    const { saveProjectMemory } = await import("../../memory/memoryBank.mjs");
    return await saveProjectMemory(args.context);
  } catch (err) {
    return `Failed to update project memory: ${err.message}`;
  }
}
