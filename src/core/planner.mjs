/**
 * Task Planner
 *
 * Breaks down complex goals into a DAG of subtasks.
 * Each subtask can be delegated to an agent or executed directly.
 */
export class Planner {
  /**
   * Create a plan from a goal description.
   *
   * @param {string} goal - What the user wants to accomplish
   * @param {object} context - Current project context
   * @returns {object} Plan with tasks array
   */
  async createPlan(goal, context = {}) {
    // TODO: Use LLM to decompose goal into tasks
    return {
      goal,
      tasks: [
        {
          id: 1,
          title: `Execute: ${goal.slice(0, 60)}`,
          description: goal,
          status: "pending",
          dependencies: [],
        },
      ],
    };
  }

  /**
   * Validate a plan before execution.
   */
  validatePlan(plan) {
    const tasks = plan.tasks;
    if (!tasks || tasks.length === 0) return { valid: false, error: "No tasks in plan." };

    const ids = new Set(tasks.map(t => t.id));
    for (const task of tasks) {
      if (task.dependencies && task.dependencies.length > 0) {
        for (const depId of task.dependencies) {
          if (!ids.has(depId)) return { valid: false, error: `Task ${task.id} depends on missing task ${depId}.` };
        }
      }
    }

    // Check for cycles (simplified: just detect direct self-dependency)
    for (const task of tasks) {
      if (task.dependencies && task.dependencies.includes(task.id))
        return { valid: false, error: `Task ${task.id} depends on itself.` };
    }

    return { valid: true };
  }
}

export const planner = new Planner();
