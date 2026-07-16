/**
 * Task Planner — breaks complex user requests into structured task DAGs
 * using a fast/cheap LLM call (the existing summary model).
 *
 * The planner produces a JSON array of tasks with dependencies,
 * modes, and descriptions. The orchestrator reviews and approves
 * before execution.
 */

import { client, getSummaryModel } from "../config/deepseek.mjs";
import { validateDAG } from "./scheduler.mjs";

/**
 * Plan: break a user request into a structured task DAG.
 *
 * @param {string} userRequest - The user's original request
 * @param {object} [options]
 * @param {string} [options.projectContext] - Optional context about the project
 * @param {number} [options.temperature=0.3] - LLM temperature for planning
 * @returns {Promise<{success: boolean, tasks: Array, error: string|null, raw: string|null}>}
 */
export async function planRequest(userRequest, options = {}) {
  const temperature = options.temperature ?? 0.3;

  const systemPrompt = `You are a planning assistant. Break down development tasks into clear, actionable sub-tasks.

Given a user request, produce a JSON array of tasks. Each task must have:
- title: short, clear name
- description: what to do (1-2 sentences)
- mode: "architect" for design/planning tasks, "code" for implementation
- depends_on: array of titles of tasks this depends on (must be from this same set)
- priority: 0-5 (higher = more important)

RULES:
- Keep it to 3-7 tasks max
- Planning/design tasks come first (architect mode)
- Implementation tasks come after their dependencies (code mode)
- Use depends_on to create a logical, non-cyclic order
- Task titles must be unique
- Each task should be independently executable
- Tests and documentation should be separate tasks

Output ONLY valid JSON. No markdown, no explanation.
Example:
[
  {"title": "Design auth architecture", "description": "Plan the authentication system architecture and data flow", "mode": "architect", "depends_on": [], "priority": 5},
  {"title": "Implement User model", "description": "Create User model with password hashing and validation", "mode": "code", "depends_on": ["Design auth architecture"], "priority": 4}
]`;

  const userMessage = options.projectContext
    ? `Project context:\n${options.projectContext}\n\nRequest: ${userRequest}`
    : userRequest;

  try {
    const response = await client.chat.completions.create({
      model: getSummaryModel(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature,
      max_tokens: 2000,
    });

    const raw = response.choices[0].message.content.trim();

    // Extract JSON from the response (handle potential markdown wrapping)
    let jsonStr = raw;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const tasks = JSON.parse(jsonStr);

    // Validate structure
    if (!Array.isArray(tasks)) {
      return { success: false, tasks: [], error: "Planner did not return an array", raw };
    }

    if (tasks.length === 0) {
      return { success: false, tasks: [], error: "Planner returned empty task list", raw };
    }

    // Validate each task has required fields
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      if (!t.title || typeof t.title !== "string") {
        return { success: false, tasks: [], error: `Task ${i} missing 'title'`, raw };
      }
      if (t.mode && !["code", "architect", "ask"].includes(t.mode)) {
        t.mode = "code"; // default invalid modes
      }
      if (!t.mode) { t.mode = "code"; }
      if (!t.description) { t.description = ""; }
      if (!t.depends_on) { t.depends_on = []; }
      if (t.priority === undefined) { t.priority = 0; }
    }

    // Validate the DAG
    const dagResult = validateDAG(tasks);
    if (!dagResult.valid) {
      return { success: false, tasks, error: `DAG validation failed: ${dagResult.error}`, raw };
    }

    return { success: true, tasks, error: null, raw };
  } catch (err) {
    if (err instanceof SyntaxError) {
      return { success: false, tasks: [], error: `Planner returned invalid JSON: ${err.message}`, raw: null };
    }
    return { success: false, tasks: [], error: `Planner failed: ${err.message}`, raw: null };
  }
}

/**
 * Format a plan as a readable string for the orchestrator to review.
 */
export function formatPlan(plan) {
  if (!plan.success || !plan.tasks || plan.tasks.length === 0) {
    return `❌ ${plan.error || "Failed to generate plan"}`;
  }

  let output = `📋 Plan: ${plan.tasks.length} task(s)\n\n`;

  for (let i = 0; i < plan.tasks.length; i++) {
    const t = plan.tasks[i];
    const modeTag = t.mode !== "code" ? ` [${t.mode}]` : "";
    const deps = t.depends_on?.length ? `\n     ⬅ after: ${t.depends_on.join(", ")}` : "";
    output += `  ${i + 1}. ${t.title}${modeTag}\n`;
    if (t.description) {output += `     ${t.description}\n`;}
    if (deps) {output += deps + "\n";}
    output += "\n";
  }

  return output.trim();
}

export default { planRequest, formatPlan };
